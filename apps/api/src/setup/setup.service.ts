import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { OrganizationStatus, Prisma, UserStatus } from '@faithos/database';
import { hash } from 'argon2';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { PrismaService } from '../database/prisma.service';
import {
  CreateFirstAdminDto,
  SetupOrganizationDto,
  SetupStep,
} from './dto/setup.dto';

const reviewedSettingKeys: Record<SetupStep, string | null> = {
  adminUser: 'setup.adminUserConfirmed',
  departments: null,
  documentTypes: null,
  organization: null,
  pilotReadiness: 'setup.pilotReadinessReviewed',
  systemSettings: 'setup.systemSettingsReviewed',
  workflowAssignments: null,
};

const firstAdminPermissions = [
  ['admin.access', 'Access admin configuration area', 'admin'],
  ['admin.organization.manage', 'Manage organization settings', 'admin'],
  ['admin.departments.manage', 'Manage departments', 'admin'],
  ['admin.users.manage', 'Manage users', 'admin'],
  ['admin.roles.manage', 'Manage roles', 'admin'],
  ['admin.permissions.view', 'View permission catalog', 'admin'],
  ['admin.documentTypes.manage', 'Manage document types', 'admin'],
  [
    'admin.workflowAssignments.manage',
    'Manage workflow assignment configuration',
    'admin',
  ],
  ['admin.systemSettings.manage', 'Manage safe system settings', 'admin'],
  ['admin.audit.view', 'View administrative audit log', 'admin'],
  ['admin.pilotReadiness.view', 'View pilot readiness checklist', 'admin'],
  ['admin.setup.manage', 'Manage first-run setup wizard', 'admin'],
  [
    'admin.productionReadiness.view',
    'View production readiness checklist',
    'admin',
  ],
  ['admin.systemHealth.view', 'View safe system health status', 'admin'],
  ['organizations.read', 'View organization', 'organizations'],
  ['organizations.write', 'Update organization', 'organizations'],
  ['departments.read', 'View departments', 'departments'],
  ['departments.write', 'Manage departments', 'departments'],
  ['users.read', 'View users', 'users'],
  ['users.write', 'Manage users', 'users'],
  ['roles.read', 'View roles and permissions', 'roles'],
  ['roles.write', 'Manage role permissions', 'roles'],
  ['audit.read', 'View audit history', 'audit'],
  ['documents.read', 'View documents and folders', 'documents'],
  ['documents.write', 'Create and update documents', 'documents'],
  [
    'documents.route',
    'Submit, receive, forward, and return documents',
    'documents',
  ],
  ['workflows.read', 'View workflows and workflow activity', 'workflows'],
  ['workflows.write', 'Manage workflow templates and assignments', 'workflows'],
  ['workflows.execute', 'Execute workflow approval tasks', 'workflows'],
  ['notifications.read', 'View notification center', 'notifications'],
  ['notifications.write', 'Manage notification read state', 'notifications'],
  ['dashboard.read', 'View operational dashboards', 'dashboard'],
  ['reports.view', 'View reporting and analytics', 'reports'],
  ['reports.export', 'Export reporting data', 'reports'],
  [
    'reports.view.organization',
    'View organization-wide reporting data',
    'reports',
  ],
  ['reports.view.department', 'View department-scoped reports', 'reports'],
  ['reports.view.self', 'View self-scoped reporting data', 'reports'],
  ['pilot.deployment.view', 'View pilot deployment control pack', 'pilot'],
  ['pilot.feedback.view', 'View pilot feedback submissions', 'pilot'],
  ['pilot.feedback.manage', 'Manage pilot feedback triage', 'pilot'],
  ['pilot.issues.manage', 'Manage pilot issue tracker records', 'pilot'],
  ['pilot.docs.view', 'View pilot documentation and handover guides', 'pilot'],
  ['pilot.backup.view', 'View pilot backup and restore runbooks', 'pilot'],
  ['pilot.handover.view', 'View pilot handover guide', 'pilot'],
] as const;

