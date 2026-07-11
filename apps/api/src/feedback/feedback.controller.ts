import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminService } from '../admin/admin.service';
import {
  CreatePilotFeedbackDto,
  PilotFeedbackQueryDto,
} from '../admin/dto/pilot-trial.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermissions('pilot.feedback.view')
  @ApiOperation({ summary: 'List pilot feedback for administrators' })
  async feedback(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PilotFeedbackQueryDto,
  ) {
    return apiResponse(
      'Pilot feedback retrieved',
      await this.admin.feedback(user, query),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Submit pilot feedback from an authenticated user' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePilotFeedbackDto,
  ) {
    return apiResponse(
      'Pilot feedback submitted',
      await this.admin.submitFeedback(user, input),
    );
  }
}
