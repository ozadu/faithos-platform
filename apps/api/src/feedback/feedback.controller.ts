import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminService } from '../admin/admin.service';
import { CreatePilotFeedbackDto } from '../admin/dto/pilot-trial.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly admin: AdminService) {}

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
