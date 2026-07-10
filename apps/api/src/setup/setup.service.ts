import { Injectable } from '@nestjs/common';
import { Prisma } from '@faithos/database';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/authenticated-user';
import { RequestMetadata } from '../common/request-metadata.decorator';
import { PrismaService } from '../database/prisma.service';
import { SetupOrganizationDto, SetupStep } from './dto/setup.dto';

const reviewedSettingKeys: Record<SetupStep, string | null> = {
  adminUser: 'setup.adminUserConfirmed',
  departments: null,
  documentTypes: null,
  organization: null,
  pilotReadiness: 'setup.pilotReadinessReviewed',
  systemSettings: 'setup.systemSettingsReviewed',
  workflowAssignments: null,
};

@Injectable()
export class SetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
}
