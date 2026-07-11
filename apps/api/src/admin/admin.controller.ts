import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import {
  CurrentRequestMetadata,
  RequestMetadata,
} from '../common/request-metadata.decorator';
import { RawResponse } from '../common/raw-response.decorator';
import { AdminService } from './admin.service';
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
  CreatePilotIssueDto,
  PilotFeedbackQueryDto,
  PilotIssueQueryDto,
  UpdatePilotFeedbackDto,
  UpdatePilotIssueDto,
} from './dto/pilot-trial.dto';

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @RequirePermissions('admin.access')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Admin summary retrieved',
      await this.admin.summary(user),
    );
  }

  @Get('organization')
  @RequirePermissions('admin.organization.manage')
  @ApiOperation({ summary: 'Get organization settings for the current tenant' })
  async organization(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Organization settings retrieved',
      await this.admin.organization(user),
    );
  }

  @Patch('organization')
  @RequirePermissions('admin.organization.manage')
  @ApiOperation({ summary: 'Update organization settings' })
  async updateOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateAdminOrganizationDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Organization settings updated',
      await this.admin.updateOrganization(user, input, metadata),
    );
  }

  @Get('departments')
  @RequirePermissions('admin.departments.manage')
  @ApiOperation({ summary: 'List departments with admin counts' })
  async departments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminActiveQueryDto,
  ) {
    return apiResponse(
      'Admin departments retrieved',
      await this.admin.departments(user, query),
    );
  }

  @Post('departments')
  @RequirePermissions('admin.departments.manage')
  @ApiOperation({ summary: 'Create a department' })
  async createDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAdminDepartmentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Department created',
      await this.admin.createDepartment(user, input, metadata),
    );
  }

  @Patch('departments/:id')
  @RequirePermissions('admin.departments.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update a department' })
  async updateDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateAdminDepartmentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Department updated',
      await this.admin.updateDepartment(user, id, input, metadata),
    );
  }

  @Patch('departments/:id/deactivate')
  @RequirePermissions('admin.departments.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Deactivate a department without hard deletion' })
  async deactivateDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Department deactivated',
      await this.admin.deactivateDepartment(user, id, metadata),
    );
  }

  @Get('users')
  @RequirePermissions('admin.users.manage')
  @ApiOperation({ summary: 'List and filter users' })
  async users(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminUserQueryDto,
  ) {
    return apiResponse(
      'Admin users retrieved',
      await this.admin.users(user, query),
    );
  }

  @Get('users/import-template.csv')
  @RequirePermissions('admin.users.manage')
  @RawResponse()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Download CSV user import template' })
  async userImportTemplate(
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="faithos-user-import-template.csv"',
    );
    return this.admin.userImportTemplateCsv();
  }

  @Post('users/import-preview')
  @RequirePermissions('admin.users.manage')
  @ApiOperation({ summary: 'Validate and preview pilot user CSV import' })
  async previewUserImport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AdminUserImportPreviewDto,
  ) {
    return apiResponse(
      'User import preview generated',
      await this.admin.previewUserImport(user, input),
    );
  }

  @Post('users/import')
  @RequirePermissions('admin.users.manage')
  @ApiOperation({ summary: 'Import pilot users from a validated CSV payload' })
  async importUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AdminUserImportDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User import completed',
      await this.admin.importUsers(user, input, metadata),
    );
  }

  @Post('users')
  @RequirePermissions('admin.users.manage')
  @ApiOperation({ summary: 'Create a user with a temporary password' })
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAdminUserDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User created',
      await this.admin.createUser(user, input, metadata),
    );
  }

  @Patch('users/:id')
  @RequirePermissions('admin.users.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update a user' })
  async updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateAdminUserDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User updated',
      await this.admin.updateUser(user, id, input, metadata),
    );
  }

  @Patch('users/:id/activate')
  @RequirePermissions('admin.users.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Activate a user' })
  async activateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User activated',
      await this.admin.activateUser(user, id, metadata),
    );
  }

  @Patch('users/:id/deactivate')
  @RequirePermissions('admin.users.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Deactivate a user and revoke active sessions' })
  async deactivateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User deactivated',
      await this.admin.deactivateUser(user, id, metadata),
    );
  }

  @Patch('users/:id/role')
  @RequirePermissions('admin.users.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignUserRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: AssignAdminUserRoleDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User role assigned',
      await this.admin.assignUserRole(user, id, input, metadata),
    );
  }

  @Patch('users/:id/department')
  @RequirePermissions('admin.users.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Assign a department to a user' })
  async assignUserDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: AssignAdminUserDepartmentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User department assigned',
      await this.admin.assignUserDepartment(user, id, input, metadata),
    );
  }

  @Get('roles')
  @RequirePermissions('admin.roles.manage')
  @ApiOperation({ summary: 'List roles with permissions and user counts' })
  async roles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminActiveQueryDto,
  ) {
    return apiResponse(
      'Admin roles retrieved',
      await this.admin.roles(user, query),
    );
  }

  @Post('roles')
  @RequirePermissions('admin.roles.manage')
  @ApiOperation({ summary: 'Create an organization role' })
  async createRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAdminRoleDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Role created',
      await this.admin.createRole(user, input, metadata),
    );
  }

  @Patch('roles/:id')
  @RequirePermissions('admin.roles.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update an organization role' })
  async updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateAdminRoleDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Role updated',
      await this.admin.updateRole(user, id, input, metadata),
    );
  }

  @Patch('roles/:id/permissions')
  @RequirePermissions('admin.roles.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({
    summary: 'Replace permissions assigned to an organization role',
  })
  async updateRolePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateAdminRolePermissionsDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Role permissions updated',
      await this.admin.updateRolePermissions(user, id, input, metadata),
    );
  }

  @Get('permissions')
  @RequirePermissions('admin.permissions.view')
  @ApiOperation({ summary: 'List all permissions grouped by module metadata' })
  async permissions(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Admin permissions retrieved',
      await this.admin.permissions(user),
    );
  }

  @Get('permissions/matrix')
  @RequirePermissions('admin.permissions.view')
  @ApiOperation({ summary: 'Get role-permission matrix' })
  async permissionMatrix(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Permission matrix retrieved',
      await this.admin.permissionMatrix(user),
    );
  }

  @Get('document-types')
  @RequirePermissions('admin.documentTypes.manage')
  @ApiOperation({ summary: 'List document types' })
  async documentTypes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminActiveQueryDto,
  ) {
    return apiResponse(
      'Document types retrieved',
      await this.admin.documentTypes(user, query),
    );
  }

  @Post('document-types')
  @RequirePermissions('admin.documentTypes.manage')
  @ApiOperation({ summary: 'Create a document type' })
  async createDocumentType(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAdminDocumentTypeDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Document type created',
      await this.admin.createDocumentType(user, input, metadata),
    );
  }

  @Patch('document-types/:id')
  @RequirePermissions('admin.documentTypes.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update a document type' })
  async updateDocumentType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateAdminDocumentTypeDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Document type updated',
      await this.admin.updateDocumentType(user, id, input, metadata),
    );
  }

  @Patch('document-types/:id/workflow')
  @RequirePermissions('admin.documentTypes.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Assign default workflow for a document type' })
  async assignDocumentTypeWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: AssignDocumentTypeWorkflowDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Document type workflow assigned',
      await this.admin.assignDocumentTypeWorkflow(user, id, input, metadata),
    );
  }

  @Get('workflow-assignments')
  @RequirePermissions('admin.workflowAssignments.manage')
  @ApiOperation({
    summary: 'List workflow assignments and document type coverage',
  })
  async workflowAssignments(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Workflow assignment configuration retrieved',
      await this.admin.workflowAssignments(user),
    );
  }

  @Get('system-settings')
  @RequirePermissions('admin.systemSettings.manage')
  @ApiOperation({ summary: 'Get safe system settings' })
  async systemSettings(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'System settings retrieved',
      await this.admin.systemSettings(user),
    );
  }

  @Patch('system-settings')
  @RequirePermissions('admin.systemSettings.manage')
  @ApiOperation({ summary: 'Update safe system settings' })
  async updateSystemSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateSystemSettingsDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'System settings updated',
      await this.admin.updateSystemSettings(user, input, metadata),
    );
  }

  @Get('audit-log')
  @RequirePermissions('admin.audit.view')
  @ApiOperation({ summary: 'List administrative audit entries' })
  async auditLog(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminAuditQueryDto,
  ) {
    return apiResponse(
      'Audit log retrieved',
      await this.admin.auditLog(user, query),
    );
  }

  @Get('pilot-readiness')
  @RequirePermissions('admin.pilotReadiness.view')
  @ApiOperation({ summary: 'Get pilot readiness checklist' })
  async pilotReadiness(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Pilot readiness checklist retrieved',
      await this.admin.pilotReadiness(user),
    );
  }

  @Get('production-readiness')
  @RequirePermissions('admin.systemSettings.manage')
  @ApiOperation({ summary: 'Get safe production readiness checklist' })
  async productionReadiness(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Production readiness checklist retrieved',
      await this.admin.productionReadiness(user),
    );
  }

  @Get('system-health')
  @RequirePermissions('admin.systemSettings.manage')
  @ApiOperation({ summary: 'Get safe system health summary' })
  async systemHealth() {
    return apiResponse(
      'System health retrieved',
      await this.admin.systemHealth(),
    );
  }

  @Get('pilot-deployment')
  @RequirePermissions('pilot.deployment.view')
  @ApiOperation({ summary: 'Get Sprint 8 pilot deployment control summary' })
  async pilotDeployment(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Pilot deployment summary retrieved',
      await this.admin.pilotDeployment(user),
    );
  }

  @Get('demo-credentials')
  @RequirePermissions('pilot.deployment.view')
  @ApiOperation({ summary: 'Get safe demo credential handover summary' })
  async demoCredentials(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Demo credential summary retrieved',
      await this.admin.demoCredentials(user),
    );
  }

  @Get('pilot-setup-pack')
  @RequirePermissions('pilot.deployment.view')
  @ApiOperation({ summary: 'Get pilot setup pack readiness items' })
  async pilotSetupPack(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Pilot setup pack retrieved',
      await this.admin.pilotSetupPack(user),
    );
  }

  @Get('feedback')
  @RequirePermissions('pilot.feedback.view')
  @ApiOperation({ summary: 'List pilot user feedback' })
  async feedback(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PilotFeedbackQueryDto,
  ) {
    return apiResponse(
      'Pilot feedback retrieved',
      await this.admin.feedback(user, query),
    );
  }

  @Patch('feedback/:id')
  @RequirePermissions('pilot.feedback.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update pilot feedback status or admin note' })
  async updateFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdatePilotFeedbackDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Pilot feedback updated',
      await this.admin.updateFeedback(user, id, input, metadata),
    );
  }

  @Get('pilot-issues')
  @RequirePermissions('pilot.issues.manage')
  @ApiOperation({ summary: 'List pilot trial issue tracker records' })
  async pilotIssues(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PilotIssueQueryDto,
  ) {
    return apiResponse(
      'Pilot issues retrieved',
      await this.admin.pilotIssues(user, query),
    );
  }

  @Post('pilot-issues')
  @RequirePermissions('pilot.issues.manage')
  @ApiOperation({ summary: 'Create a pilot trial issue tracker record' })
  async createPilotIssue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePilotIssueDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Pilot issue created',
      await this.admin.createPilotIssue(user, input, metadata),
    );
  }

  @Patch('pilot-issues/:id')
  @RequirePermissions('pilot.issues.manage')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update a pilot trial issue tracker record' })
  async updatePilotIssue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdatePilotIssueDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Pilot issue updated',
      await this.admin.updatePilotIssue(user, id, input, metadata),
    );
  }

  @Get('onboarding-checklist')
  @RequirePermissions('pilot.deployment.view')
  @ApiOperation({ summary: 'Get current admin onboarding checklist' })
  async onboardingChecklist(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Admin onboarding checklist retrieved',
      await this.admin.onboardingChecklist(user),
    );
  }

  @Post('onboarding-checklist/:key/complete')
  @RequirePermissions('pilot.deployment.view')
  @ApiParam({ name: 'key' })
  @ApiOperation({ summary: 'Mark an admin onboarding checklist item complete' })
  async completeOnboardingItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Admin onboarding checklist updated',
      await this.admin.completeOnboardingItem(user, key, metadata),
    );
  }
}
