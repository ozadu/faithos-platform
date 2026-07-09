import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List users in the current organization' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Users retrieved',
      await this.users.list(user.organizationId),
    );
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Get a user in the current organization' })
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return apiResponse(
      'User retrieved',
      await this.users.get(user.organizationId, id),
    );
  }

  @Post()
  @RequirePermissions('users.write')
  @ApiOperation({ summary: 'Create an active user with a temporary password' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateUserDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User created',
      await this.users.create(user, input, metadata),
    );
  }

  @Patch(':id')
  @RequirePermissions('users.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update a user' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateUserDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'User updated',
      await this.users.update(user, id, input, metadata),
    );
  }

  @Delete(':id')
  @RequirePermissions('users.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Soft-delete a user and revoke active sessions' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.users.remove(user.organizationId, id);
    return apiResponse('User deleted', null);
  }
}
