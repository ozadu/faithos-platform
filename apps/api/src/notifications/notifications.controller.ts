import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'List visible notifications for the current user' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ) {
    return apiResponse(
      'Notifications retrieved',
      await this.notifications.list(user, query),
    );
  }

  @Get('unread-count')
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Unread notification count retrieved',
      await this.notifications.unreadCount(user),
    );
  }

  @Patch('read-all')
  @RequirePermissions('notifications.write')
  @ApiOperation({ summary: 'Mark all visible notifications as read' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Notifications marked read',
      await this.notifications.markAllRead(user),
    );
  }

  @Patch(':id/read')
  @RequirePermissions('notifications.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return apiResponse(
      'Notification marked read',
      await this.notifications.markRead(user, id),
    );
  }

  @Delete(':id')
  @RequirePermissions('notifications.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Delete a visible notification' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return apiResponse(
      'Notification deleted',
      await this.notifications.remove(user, id),
    );
  }
}
