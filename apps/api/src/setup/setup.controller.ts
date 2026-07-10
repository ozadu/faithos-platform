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
import { CompleteSetupStepDto, SetupOrganizationDto } from './dto/setup.dto';
import { SetupService } from './setup.service';

@ApiTags('Setup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status')
  @RequirePermissions('admin.access')
  @ApiOperation({ summary: 'Get first-run setup completion status' })
  async status(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse('Setup status retrieved', await this.setup.status(user));
  }

  @Post('complete-step')
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
