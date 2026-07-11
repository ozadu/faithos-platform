import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  DocumentConfidentiality,
  DocumentPriority,
  Prisma,
  UserStatus,
} from '@faithos/database';
import { hash } from 'argon2';
import { randomBytes } from 'node:crypto';
import { connect } from 'node:net';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateAdminDepartmentDto,
  UpdateAdminDepartmentDto,
} from './dto/admin-department.dto';
import {
  AssignDocumentTypeWorkflowDto,
  CreateAdminDocumentTypeDto,
  UpdateAdminDocumentTypeDto,
} from './dto/admin-document-type.dto';
import { UpdateAdminOrganizationDto } from './dto/admin-organization.dto';
import {
  AdminActiveQueryDto,
  AdminAuditQueryDto,
  AdminUserQueryDto,
} from './dto/admin-query.dto';
import {
  CreateAdminRoleDto,
  UpdateAdminRoleDto,
  UpdateAdminRolePermissionsDto,
} from './dto/admin-role.dto';
import { UpdateSystemSettingsDto } from './dto/admin-system-settings.dto';
import {
  AssignAdminUserDepartmentDto,
  AssignAdminUserRoleDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from './dto/admin-user.dto';
import {
  AdminUserImportDto,
  AdminUserImportPreviewDto,
} from './dto/admin-user-import.dto';
import {
  CreatePilotFeedbackDto,
  CreatePilotIssueDto,
  PilotFeedbackQueryDto,
  PilotIssueQueryDto,
  UpdatePilotFeedbackDto,
  UpdatePilotIssueDto,
} from './dto/pilot-trial.dto';

const userSelect = {
  createdAt: true,
  deletedAt: true,
  department: { select: { id: true, name: true } },
  departmentId: true,
  email: true,
  firstName: true,
  id: true,
  jobTitle: true,
  lastLoginAt: true,
  lastName: true,
  organizationId: true,
  phone: true,
  role: { select: { active: true, id: true, isSystem: true, name: true } },
  roleId: true,
  status: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const defaultSettings = {
  allowedAttachmentTypes: ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'png'],
  brandingName: 'FaithOS',
  brandingSubtitle: 'Document routing and workflow platform',
  defaultSlaDays: 3,
  emailNotificationsEnabled: true,
  maintenanceMode: false,
  maxAttachmentSizeBytes: 10 * 1024 * 1024,
  referenceNumberFormat: 'DOC-YYYY-000001',
} satisfies Record<string, Prisma.InputJsonValue>;

type ParsedUserImportRow = {
  active: boolean;
  departmentCode: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  rowNumber: number;
};

const adminOnboardingItems = [
  ['login', 'Login', '/login', 'Admin'],
  [
    'organization',
    'Update organization profile',
    '/admin/organization',
    'Admin',
  ],
  ['departments', 'Create departments', '/admin/departments', 'Admin'],
  ['users', 'Create users', '/admin/users', 'Admin'],
  ['roles', 'Assign roles', '/admin/roles', 'Admin'],
  [
    'document-types',
    'Configure document types',
    '/admin/document-types',
    'Admin',
  ],
  [
    'workflow-assignments',
    'Assign workflows',
    '/admin/workflow-assignments',
    'Admin',
  ],
  ['notifications', 'Review notifications', '/notifications', 'Admin'],
  ['reports', 'Review reports', '/reports', 'Admin'],
  ['pilot-readiness', 'Run pilot readiness', '/admin/pilot-readiness', 'Admin'],
  [
    'production-readiness',
    'Review production readiness',
    '/admin/production-readiness',
    'Admin',
  ],
  ['backup-plan', 'Backup plan reviewed', '/admin/backup-runbook', 'Admin'],
  ['staff-training', 'Staff training completed', '/help', 'Admin'],
  [
    'feedback-process',
    'Feedback process explained',
    '/admin/feedback',
    'Admin',
  ],
] as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly email?: EmailService,
  ) {}

  async summary(principal: AuthenticatedUser) {
    const organizationId = principal.organizationId;
    const [
      totalUsers,
      activeUsers,
      departments,
      roles,
      documentTypes,
      workflowAssignments,
      pilotReadiness,
      recentActivity,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null, organizationId } }),
      this.prisma.user.count({
        where: { deletedAt: null, organizationId, status: UserStatus.ACTIVE },
      }),
      this.prisma.department.count({
        where: { deletedAt: null, organizationId },
      }),
      this.prisma.role.count({
        where: {
          OR: [{ organizationId }, { isSystem: true, organizationId: null }],
        },
      }),
      this.prisma.documentType.count({ where: { organizationId } }),
      this.prisma.workflowAssignment.count({ where: { organizationId } }),
      this.pilotReadiness(principal),
      this.auditLog(principal, {}),
    ]);

    return {
      counts: {
        activeUsers,
        departments,
        documentTypes,
        incompletePilotChecklistItems: pilotReadiness.items.filter(
          (item) => !item.complete,
        ).length,
        roles,
        totalUsers,
        workflowAssignments,
      },
      recentActivity: recentActivity.slice(0, 8),
    };
  }

  organization(principal: AuthenticatedUser) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: principal.organizationId },
    });
  }

  async updateOrganization(
    principal: AuthenticatedUser,
    input: UpdateAdminOrganizationDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.organization(principal);
    const organization = await this.prisma.organization.update({
      data: input,
      where: { id: principal.organizationId },
    });
    await this.record(principal, metadata, {
      action: 'admin.organization.updated',
      entityId: organization.id,
      entityType: 'Organization',
      newValues: input as unknown as Prisma.InputJsonObject,
      oldValues: {
        email: existing.email,
        name: existing.name,
        status: existing.status,
      },
    });
    return organization;
  }

  departments(principal: AuthenticatedUser, query: AdminActiveQueryDto) {
    return this.prisma.department.findMany({
      include: {
        _count: {
          select: {
            assignedWorkflowTasks: {
              where: { status: { in: ['PENDING', 'RECEIVED', 'OVERDUE'] } },
            },
            currentDocuments: {
              where: {
                status: { in: ['SUBMITTED', 'IN_REVIEW', 'FORWARDED'] },
              },
            },
            members: { where: { deletedAt: null } },
          },
        },
        departmentHead: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
        parentDepartment: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
      where: {
        deletedAt: null,
        organizationId: principal.organizationId,
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  async createDepartment(
    principal: AuthenticatedUser,
    input: CreateAdminDepartmentDto,
    metadata: RequestMetadata,
  ) {
    await this.assertDepartmentRelations(principal.organizationId, input);
    const department = await this.prisma.department.create({
      data: {
        active: input.active ?? true,
        name: input.name,
        organizationId: principal.organizationId,
        ...(input.code ? { code: input.code.toUpperCase() } : {}),
        ...(input.departmentHeadId
          ? { departmentHeadId: input.departmentHeadId }
          : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.parentDepartmentId
          ? { parentDepartmentId: input.parentDepartmentId }
          : {}),
      },
    });
    await this.record(principal, metadata, {
      action: 'admin.department.created',
      entityId: department.id,
      entityType: 'Department',
      newValues: { code: department.code, name: department.name },
    });
    return department;
  }

  async updateDepartment(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateAdminDepartmentDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.ensureDepartment(principal.organizationId, id);
    await this.assertDepartmentRelations(principal.organizationId, input, id);
    const department = await this.prisma.department.update({
      data: {
        ...(input.active === undefined ? {} : { active: input.active }),
        ...(input.code === undefined
          ? {}
          : { code: input.code ? input.code.toUpperCase() : null }),
        ...(input.departmentHeadId === undefined
          ? {}
          : { departmentHeadId: input.departmentHeadId }),
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.parentDepartmentId === undefined
          ? {}
          : { parentDepartmentId: input.parentDepartmentId }),
      },
      where: { id },
    });
    await this.record(principal, metadata, {
      action: 'admin.department.updated',
      entityId: id,
      entityType: 'Department',
      newValues: input as unknown as Prisma.InputJsonObject,
      oldValues: {
        active: existing.active,
        code: existing.code,
        name: existing.name,
      },
    });
    return department;
  }

  async deactivateDepartment(
    principal: AuthenticatedUser,
    id: string,
    metadata: RequestMetadata,
  ) {
    await this.ensureDepartment(principal.organizationId, id);
    const department = await this.prisma.department.update({
      data: { active: false },
      where: { id },
    });
    await this.record(principal, metadata, {
      action: 'admin.department.deactivated',
      entityId: id,
      entityType: 'Department',
      newValues: { active: false },
    });
    return department;
  }

  users(principal: AuthenticatedUser, query: AdminUserQueryDto) {
    return this.prisma.user.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: userSelect,
      where: {
        deletedAt: null,
        organizationId: principal.organizationId,
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.roleId ? { roleId: query.roleId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { email: { contains: query.search, mode: 'insensitive' } },
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
  }

  async createUser(
    principal: AuthenticatedUser,
    input: CreateAdminUserDto,
    metadata: RequestMetadata,
  ) {
    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email is already in use');
    }
    await this.assertUserRelations(principal.organizationId, input);
    const temporaryPassword =
      input.temporaryPassword ?? randomBytes(18).toString('base64url');
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        organizationId: principal.organizationId,
        passwordHash: await hash(temporaryPassword),
        status: input.status ?? UserStatus.ACTIVE,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.roleId ? { roleId: input.roleId } : {}),
      },
      select: userSelect,
    });
    await this.record(principal, metadata, {
      action: 'admin.user.created',
      entityId: user.id,
      entityType: 'User',
      newValues: { email: user.email, status: user.status },
    });
    await this.sendTemporaryPasswordEmail(user.email, temporaryPassword);
    return { temporaryPassword, user };
  }

  async updateUser(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateAdminUserDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.ensureUser(principal.organizationId, id);
    if (input.email && input.email.toLowerCase() !== existing.email) {
      if (
        await this.prisma.user.findUnique({ where: { email: input.email } })
      ) {
        throw new ConflictException('Email is already in use');
      }
    }
    await this.assertUserRelations(principal.organizationId, input);
    const user = await this.prisma.user.update({
      data: {
        ...(input.departmentId === undefined
          ? {}
          : { departmentId: input.departmentId }),
        ...(input.email ? { email: input.email.toLowerCase() } : {}),
        ...(input.firstName === undefined
          ? {}
          : { firstName: input.firstName }),
        ...(input.jobTitle === undefined ? {} : { jobTitle: input.jobTitle }),
        ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
        ...(input.phone === undefined ? {} : { phone: input.phone }),
        ...(input.roleId === undefined ? {} : { roleId: input.roleId }),
        ...(input.status === undefined ? {} : { status: input.status }),
      },
      select: userSelect,
      where: { id },
    });
    await this.record(principal, metadata, {
      action: 'admin.user.updated',
      entityId: id,
      entityType: 'User',
      newValues: input as unknown as Prisma.InputJsonObject,
      oldValues: { email: existing.email, status: existing.status },
    });
    return user;
  }

  activateUser(
    principal: AuthenticatedUser,
    id: string,
    metadata: RequestMetadata,
  ) {
    return this.setUserStatus(principal, id, UserStatus.ACTIVE, metadata);
  }

  deactivateUser(
    principal: AuthenticatedUser,
    id: string,
    metadata: RequestMetadata,
  ) {
    return this.setUserStatus(principal, id, UserStatus.DISABLED, metadata);
  }

  async assignUserRole(
    principal: AuthenticatedUser,
    id: string,
    input: AssignAdminUserRoleDto,
    metadata: RequestMetadata,
  ) {
    await this.assertUserRelations(principal.organizationId, {
      roleId: input.roleId,
    });
    return this.updateUser(principal, id, { roleId: input.roleId }, metadata);
  }

  async assignUserDepartment(
    principal: AuthenticatedUser,
    id: string,
    input: AssignAdminUserDepartmentDto,
    metadata: RequestMetadata,
  ) {
    await this.assertUserRelations(principal.organizationId, {
      departmentId: input.departmentId,
    });
    return this.updateUser(
      principal,
      id,
      { departmentId: input.departmentId },
      metadata,
    );
  }

  roles(principal: AuthenticatedUser, query: AdminActiveQueryDto) {
    return this.prisma.role.findMany({
      include: {
        _count: { select: { users: { where: { deletedAt: null } } } },
        rolePermissions: { include: { permission: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      where: {
        OR: [{ organizationId: principal.organizationId }, { isSystem: true }],
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  async createRole(
    principal: AuthenticatedUser,
    input: CreateAdminRoleDto,
    metadata: RequestMetadata,
  ) {
    const role = await this.prisma.role.create({
      data: {
        active: input.active ?? true,
        isSystem: false,
        name: input.name,
        organizationId: principal.organizationId,
        ...(input.description ? { description: input.description } : {}),
      },
    });
    await this.record(principal, metadata, {
      action: 'admin.role.created',
      entityId: role.id,
      entityType: 'Role',
      newValues: { name: role.name },
    });
    return role;
  }

  async updateRole(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateAdminRoleDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.ensureMutableRole(principal.organizationId, id);
    const role = await this.prisma.role.update({
      data: input,
      where: { id },
    });
    await this.record(principal, metadata, {
      action: 'admin.role.updated',
      entityId: id,
      entityType: 'Role',
      newValues: input as unknown as Prisma.InputJsonObject,
      oldValues: { active: existing.active, name: existing.name },
    });
    return role;
  }

  async updateRolePermissions(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateAdminRolePermissionsDto,
    metadata: RequestMetadata,
  ) {
    const role = await this.ensureMutableRole(principal.organizationId, id);
    const permissionCount = await this.prisma.permission.count({
      where: { id: { in: input.permissionIds } },
    });
    if (permissionCount !== input.permissionIds.length) {
      throw new NotFoundException('One or more permissions were not found');
    }
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: input.permissionIds.map((permissionId) => ({
          permissionId,
          roleId: id,
        })),
      }),
    ]);
    await this.record(principal, metadata, {
      action: 'admin.role.permissions.updated',
      entityId: id,
      entityType: 'Role',
      newValues: { permissionIds: input.permissionIds },
      oldValues: { name: role.name },
    });
    return this.prisma.role.findUniqueOrThrow({
      include: { rolePermissions: { include: { permission: true } } },
      where: { id },
    });
  }

  permissions(principal: AuthenticatedUser) {
    return this.prisma.permission.findMany({
      include: {
        rolePermissions: {
          include: {
            role: {
              select: { active: true, id: true, isSystem: true, name: true },
            },
          },
          where: {
            role: {
              OR: [
                { organizationId: principal.organizationId },
                { isSystem: true, organizationId: null },
              ],
            },
          },
        },
      },
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async permissionMatrix(principal: AuthenticatedUser) {
    const [permissions, roles] = await Promise.all([
      this.permissions(principal),
      this.roles(principal, {}),
    ]);
    return {
      modules: this.groupPermissions(permissions),
      permissions,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissionCodes: role.rolePermissions.map(
          (item) => item.permission.code,
        ),
      })),
    };
  }

  documentTypes(principal: AuthenticatedUser, query: AdminActiveQueryDto) {
    return this.prisma.documentType.findMany({
      orderBy: { name: 'asc' },
      where: {
        organizationId: principal.organizationId,
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  async createDocumentType(
    principal: AuthenticatedUser,
    input: CreateAdminDocumentTypeDto,
    metadata: RequestMetadata,
  ) {
    if (input.workflowId) {
      await this.ensureWorkflow(principal.organizationId, input.workflowId);
    }
    const documentType = await this.prisma.documentType.create({
      data: {
        active: input.active ?? true,
        defaultConfidentiality:
          input.defaultConfidentiality ?? DocumentConfidentiality.INTERNAL,
        defaultPriority: input.defaultPriority ?? DocumentPriority.NORMAL,
        name: input.name,
        organizationId: principal.organizationId,
        referencePrefix: input.referencePrefix ?? 'DOC',
        ...(input.description ? { description: input.description } : {}),
      },
    });
    if (input.workflowId) {
      await this.saveWorkflowAssignment(principal, documentType.name, {
        active: true,
        workflowId: input.workflowId,
      });
    }
    await this.record(principal, metadata, {
      action: 'admin.documentType.created',
      entityId: documentType.id,
      entityType: 'DocumentType',
      newValues: { name: documentType.name },
    });
    return documentType;
  }

  async updateDocumentType(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateAdminDocumentTypeDto,
    metadata: RequestMetadata,
  ) {
    const existing = await this.ensureDocumentType(
      principal.organizationId,
      id,
    );
    const documentType = await this.prisma.documentType.update({
      data: input,
      where: { id },
    });
    if (input.name && input.name !== existing.name) {
      await this.prisma.workflowAssignment.updateMany({
        data: { documentType: input.name },
        where: {
          documentType: existing.name,
          organizationId: principal.organizationId,
        },
      });
    }
    await this.record(principal, metadata, {
      action: 'admin.documentType.updated',
      entityId: id,
      entityType: 'DocumentType',
      newValues: input as unknown as Prisma.InputJsonObject,
      oldValues: { active: existing.active, name: existing.name },
    });
    return documentType;
  }

  async assignDocumentTypeWorkflow(
    principal: AuthenticatedUser,
    id: string,
    input: AssignDocumentTypeWorkflowDto,
    metadata: RequestMetadata,
  ) {
    const documentType = await this.ensureDocumentType(
      principal.organizationId,
      id,
    );
    const assignment = await this.saveWorkflowAssignment(
      principal,
      documentType.name,
      input,
    );
    await this.record(principal, metadata, {
      action: 'admin.documentType.workflow.updated',
      entityId: documentType.id,
      entityType: 'DocumentType',
      newValues: { workflowId: input.workflowId },
    });
    return assignment;
  }

  async workflowAssignments(principal: AuthenticatedUser) {
    const [assignments, documentTypes] = await Promise.all([
      this.prisma.workflowAssignment.findMany({
        include: {
          workflow: { select: { id: true, name: true, version: true } },
        },
        orderBy: { documentType: 'asc' },
        where: { organizationId: principal.organizationId },
      }),
      this.documentTypes(principal, {}),
    ]);

    return {
      assignments,
      documentTypes: documentTypes.map((documentType) => ({
        ...documentType,
        hasActiveWorkflow: assignments.some(
          (assignment) =>
            assignment.active && assignment.documentType === documentType.name,
        ),
      })),
    };
  }

  async systemSettings(principal: AuthenticatedUser) {
    const rows = await this.prisma.systemSetting.findMany({
      where: { organizationId: principal.organizationId },
    });
    const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { ...defaultSettings, ...saved };
  }

  async updateSystemSettings(
    principal: AuthenticatedUser,
    input: UpdateSystemSettingsDto,
    metadata: RequestMetadata,
  ) {
    const entries = Object.entries(input).filter(
      ([, value]) => value !== undefined,
    ) as Array<[keyof UpdateSystemSettingsDto, Prisma.InputJsonValue]>;

    for (const [key, value] of entries) {
      await this.prisma.systemSetting.upsert({
        create: {
          key,
          organizationId: principal.organizationId,
          value,
        },
        update: { value },
        where: {
          organizationId_key: {
            key,
            organizationId: principal.organizationId,
          },
        },
      });
    }
    await this.record(principal, metadata, {
      action: 'admin.systemSettings.updated',
      entityType: 'SystemSetting',
      newValues: input as Prisma.InputJsonObject,
    });
    return this.systemSettings(principal);
  }

  auditLog(principal: AuthenticatedUser, query: AdminAuditQueryDto) {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      where: {
        organizationId: principal.organizationId,
        ...(query.action ? { action: query.action } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
      },
    });
  }

  async pilotReadiness(principal: AuthenticatedUser) {
    const organizationId = principal.organizationId;
    const [
      organization,
      departmentCount,
      userCount,
      configuredRoleCount,
      documentTypeCount,
      activeWorkflowAssignmentCount,
      adminUser,
      reportPermissionCount,
      notificationCount,
    ] = await Promise.all([
      this.organization(principal),
      this.prisma.department.count({
        where: { active: true, deletedAt: null, organizationId },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, organizationId, status: UserStatus.ACTIVE },
      }),
      this.prisma.role.count({ where: { active: true, organizationId } }),
      this.prisma.documentType.count({
        where: { active: true, organizationId },
      }),
      this.prisma.workflowAssignment.count({
        where: { active: true, organizationId },
      }),
      this.prisma.user.findFirst({
        where: {
          email: 'admin@demo.faithos.local',
          organizationId,
          status: UserStatus.ACTIVE,
        },
      }),
      this.prisma.rolePermission.count({
        where: {
          permission: { code: { startsWith: 'reports.' } },
          role: { users: { some: { id: principal.id } } },
        },
      }),
      this.prisma.workflowNotification.count({ where: { organizationId } }),
    ]);

    const profileComplete = Boolean(
      organization.name &&
      organization.email &&
      organization.phone &&
      organization.address &&
      organization.timezone,
    );
    const workflowsAssigned =
      documentTypeCount > 0 &&
      activeWorkflowAssignmentCount >= Math.min(documentTypeCount, 3);

    const items = [
      this.check(
        'Organization profile completed',
        profileComplete,
        'Organization name, email, phone, address, and timezone are configured.',
        '/admin/organization',
      ),
      this.check(
        'At least 3 departments created',
        departmentCount >= 3,
        `${departmentCount} active department(s) found.`,
        '/admin/departments',
      ),
      this.check(
        'At least 5 users created',
        userCount >= 5,
        `${userCount} active user(s) found.`,
        '/admin/users',
      ),
      this.check(
        'At least 3 roles configured',
        configuredRoleCount >= 3,
        `${configuredRoleCount} organization role(s) found.`,
        '/admin/roles',
      ),
      this.check(
        'Document types configured',
        documentTypeCount >= 3,
        `${documentTypeCount} active document type(s) found.`,
        '/admin/document-types',
      ),
      this.check(
        'Workflows assigned to document types',
        workflowsAssigned,
        `${activeWorkflowAssignmentCount} active workflow assignment(s) found.`,
        '/admin/workflow-assignments',
      ),
      this.check(
        'Demo/test data reviewed',
        userCount > 0 && departmentCount > 0,
        'Seeded data is present; review before pilot kickoff.',
        '/uat/report',
      ),
      this.check(
        'Admin user confirmed',
        Boolean(adminUser),
        'Demo administrator account is active.',
        '/admin/users',
      ),
      this.check(
        'Reports accessible',
        reportPermissionCount > 0,
        'Current admin role has reporting permissions.',
        '/reports',
      ),
      this.check(
        'Notifications working',
        notificationCount > 0,
        `${notificationCount} notification record(s) found.`,
        '/notifications',
      ),
      this.check(
        'Docker health verified',
        true,
        'API is serving this checklist; verify full Docker health in UAT.',
        '/health-check',
      ),
      this.check(
        'Swagger accessible',
        true,
        'Swagger is mounted at /api/docs; verify in browser.',
        '/api/docs',
      ),
    ];

    return {
      complete: items.every((item) => item.complete),
      items,
    };
  }

  userImportTemplateCsv() {
    return [
      'firstName,lastName,email,departmentCode,roleName,active',
      'Ada,Okafor,ada.okafor@example.org,OPS,Standard User,true',
      'Samuel,Bello,samuel.bello@example.org,FIN,Organization Admin,true',
    ].join('\n');
  }

  async previewUserImport(
    principal: AuthenticatedUser,
    input: AdminUserImportPreviewDto,
  ) {
    const parsed = await this.parseUserImport(principal, input);
    return {
      errors: parsed.errors,
      rows: parsed.rows.slice(0, input.previewLimit ?? 50),
      summary: {
        duplicates: parsed.rows.filter((row) => row.status === 'duplicate')
          .length,
        invalid: parsed.errors.length,
        valid: parsed.rows.filter((row) => row.status === 'valid').length,
      },
    };
  }

  async importUsers(
    principal: AuthenticatedUser,
    input: AdminUserImportDto,
    metadata: RequestMetadata,
  ) {
    const parsed = await this.parseUserImport(principal, input);
    if (parsed.errors.length > 0) {
      throw new BadRequestException({
        errors: parsed.errors,
        message: 'CSV contains invalid rows. Preview and fix the file first.',
      });
    }

    const created: Array<{
      email: string;
      temporaryPassword: string;
      userId: string;
    }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    for (const row of parsed.rows) {
      if (row.status === 'duplicate') {
        skipped.push({ email: row.email, reason: 'Duplicate email skipped' });
        continue;
      }
      const temporaryPassword = randomBytes(18).toString('base64url');
      const user = await this.prisma.user.create({
        data: {
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          organizationId: principal.organizationId,
          passwordHash: await hash(temporaryPassword),
          status: row.active ? UserStatus.ACTIVE : UserStatus.INVITED,
          ...(row.departmentId ? { departmentId: row.departmentId } : {}),
          ...(row.roleId ? { roleId: row.roleId } : {}),
        },
        select: userSelect,
      });
      await this.record(principal, metadata, {
        action: 'admin.user.imported',
        entityId: user.id,
        entityType: 'User',
        newValues: { email: user.email, source: 'csv' },
      });
      await this.sendTemporaryPasswordEmail(user.email, temporaryPassword);
      created.push({
        email: user.email,
        temporaryPassword,
        userId: user.id,
      });
    }

    await this.record(principal, metadata, {
      action: 'admin.users.import.completed',
      entityType: 'User',
      newValues: {
        created: created.length,
        skipped: skipped.length,
      },
    });

    return { created, skipped };
  }

  async productionReadiness(principal: AuthenticatedUser) {
    const [organization, adminCount] = await Promise.all([
      this.organization(principal),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          organizationId: principal.organizationId,
          role: {
            rolePermissions: {
              some: { permission: { code: 'admin.access' } },
            },
          },
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    const checks = [
      this.check(
        'JWT secret configured',
        Boolean(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET),
        'JWT secrets appear present; values are never exposed.',
        '/admin/system-settings',
      ),
      this.check(
        'Database URL configured',
        Boolean(process.env.DATABASE_URL),
        'DATABASE_URL appears present.',
        '/admin/deployment-guide',
      ),
      this.check(
        'SMTP provider configured',
        Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT),
        'Pilot defaults use Mailpit; production requires a real SMTP provider.',
        '/admin/deployment-guide',
      ),
      this.check(
        'File storage configured',
        true,
        'Local upload storage is configured for pilot. External storage is future work.',
        '/admin/backup-restore',
      ),
      this.check(
        'Backup strategy documented',
        true,
        'Backup and restore guidance is available in the admin documentation.',
        '/admin/backup-restore',
      ),
      this.check(
        'Admin account confirmed',
        adminCount > 0,
        `${adminCount} active administrator account(s) found.`,
        '/admin/users',
      ),
      this.check(
        'Demo/test data removed or reviewed',
        !organization.email.endsWith('.local'),
        'Demo-local addresses should be reviewed before production.',
        '/uat/report',
      ),
      this.check(
        'HTTPS/domain configured',
        Boolean(process.env.WEB_URL?.startsWith('https://')),
        'Set WEB_URL to a production HTTPS domain before launch.',
        '/admin/deployment-guide',
      ),
      this.check(
        'Environment variables reviewed',
        Boolean(process.env.NODE_ENV),
        'Environment name is available; review all deployment variables.',
        '/admin/system-health',
      ),
      this.check(
        'Maintenance mode policy reviewed',
        true,
        'Maintenance mode is stored as a placeholder setting; enforcement is future work.',
        '/admin/system-settings',
      ),
      this.check(
        'Error logging/monitoring configured',
        false,
        'External error monitoring is not configured in this pilot build.',
        '/admin/system-health',
      ),
      this.check(
        'Privacy/data retention policy reviewed',
        false,
        'Add organization-specific privacy and retention procedures before production.',
        '/admin/backup-restore',
      ),
    ];

    return { complete: checks.every((check) => check.complete), items: checks };
  }

  async systemHealth() {
    const [database, redis, mailpit] = await Promise.all([
      this.checkDatabase(),
      this.checkTcpUrl(process.env.REDIS_URL),
      this.checkTcpHost(process.env.SMTP_HOST, process.env.SMTP_PORT),
    ]);

    return {
      api: { healthy: true, message: 'API process is responding.' },
      appVersion: process.env.npm_package_version ?? '0.0.0',
      database,
      environment: process.env.NODE_ENV ?? 'development',
      mailpit: {
        ...mailpit,
        message: mailpit.healthy
          ? 'SMTP endpoint is reachable.'
          : 'SMTP/Mailpit endpoint is not reachable from the API container.',
      },
      recentApiErrors: [],
      redis,
      web: {
        healthy: true,
        message: 'Web status is verified by the browser health route.',
      },
    };
  }

  async pilotDeployment(principal: AuthenticatedUser) {
    const [
      pilotReadiness,
      productionReadiness,
      setupCounts,
      feedbackCount,
      issueCount,
    ] = await Promise.all([
      this.pilotReadiness(principal),
      this.productionReadiness(principal),
      this.setupCounts(principal.organizationId),
      this.prisma.pilotFeedback.count({
        where: { organizationId: principal.organizationId },
      }),
      this.prisma.pilotIssue.count({
        where: { organizationId: principal.organizationId },
      }),
    ]);

    return {
      backupGuidanceAvailable: true,
      currentRelease: process.env.FAITHOS_RELEASE ?? 'v0.7.0',
      demoDataPresent: setupCounts.demoDataPresent,
      environmentName: process.env.NODE_ENV ?? 'development',
      feedbackFormAvailable: true,
      feedbackItems: feedbackCount,
      handoverGuideAvailable: true,
      issueTrackerAvailable: true,
      openIssues: issueCount,
      pilotReadinessStatus: pilotReadiness.complete ? 'READY' : 'REVIEW',
      productionReadinessStatus: productionReadiness.complete
        ? 'READY'
        : 'REVIEW',
      setupComplete: setupCounts.setupComplete,
    };
  }

  async demoCredentials(principal: AuthenticatedUser) {
    const productionLike = ['production', 'staging', 'pilot'].includes(
      (process.env.NODE_ENV ?? 'development').toLowerCase(),
    );
    const users = await this.prisma.user.findMany({
      include: {
        department: { select: { name: true } },
        role: { select: { name: true } },
      },
      orderBy: [{ role: { name: 'asc' } }, { email: 'asc' }],
      take: 20,
      where: {
        deletedAt: null,
        organizationId: principal.organizationId,
        OR: [
          { email: { endsWith: '.faithos.local' } },
          { email: { contains: '@demo.' } },
        ],
      },
    });

    return {
      demoCredentialsExistInProduction: productionLike && users.length > 0,
      warning: productionLike
        ? 'Demo users should not exist in production-like environments. Remove or rotate them immediately.'
        : 'Change or remove demo credentials before production use.',
      accounts: users.map((user) => ({
        department: user.department?.name ?? 'Unassigned',
        email: user.email,
        lastLoginAt: user.lastLoginAt,
        loginStatus: user.lastLoginAt ? 'Login verified' : 'Not logged in yet',
        name: `${user.firstName} ${user.lastName}`,
        password:
          !productionLike && user.email === 'admin@demo.faithos.local'
            ? 'FaithOS-Demo-2026!'
            : 'Password available in deployment handover notes only.',
        role: user.role?.name ?? 'Unassigned',
        scenario: this.demoScenarioForRole(user.role?.name ?? ''),
      })),
    };
  }

  async pilotSetupPack(principal: AuthenticatedUser) {
    const organizationId = principal.organizationId;
    const [
      organization,
      departments,
      users,
      roles,
      documentTypes,
      workflows,
      workflowAssignments,
      notifications,
    ] = await Promise.all([
      this.organization(principal),
      this.prisma.department.count({
        where: { active: true, deletedAt: null, organizationId },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, organizationId, status: UserStatus.ACTIVE },
      }),
      this.prisma.role.count({ where: { active: true, organizationId } }),
      this.prisma.documentType.count({
        where: { active: true, organizationId },
      }),
      this.prisma.workflow.count({ where: { active: true, organizationId } }),
      this.prisma.workflowAssignment.count({
        where: { active: true, organizationId },
      }),
      this.prisma.workflowNotification.count({ where: { organizationId } }),
    ]);

    const profileComplete = Boolean(
      organization.name && organization.email && organization.timezone,
    );
    const items = [
      this.packItem(
        'Organization profile',
        profileComplete,
        'Confirm name, email, timezone, contact details, and branding.',
        '/admin/organization',
        'Organization Admin',
      ),
      this.packItem(
        'Departments',
        departments >= 3,
        `${departments} active department(s) configured.`,
        '/admin/departments',
        'Organization Admin',
      ),
      this.packItem(
        'Users',
        users >= 5,
        `${users} active user(s) configured.`,
        '/admin/users',
        'Organization Admin',
      ),
      this.packItem(
        'Roles',
        roles >= 3,
        `${roles} organization role(s) configured.`,
        '/admin/roles',
        'Organization Admin',
      ),
      this.packItem(
        'Document types',
        documentTypes >= 3,
        `${documentTypes} document type(s) configured.`,
        '/admin/document-types',
        'Records Owner',
      ),
      this.packItem(
        'Workflow templates',
        workflows >= 1,
        `${workflows} active workflow template(s) configured.`,
        '/workflow-templates',
        'Process Owner',
      ),
      this.packItem(
        'Workflow assignments',
        workflowAssignments >= 3,
        `${workflowAssignments} workflow assignment(s) configured.`,
        '/admin/workflow-assignments',
        'Process Owner',
      ),
      this.packItem(
        'System settings',
        true,
        'Safe pilot settings are available for review.',
        '/admin/system-settings',
        'Organization Admin',
      ),
      this.packItem(
        'Notifications',
        notifications > 0,
        `${notifications} notification record(s) found.`,
        '/notifications',
        'Pilot Coordinator',
      ),
      this.packItem(
        'Reports',
        true,
        'Reports dashboard and CSV exports are available.',
        '/reports',
        'Leadership',
      ),
      this.packItem(
        'Backup plan',
        true,
        'Backup runbook and scripts are included in Sprint 8.',
        '/admin/backup-runbook',
        'Technical Owner',
      ),
      this.packItem(
        'Admin training',
        false,
        'Complete admin onboarding before wider staff testing.',
        '/admin/onboarding-checklist',
        'Pilot Coordinator',
      ),
      this.packItem(
        'Staff onboarding',
        false,
        'Share user manual and collect feedback during the trial.',
        '/help',
        'Pilot Coordinator',
      ),
    ];

    return { complete: items.every((item) => item.complete), items };
  }

  async submitFeedback(
    principal: AuthenticatedUser,
    input: CreatePilotFeedbackDto,
  ) {
    const submitter =
      input.name && input.email && input.roleOrDepartment
        ? null
        : await this.prisma.user.findFirst({
            select: {
              department: { select: { name: true } },
              email: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
            where: {
              deletedAt: null,
              id: principal.id,
              organizationId: principal.organizationId,
            },
          });
    const title = input.title?.trim();
    const description = input.description?.trim();
    const message =
      input.message ??
      [
        title,
        description,
        input.currentRoute ? `Route: ${input.currentRoute}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');
    const submitterName =
      [submitter?.firstName, submitter?.lastName].filter(Boolean).join(' ') ||
      'Pilot User';
    if (!message || message.length < 5) {
      throw new BadRequestException('Feedback description is required');
    }

    return this.prisma.pilotFeedback.create({
      data: {
        affectedArea: input.affectedArea ?? input.currentRoute ?? 'General',
        email: (
          input.email ??
          submitter?.email ??
          'unknown@faithos.local'
        ).toLowerCase(),
        message,
        name: input.name ?? submitterName,
        organizationId: principal.organizationId,
        priority: input.priority ?? this.feedbackPriority(input.severity),
        roleOrDepartment:
          input.roleOrDepartment ??
          submitter?.department?.name ??
          submitter?.role?.name ??
          'Unassigned',
        submittedByUserId: principal.id,
        type: input.type ?? this.feedbackType(input.category),
        ...(input.screenshotUrl ? { screenshotUrl: input.screenshotUrl } : {}),
      },
    });
  }

  feedback(principal: AuthenticatedUser, query: PilotFeedbackQueryDto) {
    return this.prisma.pilotFeedback.findMany({
      include: {
        submitter: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      where: {
        organizationId: principal.organizationId,
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
    });
  }

  async updateFeedback(
    principal: AuthenticatedUser,
    id: string,
    input: UpdatePilotFeedbackDto,
    metadata: RequestMetadata,
  ) {
    await this.ensureFeedback(principal.organizationId, id);
    const feedback = await this.prisma.pilotFeedback.update({
      data: input,
      where: { id },
    });
    await this.record(principal, metadata, {
      action: 'pilot.feedback.updated',
      entityId: id,
      entityType: 'PilotFeedback',
      newValues: input as Prisma.InputJsonObject,
    });
    return feedback;
  }

  pilotIssues(principal: AuthenticatedUser, query: PilotIssueQueryDto) {
    return this.prisma.pilotIssue.findMany({
      include: {
        creator: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
        feedback: { select: { id: true, priority: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      where: {
        organizationId: principal.organizationId,
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
    });
  }

  async createPilotIssue(
    principal: AuthenticatedUser,
    input: CreatePilotIssueDto,
    metadata: RequestMetadata,
  ) {
    if (input.feedbackId) {
      await this.ensureFeedback(principal.organizationId, input.feedbackId);
    }
    const issue = await this.prisma.pilotIssue.create({
      data: {
        createdByUserId: principal.id,
        description: input.description,
        organizationId: principal.organizationId,
        severity: input.severity,
        source: input.source,
        status: input.status ?? 'Open',
        title: input.title,
        ...(input.assignedOwner ? { assignedOwner: input.assignedOwner } : {}),
        ...(input.feedbackId ? { feedbackId: input.feedbackId } : {}),
        ...(input.relatedArea ? { relatedArea: input.relatedArea } : {}),
      },
    });
    await this.record(principal, metadata, {
      action: 'pilot.issue.created',
      entityId: issue.id,
      entityType: 'PilotIssue',
      newValues: { severity: issue.severity, title: issue.title },
    });
    return issue;
  }

  async updatePilotIssue(
    principal: AuthenticatedUser,
    id: string,
    input: UpdatePilotIssueDto,
    metadata: RequestMetadata,
  ) {
    await this.ensurePilotIssue(principal.organizationId, id);
    const issue = await this.prisma.pilotIssue.update({
      data: input,
      where: { id },
    });
    await this.record(principal, metadata, {
      action: 'pilot.issue.updated',
      entityId: id,
      entityType: 'PilotIssue',
      newValues: input as Prisma.InputJsonObject,
    });
    return issue;
  }

  async onboardingChecklist(principal: AuthenticatedUser) {
    const [completed, setupCounts] = await Promise.all([
      this.prisma.adminOnboardingItem.findMany({
        where: {
          organizationId: principal.organizationId,
          userId: principal.id,
        },
      }),
      this.setupCounts(principal.organizationId),
    ]);
    const completedKeys = new Set(completed.map((item) => item.key));
    const derivedComplete = new Set<string>([
      'login',
      ...(setupCounts.organizationConfigured ? ['organization'] : []),
      ...(setupCounts.departmentsConfigured ? ['departments'] : []),
      ...(setupCounts.usersConfigured ? ['users'] : []),
      ...(setupCounts.documentTypesConfigured ? ['document-types'] : []),
      ...(setupCounts.workflowAssignmentsConfigured
        ? ['workflow-assignments']
        : []),
    ]);

    const items = adminOnboardingItems.map(([key, label, href, owner]) => ({
      complete: completedKeys.has(key) || derivedComplete.has(key),
      href,
      key,
      label,
      owner,
    }));

    return { complete: items.every((item) => item.complete), items };
  }

  async completeOnboardingItem(
    principal: AuthenticatedUser,
    key: string,
    metadata: RequestMetadata,
  ) {
    const allowed = new Set<string>(
      adminOnboardingItems.map(([itemKey]) => itemKey),
    );
    if (!allowed.has(key)) {
      throw new NotFoundException('Onboarding checklist item not found');
    }
    const item = await this.prisma.adminOnboardingItem.upsert({
      create: {
        key,
        organizationId: principal.organizationId,
        userId: principal.id,
      },
      update: { completedAt: new Date() },
      where: {
        organizationId_userId_key: {
          key,
          organizationId: principal.organizationId,
          userId: principal.id,
        },
      },
    });
    await this.record(principal, metadata, {
      action: 'pilot.onboarding.completed',
      entityId: item.id,
      entityType: 'AdminOnboardingItem',
      newValues: { key },
    });
    return this.onboardingChecklist(principal);
  }

  private async setupCounts(organizationId: string) {
    const [
      organization,
      departments,
      users,
      documentTypes,
      workflowAssignments,
      documents,
    ] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
      this.prisma.department.count({
        where: { active: true, deletedAt: null, organizationId },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, organizationId, status: UserStatus.ACTIVE },
      }),
      this.prisma.documentType.count({
        where: { active: true, organizationId },
      }),
      this.prisma.workflowAssignment.count({
        where: { active: true, organizationId },
      }),
      this.prisma.document.count({ where: { organizationId } }),
    ]);
    const organizationConfigured = Boolean(
      organization?.name && organization.email && organization.timezone,
    );
    const departmentsConfigured = departments >= 3;
    const usersConfigured = users >= 5;
    const documentTypesConfigured = documentTypes >= 3;
    const workflowAssignmentsConfigured = workflowAssignments >= 3;
    const setupComplete =
      organizationConfigured &&
      departmentsConfigured &&
      usersConfigured &&
      documentTypesConfigured &&
      workflowAssignmentsConfigured;

    return {
      departments,
      departmentsConfigured,
      demoDataPresent: documents >= 10,
      documentTypes,
      documentTypesConfigured,
      organizationConfigured,
      setupComplete,
      users,
      usersConfigured,
      workflowAssignments,
      workflowAssignmentsConfigured,
    };
  }

  private demoScenarioForRole(roleName: string) {
    if (roleName.toLowerCase().includes('admin')) {
      return 'Configure departments, users, document types, workflows, and pilot settings.';
    }
    if (roleName.toLowerCase().includes('viewer')) {
      return 'Review dashboards, reports, documents, and UAT feedback without changing configuration.';
    }
    return 'Create documents, route workflow tasks, review notifications, and submit pilot feedback.';
  }

  private feedbackPriority(severity?: string) {
    const map: Record<string, string> = {
      CRITICAL: 'Critical',
      HIGH: 'High',
      LOW: 'Low',
      MEDIUM: 'Medium',
    };
    return severity ? (map[severity] ?? 'Medium') : 'Medium';
  }

  private feedbackType(category?: string) {
    const map: Record<string, string> = {
      BUG: 'Bug',
      CONFUSING_UI: 'Confusion',
      FEATURE_REQUEST: 'Feature request',
      OTHER: 'Other',
      PERFORMANCE: 'Process improvement',
    };
    return category ? (map[category] ?? 'Other') : 'Other';
  }

  private packItem(
    label: string,
    complete: boolean,
    description: string,
    href: string,
    owner: string,
  ) {
    return {
      complete,
      description,
      href,
      label,
      owner,
      status: complete ? 'Complete' : 'Needs review',
    };
  }

  private async ensureFeedback(organizationId: string, id: string) {
    const feedback = await this.prisma.pilotFeedback.findFirst({
      where: { id, organizationId },
    });
    if (!feedback) throw new NotFoundException('Pilot feedback not found');
    return feedback;
  }

  private async ensurePilotIssue(organizationId: string, id: string) {
    const issue = await this.prisma.pilotIssue.findFirst({
      where: { id, organizationId },
    });
    if (!issue) throw new NotFoundException('Pilot issue not found');
    return issue;
  }

  private async setUserStatus(
    principal: AuthenticatedUser,
    id: string,
    status: UserStatus,
    metadata: RequestMetadata,
  ) {
    const user = await this.updateUser(principal, id, { status }, metadata);
    if (status === UserStatus.DISABLED) {
      await this.prisma.session.updateMany({
        data: { revokedAt: new Date() },
        where: { revokedAt: null, userId: id },
      });
    }
    return user;
  }

  private async ensureDepartment(organizationId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { deletedAt: null, id, organizationId },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  private async ensureUser(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      select: userSelect,
      where: { deletedAt: null, id, organizationId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async ensureMutableRole(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, isSystem: false, organizationId },
    });
    if (!role) throw new NotFoundException('Organization role not found');
    return role;
  }

  private async ensureWorkflow(organizationId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { active: true, id, organizationId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  private async ensureDocumentType(organizationId: string, id: string) {
    const documentType = await this.prisma.documentType.findFirst({
      where: { id, organizationId },
    });
    if (!documentType) throw new NotFoundException('Document type not found');
    return documentType;
  }

  private async assertDepartmentRelations(
    organizationId: string,
    input: {
      departmentHeadId?: string | null;
      parentDepartmentId?: string | null;
    },
    currentDepartmentId?: string,
  ) {
    if (input.departmentHeadId) {
      await this.ensureUser(organizationId, input.departmentHeadId);
    }
    if (input.parentDepartmentId) {
      if (input.parentDepartmentId === currentDepartmentId) {
        throw new ConflictException('A department cannot be its own parent');
      }
      await this.ensureDepartment(organizationId, input.parentDepartmentId);
    }
  }

  private async assertUserRelations(
    organizationId: string,
    input: { departmentId?: string | null; roleId?: string | null },
  ) {
    if (input.departmentId) {
      await this.ensureDepartment(organizationId, input.departmentId);
    }
    if (input.roleId) {
      const role = await this.prisma.role.findFirst({
        where: {
          active: true,
          id: input.roleId,
          OR: [{ organizationId }, { isSystem: true, organizationId: null }],
        },
      });
      if (!role) throw new NotFoundException('Role not found');
    }
  }

  private async saveWorkflowAssignment(
    principal: AuthenticatedUser,
    documentType: string,
    input: { active?: boolean; workflowId: string },
  ) {
    await this.ensureWorkflow(principal.organizationId, input.workflowId);
    return this.prisma.workflowAssignment.upsert({
      create: {
        active: input.active ?? true,
        documentType,
        organizationId: principal.organizationId,
        workflowId: input.workflowId,
      },
      include: {
        workflow: { select: { id: true, name: true, version: true } },
      },
      update: {
        active: input.active ?? true,
        workflowId: input.workflowId,
      },
      where: {
        organizationId_documentType: {
          documentType,
          organizationId: principal.organizationId,
        },
      },
    });
  }

  private async parseUserImport(
    principal: AuthenticatedUser,
    input: AdminUserImportDto,
  ) {
    if (!input.fileName.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only .csv files are supported');
    }
    if (Buffer.byteLength(input.csvText, 'utf8') !== input.sizeBytes) {
      throw new BadRequestException('CSV size does not match uploaded file');
    }

    const [headerLine, ...lines] = input.csvText
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);
    const expected = [
      'firstName',
      'lastName',
      'email',
      'departmentCode',
      'roleName',
      'active',
    ];
    const header = this.parseCsvLine(headerLine ?? '').map((value) =>
      value.trim(),
    );
    if (expected.some((column, index) => header[index] !== column)) {
      throw new BadRequestException(
        `CSV header must be: ${expected.join(',')}`,
      );
    }

    const [departments, roles, existingUsers] = await Promise.all([
      this.prisma.department.findMany({
        where: {
          active: true,
          deletedAt: null,
          organizationId: principal.organizationId,
        },
      }),
      this.prisma.role.findMany({
        where: {
          active: true,
          OR: [
            { organizationId: principal.organizationId },
            { isSystem: true, organizationId: null },
          ],
        },
      }),
      this.prisma.user.findMany({
        select: { email: true },
        where: { organizationId: principal.organizationId },
      }),
    ]);
    const departmentByCode = new Map(
      departments
        .filter((department) => department.code)
        .map((department) => [department.code?.toUpperCase(), department.id]),
    );
    const roleByName = new Map(
      roles.map((role) => [role.name.toLowerCase(), role.id]),
    );
    const seen = new Set(existingUsers.map((user) => user.email));
    const errors: Array<{ message: string; rowNumber: number }> = [];
    const rows: Array<
      ParsedUserImportRow & {
        departmentId?: string;
        roleId?: string;
        status: 'duplicate' | 'invalid' | 'valid';
      }
    > = [];

    lines.forEach((line, index) => {
      const rowNumber = index + 2;
      const [
        firstName = '',
        lastName = '',
        email = '',
        departmentCode = '',
        roleName = '',
        active = 'true',
      ] = this.parseCsvLine(line).map((value) => value.trim());
      const normalizedEmail = email.toLowerCase();
      const departmentId = departmentByCode.get(departmentCode.toUpperCase());
      const roleId = roleByName.get(roleName.toLowerCase());
      const rowErrors = [
        !firstName ? 'firstName is required' : '',
        !lastName ? 'lastName is required' : '',
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
          ? 'email is invalid'
          : '',
        departmentCode && !departmentId ? 'departmentCode was not found' : '',
        roleName && !roleId ? 'roleName was not found' : '',
        !['true', 'false', '1', '0', 'yes', 'no'].includes(active.toLowerCase())
          ? 'active must be true or false'
          : '',
      ].filter(Boolean);

      if (rowErrors.length > 0) {
        rowErrors.forEach((message) => errors.push({ message, rowNumber }));
      }

      const duplicate = seen.has(normalizedEmail);
      seen.add(normalizedEmail);
      rows.push({
        active: ['true', '1', 'yes'].includes(active.toLowerCase()),
        departmentCode,
        email: normalizedEmail,
        firstName,
        lastName,
        roleName,
        rowNumber,
        status:
          rowErrors.length > 0 ? 'invalid' : duplicate ? 'duplicate' : 'valid',
        ...(departmentId ? { departmentId } : {}),
        ...(roleId ? { roleId } : {}),
      });
    });

    return { errors, rows };
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const next = line[index + 1];
      if (character === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += character;
      }
    }
    values.push(current);
    return values;
  }

  private async sendTemporaryPasswordEmail(
    to: string,
    temporaryPassword: string,
  ) {
    await this.email?.send({
      subject: '[FaithOS] Your pilot account is ready',
      text: [
        'A FaithOS pilot account has been created for you.',
        '',
        `Temporary password: ${temporaryPassword}`,
        '',
        'Development email uses Mailpit only. Change this password after first login when instructed by your administrator.',
      ].join('\n'),
      to,
    });
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { healthy: true, message: 'Database connection is healthy.' };
    } catch {
      return { healthy: false, message: 'Database connection failed.' };
    }
  }

  private checkTcpUrl(value?: string) {
    if (!value) {
      return Promise.resolve({
        healthy: false,
        message: 'Connection URL is not configured.',
      });
    }
    try {
      const url = new URL(value);
      return this.checkTcpHost(
        url.hostname,
        url.port || (url.protocol === 'rediss:' ? '6380' : '6379'),
      );
    } catch {
      return Promise.resolve({ healthy: false, message: 'URL is invalid.' });
    }
  }

  private checkTcpHost(host?: string, port?: string) {
    if (!host || !port) {
      return Promise.resolve({
        healthy: false,
        message: 'Host or port is not configured.',
      });
    }

    return new Promise<{ healthy: boolean; message: string }>((resolve) => {
      const socket = connect(Number.parseInt(port, 10), host);
      const finish = (healthy: boolean, message: string) => {
        socket.destroy();
        resolve({ healthy, message });
      };
      socket.setTimeout(1_500, () => finish(false, 'Connection timed out.'));
      socket.once('connect', () => finish(true, 'TCP connection succeeded.'));
      socket.once('error', () => finish(false, 'TCP connection failed.'));
    });
  }

  private groupPermissions<T extends { module: string }>(permissions: T[]) {
    return permissions.reduce<Record<string, T[]>>((groups, permission) => {
      const group = groups[permission.module] ?? [];
      group.push(permission);
      groups[permission.module] = group;
      return groups;
    }, {});
  }

  private check(
    label: string,
    complete: boolean,
    explanation: string,
    href: string,
  ) {
    return { complete, explanation, href, label };
  }

  private record(
    principal: AuthenticatedUser,
    metadata: RequestMetadata,
    entry: {
      action: string;
      entityId?: string;
      entityType: string;
      newValues?: Prisma.InputJsonValue;
      oldValues?: Prisma.InputJsonValue;
    },
  ) {
    return this.audit.record({
      ...entry,
      ...metadata,
      organizationId: principal.organizationId,
      userId: principal.id,
    });
  }
}
