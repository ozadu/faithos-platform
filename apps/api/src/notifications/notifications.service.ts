import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkflowNotificationType } from '@faithos/database';

import { AuthenticatedUser } from '../common/authenticated-user';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

const notificationInclude = {
  department: { select: { id: true, name: true } },
  document: { select: { id: true, referenceNumber: true, title: true } },
  user: { select: { email: true, firstName: true, id: true, lastName: true } },
  workflowInstance: { select: { id: true, status: true } },
} satisfies Prisma.WorkflowNotificationInclude;

const documentNotificationTypes = [
  WorkflowNotificationType.DOCUMENT_SUBMITTED,
  WorkflowNotificationType.DOCUMENT_FORWARDED,
  WorkflowNotificationType.DOCUMENT_RETURNED,
  WorkflowNotificationType.DOCUMENT_ARCHIVED,
] satisfies WorkflowNotificationType[];

const workflowNotificationTypes = [
  WorkflowNotificationType.APPROVAL_REQUIRED,
  WorkflowNotificationType.RETURNED,
  WorkflowNotificationType.REJECTED,
  WorkflowNotificationType.FORWARDED,
  WorkflowNotificationType.COMPLETED,
  WorkflowNotificationType.ESCALATED,
  WorkflowNotificationType.REMINDER,
  WorkflowNotificationType.WORKFLOW_ASSIGNED,
  WorkflowNotificationType.WORKFLOW_APPROVED,
  WorkflowNotificationType.WORKFLOW_REJECTED,
  WorkflowNotificationType.WORKFLOW_RETURNED,
  WorkflowNotificationType.WORKFLOW_COMPLETED,
  WorkflowNotificationType.WORKFLOW_OVERDUE,
  WorkflowNotificationType.DELEGATION_ASSIGNED,
] satisfies WorkflowNotificationType[];

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async list(principal: AuthenticatedUser, query: NotificationQueryDto = {}) {
    const where = await this.visibleWhere(principal, query);
    return this.prisma.workflowNotification.findMany({
      include: notificationInclude,
      orderBy: { createdAt: 'desc' },
      where,
    });
  }

  async unreadCount(principal: AuthenticatedUser) {
    const where = await this.visibleWhere(principal, { unread: 'true' });
    return { count: await this.prisma.workflowNotification.count({ where }) };
  }

  async markRead(principal: AuthenticatedUser, id: string) {
    await this.ensureVisible(principal, id);
    return this.prisma.workflowNotification.update({
      include: notificationInclude,
      data: { readAt: new Date() },
      where: { id },
    });
  }

  async markAllRead(principal: AuthenticatedUser) {
    const where = await this.visibleWhere(principal, { unread: 'true' });
    const result = await this.prisma.workflowNotification.updateMany({
      data: { readAt: new Date() },
      where,
    });
    return { count: result.count };
  }

  async remove(principal: AuthenticatedUser, id: string) {
    await this.ensureVisible(principal, id);
    await this.prisma.workflowNotification.delete({ where: { id } });
    return { id };
  }

  async create(input: {
    departmentId?: string | null | undefined;
    documentId?: string | undefined;
    message?: string | undefined;
    organizationId: string;
    sendEmail?: boolean | undefined;
    title: string;
    type: WorkflowNotificationType;
    userId?: string | null | undefined;
    workflowInstanceId?: string | undefined;
  }) {
    const notification = await this.prisma.workflowNotification.create({
      include: notificationInclude,
      data: {
        message: input.message ?? input.title,
        organizationId: input.organizationId,
        title: input.title,
        type: input.type,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        ...(input.documentId ? { documentId: input.documentId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.workflowInstanceId
          ? { workflowInstanceId: input.workflowInstanceId }
          : {}),
      },
    });

    if (input.sendEmail) {
      await this.emailNotification(notification);
    }

    return notification;
  }

  async emailNotification(
    notification: Prisma.WorkflowNotificationGetPayload<{
      include: typeof notificationInclude;
    }>,
  ) {
    const recipients = await this.notificationRecipients(notification);
    if (recipients.length === 0) return { skipped: true };
    return this.email.sendNotification({
      documentReference: notification.document?.referenceNumber,
      message: notification.message,
      title: notification.title,
      to: recipients,
      type: notification.type,
    });
  }

  async visibleWhere(
    principal: AuthenticatedUser,
    query: NotificationQueryDto = {},
  ): Promise<Prisma.WorkflowNotificationWhereInput> {
    const profile = await this.profile(principal);
    const typeFilter: Prisma.EnumWorkflowNotificationTypeFilter | undefined =
      query.type
        ? { equals: query.type }
        : query.module === 'documents'
          ? { in: documentNotificationTypes }
          : query.module === 'workflows'
            ? { in: workflowNotificationTypes }
            : undefined;

    return {
      organizationId: principal.organizationId,
      ...(query.unread === 'true' ? { readAt: null } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      OR: [
        { userId: principal.id },
        ...(profile.departmentId
          ? [{ departmentId: profile.departmentId }]
          : []),
        { AND: [{ userId: null }, { departmentId: null }] },
      ],
    };
  }

  private async ensureVisible(principal: AuthenticatedUser, id: string) {
    const where = await this.visibleWhere(principal);
    const notification = await this.prisma.workflowNotification.findFirst({
      select: { id: true },
      where: { ...where, id },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  private async profile(principal: AuthenticatedUser) {
    return this.prisma.user.findFirstOrThrow({
      select: { departmentId: true, id: true },
      where: {
        id: principal.id,
        organizationId: principal.organizationId,
      },
    });
  }

  private async notificationRecipients(
    notification: Prisma.WorkflowNotificationGetPayload<{
      include: typeof notificationInclude;
    }>,
  ): Promise<string[]> {
    if (notification.user?.email) return [notification.user.email];
    if (!notification.departmentId) return [];

    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { email: true },
      take: 5,
      where: {
        departmentId: notification.departmentId,
        organizationId: notification.organizationId,
        status: 'ACTIVE',
      },
    });

    return users.map((user) => user.email);
  }
}
