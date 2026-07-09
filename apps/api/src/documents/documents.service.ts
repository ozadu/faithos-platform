import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  DocumentRouteAction,
  DocumentStatus,
  DocumentTimelineAction,
  Prisma,
} from '@faithos/database';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { PrismaService } from '../database/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentSearchDto } from './dto/document-search.dto';
import {
  DocumentActionNoteDto,
  RouteDocumentDto,
} from './dto/route-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const documentInclude = {
  attachments: {
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      fileName: true,
      id: true,
      mimeType: true,
      sizeBytes: true,
      uploadedBy: true,
    },
  },
  currentDepartment: { select: { id: true, name: true } },
  owner: { select: { email: true, firstName: true, id: true, lastName: true } },
  routes: {
    include: {
      fromDepartment: { select: { id: true, name: true } },
      routedByUser: {
        select: { email: true, firstName: true, id: true, lastName: true },
      },
      toDepartment: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  },
  senderDepartment: { select: { id: true, name: true } },
  timeline: {
    include: {
      actor: {
        select: { email: true, firstName: true, id: true, lastName: true },
      },
      fromDepartment: { select: { id: true, name: true } },
      toDepartment: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.DocumentInclude;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly workflows?: WorkflowsService,
  ) {}

  async list(principal: AuthenticatedUser, query: DocumentSearchDto) {
    return this.prisma.document.findMany({
      include: documentInclude,
      orderBy: { updatedAt: 'desc' },
      where: this.searchWhere(principal.organizationId, query),
    });
  }

  async get(principal: AuthenticatedUser, id: string) {
    return this.findDocument(principal.organizationId, id);
  }

  async drafts(principal: AuthenticatedUser) {
    return this.prisma.document.findMany({
      include: documentInclude,
      orderBy: { updatedAt: 'desc' },
      where: {
        organizationId: principal.organizationId,
        ownerUserId: principal.id,
        status: DocumentStatus.DRAFT,
      },
    });
  }

  async sent(principal: AuthenticatedUser) {
    return this.prisma.document.findMany({
      include: documentInclude,
      orderBy: { updatedAt: 'desc' },
      where: {
        organizationId: principal.organizationId,
        ownerUserId: principal.id,
        status: { not: DocumentStatus.DRAFT },
      },
    });
  }

  async archive(principal: AuthenticatedUser) {
    return this.prisma.document.findMany({
      include: documentInclude,
      orderBy: { updatedAt: 'desc' },
      where: {
        organizationId: principal.organizationId,
        status: DocumentStatus.ARCHIVED,
      },
    });
  }

  async inbox(principal: AuthenticatedUser) {
    const profile = await this.getPrincipalProfile(principal);

    return this.prisma.document
      .findMany({
        include: {
          currentDepartment: { select: { id: true, name: true } },
          routes: {
            orderBy: { createdAt: 'desc' },
            select: {
              createdAt: true,
              fromDepartment: { select: { id: true, name: true } },
              id: true,
              isRead: true,
              receivedAt: true,
              toDepartmentId: true,
            },
            take: 1,
            where: { toDepartmentId: profile.departmentId },
          },
          senderDepartment: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        where: {
          currentDepartmentId: profile.departmentId,
          organizationId: principal.organizationId,
          status: {
            notIn: [DocumentStatus.DRAFT, DocumentStatus.ARCHIVED],
          },
        },
      })
      .then((documents) =>
        documents.map((document) => {
          const route = document.routes[0];
          return {
            currentDepartment: document.currentDepartment,
            fromDepartment: route?.fromDepartment ?? document.senderDepartment,
            id: document.id,
            priority: document.priority,
            receivedDate:
              route?.receivedAt ?? route?.createdAt ?? document.updatedAt,
            referenceNumber: document.referenceNumber,
            status: document.status,
            title: document.title,
            unread: route ? !route.isRead : false,
          };
        }),
      );
  }

  async create(
    principal: AuthenticatedUser,
    input: CreateDocumentDto,
    metadata: RequestMetadata,
  ) {
    const profile = await this.getPrincipalProfile(principal);
    const referenceNumber = await this.generateReferenceNumber();

    const document = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          body: input.body,
          category: input.category,
          currentDepartmentId: profile.departmentId,
          ownerUserId: principal.id,
          organizationId: principal.organizationId,
          referenceNumber,
          senderDepartmentId: profile.departmentId,
          subject: input.subject,
          title: input.title,
          createdBy: principal.id,
          updatedBy: principal.id,
          ...(input.confidentiality
            ? { confidentiality: input.confidentiality }
            : {}),
          ...(input.priority ? { priority: input.priority } : {}),
        },
        include: documentInclude,
      });

      await this.createTimeline(tx, {
        action: DocumentTimelineAction.CREATED,
        documentId: created.id,
        organizationId: principal.organizationId,
        actorUserId: principal.id,
        toDepartmentId: profile.departmentId,
      });

      return created;
    });

    await this.audit.record({
      action: 'document.created',
      entityId: document.id,
      entityType: 'Document',
      newValues: { referenceNumber: document.referenceNumber },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    return document;
  }

  async update(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateDocumentDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.findDocument(principal.organizationId, id);
    this.assertOwner(principal, existing.ownerUserId);
    if (existing.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only drafts can be edited');
    }

    const document = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        data: { ...input, updatedBy: principal.id },
        include: documentInclude,
        where: { id },
      });

      await this.createTimeline(tx, {
        action: DocumentTimelineAction.EDITED,
        documentId: id,
        organizationId: principal.organizationId,
        actorUserId: principal.id,
        fromDepartmentId: updated.senderDepartmentId,
        toDepartmentId: updated.currentDepartmentId,
      });

      return updated;
    });

    await this.audit.record({
      action: 'document.edited',
      entityId: id,
      entityType: 'Document',
      newValues: { title: document.title },
      oldValues: { title: existing.title },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    return document;
  }

  async remove(
    principal: AuthenticatedUser,
    id: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const existing = await this.findDocument(principal.organizationId, id);
    this.assertOwner(principal, existing.ownerUserId);

    if (existing.status === DocumentStatus.DRAFT) {
      await this.prisma.document.delete({ where: { id } });
      await this.audit.record({
        action: 'document.deleted',
        entityId: id,
        entityType: 'Document',
        oldValues: { referenceNumber: existing.referenceNumber },
        organizationId: principal.organizationId,
        userId: principal.id,
        ...metadata,
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        data: { status: DocumentStatus.ARCHIVED, updatedBy: principal.id },
        where: { id },
      });
      await this.createTimeline(tx, {
        action: DocumentTimelineAction.ARCHIVED,
        documentId: id,
        organizationId: principal.organizationId,
        actorUserId: principal.id,
        fromDepartmentId: existing.currentDepartmentId,
      });
    });
  }

  async submit(
    principal: AuthenticatedUser,
    id: string,
    input: DocumentActionNoteDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.findDocument(principal.organizationId, id);
    this.assertOwner(principal, existing.ownerUserId);
    if (existing.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only drafts can be submitted');
    }

    const document = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        data: { status: DocumentStatus.SUBMITTED, updatedBy: principal.id },
        include: documentInclude,
        where: { id },
      });

      await tx.documentRoute.create({
        data: {
          action: DocumentRouteAction.SUBMITTED,
          documentId: id,
          fromDepartmentId: existing.senderDepartmentId,
          isRead: true,
          organizationId: principal.organizationId,
          receivedAt: new Date(),
          routedBy: principal.id,
          toDepartmentId: existing.currentDepartmentId,
          ...(input.note ? { note: input.note } : {}),
        },
      });
      await this.createTimeline(tx, {
        action: DocumentTimelineAction.SUBMITTED,
        documentId: id,
        organizationId: principal.organizationId,
        actorUserId: principal.id,
        fromDepartmentId: existing.senderDepartmentId,
        toDepartmentId: existing.currentDepartmentId,
        ...(input.note ? { note: input.note } : {}),
      });

      return updated;
    });

    await this.audit.record({
      action: 'document.submitted',
      entityId: id,
      entityType: 'Document',
      newValues: { status: document.status },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    await this.workflows?.startForDocument(principal, id, {
      ...(input.note ? { comments: input.note } : {}),
    });

    return this.findDocument(principal.organizationId, id);
  }

  async forward(
    principal: AuthenticatedUser,
    id: string,
    input: RouteDocumentDto,
    metadata: RequestMetadata,
  ) {
    const profile = await this.getPrincipalProfile(principal);
    const existing = await this.findDocument(principal.organizationId, id);
    this.assertCurrentDepartment(
      profile.departmentId,
      existing.currentDepartmentId,
    );
    await this.assertDepartment(principal.organizationId, input.departmentId);

    if (
      existing.status === DocumentStatus.DRAFT ||
      existing.status === DocumentStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Document cannot be forwarded in its current status',
      );
    }

    const document = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        data: {
          currentDepartmentId: input.departmentId,
          status: DocumentStatus.FORWARDED,
          updatedBy: principal.id,
        },
        include: documentInclude,
        where: { id },
      });
      await tx.documentRoute.create({
        data: {
          action: DocumentRouteAction.FORWARDED,
          documentId: id,
          fromDepartmentId: profile.departmentId,
          organizationId: principal.organizationId,
          routedBy: principal.id,
          toDepartmentId: input.departmentId,
          ...(input.note ? { note: input.note } : {}),
        },
      });
      await this.createTimeline(tx, {
        action: DocumentTimelineAction.FORWARDED,
        documentId: id,
        organizationId: principal.organizationId,
        actorUserId: principal.id,
        fromDepartmentId: profile.departmentId,
        toDepartmentId: input.departmentId,
        ...(input.note ? { note: input.note } : {}),
      });
      return updated;
    });

    await this.audit.record({
      action: 'document.forwarded',
      entityId: id,
      entityType: 'Document',
      newValues: { currentDepartmentId: input.departmentId },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    return document;
  }

  async return(
    principal: AuthenticatedUser,
    id: string,
    input: DocumentActionNoteDto,
    metadata: RequestMetadata,
  ) {
    const profile = await this.getPrincipalProfile(principal);
    const existing = await this.findDocument(principal.organizationId, id);
    this.assertCurrentDepartment(
      profile.departmentId,
      existing.currentDepartmentId,
    );

    if (
      existing.status === DocumentStatus.DRAFT ||
      existing.status === DocumentStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Document cannot be returned in its current status',
      );
    }

    const document = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        data: {
          currentDepartmentId: existing.senderDepartmentId,
          status: DocumentStatus.RETURNED,
          updatedBy: principal.id,
        },
        include: documentInclude,
        where: { id },
      });
      await tx.documentRoute.create({
        data: {
          action: DocumentRouteAction.RETURNED,
          documentId: id,
          fromDepartmentId: profile.departmentId,
          organizationId: principal.organizationId,
          routedBy: principal.id,
          toDepartmentId: existing.senderDepartmentId,
          ...(input.note ? { note: input.note } : {}),
        },
      });
      await this.createTimeline(tx, {
        action: DocumentTimelineAction.RETURNED,
        documentId: id,
        organizationId: principal.organizationId,
        actorUserId: principal.id,
        fromDepartmentId: profile.departmentId,
        toDepartmentId: existing.senderDepartmentId,
        ...(input.note ? { note: input.note } : {}),
      });
      return updated;
    });

    await this.audit.record({
      action: 'document.returned',
      entityId: id,
      entityType: 'Document',
      newValues: { status: document.status },
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    return document;
  }

  async receive(
    principal: AuthenticatedUser,
    id: string,
    input: DocumentActionNoteDto,
  ) {
    const profile = await this.getPrincipalProfile(principal);
    const existing = await this.findDocument(principal.organizationId, id);
    this.assertCurrentDepartment(
      profile.departmentId,
      existing.currentDepartmentId,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.documentRoute.updateMany({
        data: { isRead: true, receivedAt: new Date() },
        where: {
          documentId: id,
          isRead: false,
          organizationId: principal.organizationId,
          toDepartmentId: profile.departmentId,
        },
      });
      const updated = await tx.document.update({
        data: { status: DocumentStatus.IN_REVIEW, updatedBy: principal.id },
        include: documentInclude,
        where: { id },
      });
      await this.createTimeline(tx, {
        action: DocumentTimelineAction.RECEIVED,
        documentId: id,
        organizationId: principal.organizationId,
        actorUserId: principal.id,
        toDepartmentId: profile.departmentId,
        ...(input.note ? { note: input.note } : {}),
      });
      return updated;
    });
  }

  async generateReferenceNumber(date = new Date()): Promise<string> {
    const year = date.getUTCFullYear();
    const prefix = `DOC-${year}-`;
    const latest = await this.prisma.document.findFirst({
      orderBy: { referenceNumber: 'desc' },
      select: { referenceNumber: true },
      where: { referenceNumber: { startsWith: prefix } },
    });
    const next = latest
      ? Number.parseInt(latest.referenceNumber.slice(prefix.length), 10) + 1
      : 1;

    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  private searchWhere(
    organizationId: string,
    query: DocumentSearchDto,
  ): Prisma.DocumentWhereInput {
    return {
      organizationId,
      ...(query.referenceNumber
        ? {
            referenceNumber: {
              contains: query.referenceNumber,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.title
        ? { title: { contains: query.title, mode: 'insensitive' } }
        : {}),
      ...(query.departmentId
        ? { currentDepartmentId: query.departmentId }
        : {}),
      ...(query.senderDepartmentId
        ? { senderDepartmentId: query.senderDepartmentId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };
  }

  private async findDocument(organizationId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      include: documentInclude,
      where: { id, organizationId },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  private async getPrincipalProfile(principal: AuthenticatedUser) {
    const user = await this.prisma.user.findFirst({
      select: { departmentId: true, id: true },
      where: {
        deletedAt: null,
        id: principal.id,
        organizationId: principal.organizationId,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.departmentId) {
      throw new BadRequestException('User must belong to a department');
    }
    return { departmentId: user.departmentId, id: user.id };
  }

  private async assertDepartment(
    organizationId: string,
    departmentId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findFirst({
      select: { id: true },
      where: { deletedAt: null, id: departmentId, organizationId },
    });
    if (!department) throw new NotFoundException('Department not found');
  }

  private assertOwner(principal: AuthenticatedUser, ownerUserId: string): void {
    if (principal.id !== ownerUserId) {
      throw new ForbiddenException(
        'Only the document owner can perform this action',
      );
    }
  }

  private assertCurrentDepartment(
    userDepartmentId: string,
    currentDepartmentId: string,
  ): void {
    if (userDepartmentId !== currentDepartmentId) {
      throw new ForbiddenException(
        'Document is not assigned to your department',
      );
    }
  }

  private createTimeline(
    tx: Prisma.TransactionClient,
    input: {
      action: DocumentTimelineAction;
      actorUserId: string;
      documentId: string;
      fromDepartmentId?: string | undefined;
      metadata?: Prisma.InputJsonValue | undefined;
      note?: string | undefined;
      organizationId: string;
      toDepartmentId?: string | undefined;
    },
  ) {
    return tx.documentTimelineEvent.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId,
        documentId: input.documentId,
        organizationId: input.organizationId,
        ...(input.fromDepartmentId
          ? { fromDepartmentId: input.fromDepartmentId }
          : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        ...(input.note ? { note: input.note } : {}),
        ...(input.toDepartmentId
          ? { toDepartmentId: input.toDepartmentId }
          : {}),
      },
    });
  }
}
