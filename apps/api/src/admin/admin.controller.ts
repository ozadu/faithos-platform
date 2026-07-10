import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
}
