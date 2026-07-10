import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard/summary')
  @RequirePermissions('dashboard.read')
  @ApiOperation({ summary: 'Get operational dashboard summary' })
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Dashboard summary retrieved',
      await this.dashboard.summary(user),
    );
  }

  @Get('dashboard/executive')
  @RequirePermissions('dashboard.read')
  @ApiOperation({ summary: 'Get executive dashboard metrics' })
  async executive(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Executive dashboard retrieved',
      await this.dashboard.executive(user),
    );
  }

  @Get('dashboard/department')
  @RequirePermissions('dashboard.read')
  @ApiOperation({ summary: 'Get current department dashboard metrics' })
  async department(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Department dashboard retrieved',
      await this.dashboard.department(user),
    );
  }

  @Get('my-work')
  @RequirePermissions('dashboard.read')
  @ApiOperation({ summary: 'Get my work aggregation' })
  async myWork(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse('My work retrieved', await this.dashboard.myWork(user));
  }
}
