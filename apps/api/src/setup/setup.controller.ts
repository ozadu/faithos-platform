import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

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
import {
  CompleteSetupStepDto,
  CreateFirstAdminDto,
  SetupOrganizationDto,
} from './dto/setup.dto';
import { SetupService } from './setup.service';

@ApiTags('Setup')
@ApiBearerAuth()
@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('first-admin/status')
  @ApiOperation({ summary: 'Check whether first-admin setup is available' })
  async firstAdminStatus() {
    return apiResponse(
      'First admin setup status retrieved',
      await this.setup.firstAdminStatus(),
    );
  }

  @Post('first-admin')
  @ApiOperation({
    summary: 'Create the first organization and administrator if none exists',
  })
  async createFirstAdmin(
    @Body() input: CreateFirstAdminDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'First administrator created',
      await this.setup.createFirstAdmin(input, metadata),
    );
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('admin.access')
  @ApiOperation({ summary: 'Get first-run setup completion status' })
  async status(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse('Setup status retrieved', await this.setup.status(user));
  }

  @Post('complete-step')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('admin.access')
  @ApiOperation({ summary: 'Mark a first-run setup step as reviewed' })
  async completeStep(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CompleteSetupStepDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Setup step completed',
      await this.setup.completeStep(user, input.step, metadata),
    );
  }

  @Patch('organization')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('admin.organization.manage')
  @ApiOperation({ summary: 'Update basic organization setup fields' })
  async updateOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: SetupOrganizationDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Setup organization updated',
      await this.setup.updateOrganization(user, input, metadata),
    );
  }
}
