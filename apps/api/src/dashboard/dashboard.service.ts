import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentStatus,
  Prisma,
  WorkflowInstanceStatus,
  WorkflowTaskStatus,
} from '@faithos/database';

import { AuthenticatedUser } from '../common/authenticated-user';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const activeTaskStatuses = [
  WorkflowTaskStatus.PENDING,
  WorkflowTaskStatus.RECEIVED,
  WorkflowTaskStatus.OVERDUE,
] satisfies WorkflowTaskStatus[];

const taskInclude = {
  assignedDepartment: { select: { id: true, name: true } },
  assignedUser: {
    select: { email: true, firstName: true, id: true, lastName: true },
  },
  document: { select: { id: true, referenceNumber: true, title: true } },
  workflowInstance: {
    include: { workflow: { select: { id: true, name: true } } },
  },
} satisfies Prisma.WorkflowTaskInclude;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async summary(principal: AuthenticatedUser) {
    const profile = await this.profile(principal);
    const now = new Date();
    const [pendingTasks, unreadNotifications, inboxDocuments, drafts, overdue] =
      await Promise.all([
        this.prisma.workflowTask.count({
          where: this.myTaskWhere(principal, profile.departmentId),
        }),
        this.notifications.unreadCount(principal),
        this.prisma.document.count({
          where: {
            currentDepartmentId: profile.departmentId,
            organizationId: principal.organizationId,
            status: {
              notIn: [DocumentStatus.DRAFT, DocumentStatus.ARCHIVED],
            },
          },
        }),
        this.prisma.document.count({
          where: {
            organizationId: principal.organizationId,
            ownerUserId: principal.id,
            status: DocumentStatus.DRAFT,
          },
        }),
        this.prisma.workflowTask.count({
          where: {
            dueAt: { lt: now },
            organizationId: principal.organizationId,
            status: { in: activeTaskStatuses },
          },
        }),
      ]);

    const [recentDocuments, recentWorkflows, activity] = await Promise.all([
      this.prisma.document.findMany({
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          priority: true,
          referenceNumber: true,
          status: true,
          title: true,
          updatedAt: true,
        },
        take: 6,
        where: {
          organizationId: principal.organizationId,
          status: { not: DocumentStatus.DRAFT },
        },
      }),
      this.prisma.workflowInstance.findMany({
        include: {
          document: {
            select: { id: true, referenceNumber: true, title: true },
          },
          workflow: { select: { id: true, name: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 6,
        where: {
          organizationId: principal.organizationId,
          status: WorkflowInstanceStatus.COMPLETED,
        },
      }),
      this.activity(principal),
    ]);

    return {
      activity,
      counts: {
        draftDocuments: drafts,
        inboxDocuments,
        myPendingTasks: pendingTasks,
        overdueWorkflows: overdue,
        unreadNotifications: unreadNotifications.count,
      },
      quickActions: [
        { href: '/documents/create', label: 'Create Document' },
        { href: '/notifications', label: 'Open Notifications' },
        { href: '/my-work', label: 'Review My Work' },
        { href: '/workflow-sla', label: 'Evaluate SLA' },
        { href: '/reports', label: 'Open Reports' },
        { href: '/reports/overdue', label: 'Review Overdue Report' },
      ],
      recentDocuments,
      recentWorkflows,
    };
  }

  async executive(principal: AuthenticatedUser) {
    const weekStart = this.weekStart();
    const completed = await this.prisma.workflowInstance.findMany({
      select: { completedAt: true, createdAt: true },
      where: {
        completedAt: { not: null },
        organizationId: principal.organizationId,
        status: WorkflowInstanceStatus.COMPLETED,
      },
    });
    const averageCompletionHours =
      completed.length === 0
        ? 0
        : Math.round(
            completed.reduce((total, item) => {
              const completedAt = item.completedAt ?? item.createdAt;
              return total + (completedAt.getTime() - item.createdAt.getTime());
            }, 0) /
              completed.length /
              36_000,
          ) / 100;

    const [
      totalDocuments,
      submittedThisWeek,
      completedThisWeek,
      pendingApprovals,
      overdueWorkflows,
      departments,
      highPriorityDocuments,
    ] = await Promise.all([
      this.prisma.document.count({
        where: { organizationId: principal.organizationId },
      }),
      this.prisma.document.count({
        where: {
          createdAt: { gte: weekStart },
          organizationId: principal.organizationId,
          status: { not: DocumentStatus.DRAFT },
        },
      }),
      this.prisma.workflowInstance.count({
        where: {
          completedAt: { gte: weekStart },
          organizationId: principal.organizationId,
          status: WorkflowInstanceStatus.COMPLETED,
        },
      }),
      this.prisma.workflowTask.count({
        where: {
          organizationId: principal.organizationId,
          status: { in: activeTaskStatuses },
          step: { approvalRequired: true },
        },
      }),
      this.prisma.workflowTask.count({
        where: {
          dueAt: { lt: new Date() },
          organizationId: principal.organizationId,
          status: { in: activeTaskStatuses },
        },
      }),
      this.prisma.department.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
        where: {
          deletedAt: null,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.document.findMany({
        orderBy: { updatedAt: 'desc' },
        select: {
          currentDepartment: { select: { id: true, name: true } },
          id: true,
          priority: true,
          referenceNumber: true,
          status: true,
          title: true,
          updatedAt: true,
        },
        take: 8,
        where: {
          organizationId: principal.organizationId,
          priority: { in: ['HIGH', 'URGENT'] },
        },
      }),
    ]);

    const departmentActivity = await Promise.all(
      departments.map(async (department) => ({
        department,
        documents: await this.prisma.document.count({
          where: {
            currentDepartmentId: department.id,
            organizationId: principal.organizationId,
          },
        }),
        pendingTasks: await this.prisma.workflowTask.count({
          where: {
            assignedDepartmentId: department.id,
            organizationId: principal.organizationId,
            status: { in: activeTaskStatuses },
          },
        }),
      })),
    );

    return {
      averageCompletionHours,
      departmentActivity,
      highPriorityDocuments,
      metrics: {
        completedThisWeek,
        overdueWorkflows,
        pendingApprovals,
        submittedThisWeek,
        totalDocuments,
      },
    };
  }

  async department(principal: AuthenticatedUser) {
    const profile = await this.profile(principal);
    const [department, inboxCount, pendingTasks, completedDocs, overdueItems] =
      await Promise.all([
        this.prisma.department.findFirst({
          select: { id: true, name: true },
          where: {
            id: profile.departmentId,
            organizationId: principal.organizationId,
          },
        }),
        this.prisma.document.count({
          where: {
            currentDepartmentId: profile.departmentId,
            organizationId: principal.organizationId,
            status: {
              notIn: [DocumentStatus.DRAFT, DocumentStatus.ARCHIVED],
            },
          },
        }),
        this.prisma.workflowTask.count({
          where: {
            assignedDepartmentId: profile.departmentId,
            organizationId: principal.organizationId,
            status: { in: activeTaskStatuses },
          },
        }),
        this.prisma.document.count({
          where: {
            currentDepartmentId: profile.departmentId,
            organizationId: principal.organizationId,
            status: { in: [DocumentStatus.APPROVED, DocumentStatus.ARCHIVED] },
          },
        }),
        this.prisma.workflowTask.count({
          where: {
            assignedDepartmentId: profile.departmentId,
            dueAt: { lt: new Date() },
            organizationId: principal.organizationId,
            status: { in: activeTaskStatuses },
          },
        }),
      ]);

    if (!department) throw new NotFoundException('Department not found');

    const activity = await this.activity(principal, profile.departmentId);
    return {
      activity,
      department,
      metrics: {
        completedDocuments: completedDocs,
        departmentInboxCount: inboxCount,
        departmentPendingTasks: pendingTasks,
        overdueItems,
      },
    };
  }

  async myWork(principal: AuthenticatedUser) {
    const profile = await this.profile(principal);
    const [assignedTasks, pendingApprovals, returnedDocuments, overdueItems] =
      await Promise.all([
        this.prisma.workflowTask.findMany({
          include: taskInclude,
          orderBy: { dueAt: 'asc' },
          where: this.myTaskWhere(principal, profile.departmentId),
        }),
        this.prisma.workflowTask.findMany({
          include: taskInclude,
          orderBy: { dueAt: 'asc' },
          where: {
            ...this.myTaskWhere(principal, profile.departmentId),
            step: { approvalRequired: true },
          },
        }),
        this.prisma.document.findMany({
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            title: true,
            updatedAt: true,
          },
          where: {
            organizationId: principal.organizationId,
            ownerUserId: principal.id,
            status: DocumentStatus.RETURNED,
          },
        }),
        this.prisma.workflowTask.findMany({
          include: taskInclude,
          orderBy: { dueAt: 'asc' },
          where: {
            ...this.myTaskWhere(principal, profile.departmentId),
            dueAt: { lt: new Date() },
          },
        }),
      ]);

    const recentlyCompletedTasks = await this.prisma.workflowTask.findMany({
      include: taskInclude,
      orderBy: { completedAt: 'desc' },
      take: 8,
      where: {
        organizationId: principal.organizationId,
        status: {
          in: [
            WorkflowTaskStatus.APPROVED,
            WorkflowTaskStatus.COMPLETED,
            WorkflowTaskStatus.FORWARDED,
            WorkflowTaskStatus.REJECTED,
            WorkflowTaskStatus.RETURNED,
          ],
        },
        OR: [
          { assignedUserId: principal.id },
          { assignedDepartmentId: profile.departmentId },
        ],
      },
    });

    return {
      assignedTasks,
      navigation: [
        { href: '/pending-approvals', label: 'Pending Approvals' },
        { href: '/notifications', label: 'Notifications' },
        { href: '/inbox', label: 'Department Inbox' },
      ],
      overdueItems,
      pendingApprovals,
      recentlyCompletedTasks,
      returnedDocuments,
    };
  }

  private activity(principal: AuthenticatedUser, departmentId?: string) {
    return this.prisma.workflowHistoryEvent.findMany({
      include: {
        actor: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
        actorDepartment: { select: { id: true, name: true } },
        document: { select: { id: true, referenceNumber: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      where: {
        organizationId: principal.organizationId,
        ...(departmentId ? { actorDepartmentId: departmentId } : {}),
      },
    });
  }

  private myTaskWhere(
    principal: AuthenticatedUser,
    departmentId: string,
  ): Prisma.WorkflowTaskWhereInput {
    return {
      organizationId: principal.organizationId,
      status: { in: activeTaskStatuses },
      OR: [
        { assignedUserId: principal.id },
        { assignedUserId: null, assignedDepartmentId: departmentId },
      ],
    };
  }

  private async profile(principal: AuthenticatedUser) {
    const profile = await this.prisma.user.findFirst({
      select: { departmentId: true, id: true },
      where: {
        id: principal.id,
        organizationId: principal.organizationId,
      },
    });
    if (!profile?.departmentId) {
      throw new NotFoundException('Current user department not found');
    }
    return { departmentId: profile.departmentId, id: profile.id };
  }

  private weekStart() {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
