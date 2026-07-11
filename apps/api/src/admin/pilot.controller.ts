import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
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
import { UpdatePilotChecklistItemDto } from './dto/pilot-trial.dto';

@ApiTags('Pilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('pilot')
export class PilotController {
  constructor(private readonly admin: AdminService) {}

  @Get('readiness')
  @RequirePermissions('admin.pilotReadiness.view')
  @ApiOperation({ summary: 'Get pilot release-candidate readiness summary' })
  async readiness(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Pilot readiness retrieved',
      await this.admin.pilotChecklist(user),
    );
  }

  @Get('checklist')
  @RequirePermissions('admin.pilotReadiness.view')
  @ApiOperation({ summary: 'Get pilot release-candidate setup checklist' })
  async checklist(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Pilot checklist retrieved',
      await this.admin.pilotChecklist(user),
    );
  }

  @Patch('checklist/:id')
  @RequirePermissions('admin.pilotReadiness.view')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Acknowledge a manually verified checklist item' })
  async updateChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdatePilotChecklistItemDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Pilot checklist updated',
      await this.admin.updatePilotChecklistItem(user, id, input, metadata),
    );
  }
}
