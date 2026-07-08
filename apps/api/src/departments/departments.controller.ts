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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermissions('departments.read')
  @ApiOperation({ summary: 'List departments in the current organization' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Departments retrieved',
      await this.departments.list(user.organizationId),
    );
  }

  @Post()
  @RequirePermissions('departments.write')
  @ApiOperation({ summary: 'Create a department' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateDepartmentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Department created',
      await this.departments.create(user, input, metadata),
    );
  }

  @Patch(':id')
  @RequirePermissions('departments.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Update a department' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateDepartmentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Department updated',
      await this.departments.update(user, id, input, metadata),
    );
  }

  @Delete(':id')
  @RequirePermissions('departments.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Soft-delete a department' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.departments.remove(user.organizationId, id);
    return apiResponse('Department deleted', null);
  }
}
