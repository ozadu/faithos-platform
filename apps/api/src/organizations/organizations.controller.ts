import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('current')
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'Get the current organization' })
  async current(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Organization retrieved',
      await this.organizations.current(user.organizationId),
    );
  }

  @Patch('current')
  @RequirePermissions('organizations.write')
  @ApiOperation({ summary: 'Update the current organization' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateOrganizationDto,
  ) {
    return apiResponse(
      'Organization updated',
      await this.organizations.update(user.organizationId, input),
    );
  }
}