@Injectable()
export class SetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async firstAdminStatus() {
    const adminExists = await this.adminExists();
    return {
      available: !adminExists,
      reason: adminExists
        ? 'First-admin setup is disabled because an administrator already exists.'
        : 'First-admin setup is available.',
    };
  }

  async createFirstAdmin(
    input: CreateFirstAdminDto,
    metadata: RequestMetadata,
  ) {
    if (await this.adminExists()) {
      throw new ConflictException(
        'First-admin setup is disabled because an administrator already exists',
      );
    }
    this.assertStrongPassword(input.password);

    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email is already in use');
    }

    const slug = await this.uniqueOrganizationSlug(input.organizationName);
    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          country: process.env.DEFAULT_COUNTRY ?? 'NG',
          defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'NGN',
          email: input.organizationEmail?.toLowerCase() ?? email,
          name: input.organizationName,
          shortName: input.organizationName,
          slug,
          status: OrganizationStatus.ACTIVE,
          timezone: process.env.DEFAULT_TIMEZONE ?? 'UTC',
        },
      });
      const permissions = await Promise.all(
        firstAdminPermissions.map(([code, displayName, module]) =>
          tx.permission.upsert({
            create: { code, displayName, module },
            update: { displayName, module },
            where: { code },
          }),
        ),
      );
      const role = await tx.role.create({
        data: {
          active: true,
          description: 'Initial administrator created through first-run setup.',
          isSystem: false,
          name: 'Organization Admin',
          organizationId: organization.id,
        },
      });
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          permissionId: permission.id,
          roleId: role.id,
        })),
        skipDuplicates: true,
      });
      const user = await tx.user.create({
        data: {
          email,
          firstName: input.firstName,
          lastName: input.lastName,
          organizationId: organization.id,
          passwordHash: await hash(input.password),
          roleId: role.id,
          status: UserStatus.ACTIVE,
        },
        select: {
          email: true,
          firstName: true,
          id: true,
          lastName: true,
          organizationId: true,
          roleId: true,
          status: true,
        },
      });
      return { organization, user };
    });

    await this.audit.record({
      action: 'setup.first_admin.created',
      entityId: result.user.id,
      entityType: 'User',
      newValues: { email: result.user.email },
      organizationId: result.organization.id,
      userId: result.user.id,
      ...metadata,
    });

    return result;
  }

  async status(principal: AuthenticatedUser) {
    const organizationId = principal.organizationId;
    const [
      organization,
      departments,
      users,
      documentTypes,
      workflowAssignments,
      settings,
    ] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
      }),
      this.prisma.department.count({
        where: { active: true, deletedAt: null, organizationId },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, organizationId, status: 'ACTIVE' },
      }),
      this.prisma.documentType.count({
        where: { active: true, organizationId },
      }),
      this.prisma.workflowAssignment.count({
        where: { active: true, organizationId },
      }),
      this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'setup.adminUserConfirmed',
              'setup.pilotReadinessReviewed',
              'setup.systemSettingsReviewed',
            ],
          },
          organizationId,
        },
      }),
    ]);

    const settingValue = (key: string) =>
      settings.some((setting) => setting.key === key && setting.value === true);
    const organizationConfigured = Boolean(
      organization.name && organization.email && organization.timezone,
    );
    const departmentsConfigured = departments > 0;
    const usersConfigured =
      users > 0 || settingValue('setup.adminUserConfirmed');
    const documentTypesConfigured = documentTypes > 0;
    const workflowAssignmentsConfigured = workflowAssignments > 0;
    const systemSettingsReviewed = settingValue('setup.systemSettingsReviewed');
    const pilotReadinessReviewed = settingValue('setup.pilotReadinessReviewed');
    const setupComplete =
      organizationConfigured &&
      departmentsConfigured &&
      usersConfigured &&
      documentTypesConfigured &&
      workflowAssignmentsConfigured &&
      systemSettingsReviewed &&
      pilotReadinessReviewed;

    return {
      departmentsConfigured,
      documentTypesConfigured,
      organizationConfigured,
      pilotReadinessReviewed,
      setupComplete,
      systemSettingsReviewed,
      usersConfigured,
      workflowAssignmentsConfigured,
    };
  }

  async completeStep(
    principal: AuthenticatedUser,
    step: SetupStep,
    metadata: RequestMetadata,
  ) {
    const key = reviewedSettingKeys[step];
    if (key) {
      await this.prisma.systemSetting.upsert({
        create: {
          key,
          organizationId: principal.organizationId,
          value: true,
        },
        update: { value: true },
        where: {
          organizationId_key: {
            key,
            organizationId: principal.organizationId,
          },
        },
      });
    }

    await this.audit.record({
      action: 'setup.step.completed',
      entityId: principal.organizationId,
      entityType: 'Setup',
      newValues: { step } satisfies Prisma.InputJsonObject,
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    return this.status(principal);
  }

  async updateOrganization(
    principal: AuthenticatedUser,
    input: SetupOrganizationDto,
    metadata: RequestMetadata,
  ) {
    const organization = await this.prisma.organization.update({
      data: input,
      where: { id: principal.organizationId },
    });
    await this.audit.record({
      action: 'setup.organization.updated',
      entityId: organization.id,
      entityType: 'Organization',
      newValues: input as Prisma.InputJsonObject,
      organizationId: principal.organizationId,
      userId: principal.id,
      ...metadata,
    });

    return organization;
  }

  private async adminExists(): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        deletedAt: null,
        role: {
          active: true,
          name: {
            in: ['Organization Admin', 'Super Admin', 'System Administrator'],
          },
        },
        status: UserStatus.ACTIVE,
      },
    });
    return count > 0;
  }

  private assertStrongPassword(password: string): void {
    const failures = [
      password.length < 12 ? 'at least 12 characters' : '',
      !/[a-z]/.test(password) ? 'a lowercase letter' : '',
      !/[A-Z]/.test(password) ? 'an uppercase letter' : '',
      !/\d/.test(password) ? 'a number' : '',
      !/[^A-Za-z0-9]/.test(password) ? 'a symbol' : '',
    ].filter(Boolean);
    if (failures.length > 0) {
      throw new BadRequestException(
        `Password must include ${failures.join(', ')}`,
      );
    }
  }

  private async uniqueOrganizationSlug(name: string): Promise<string> {
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'faithos-organization';
    let slug = base;
    let suffix = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }
}
