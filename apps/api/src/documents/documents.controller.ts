import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import {
  CurrentRequestMetadata,
  RequestMetadata,
} from '../common/request-metadata.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentSearchDto } from './dto/document-search.dto';
import {
  DocumentActionNoteDto,
  RouteDocumentDto,
} from './dto/route-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('documents')
  @RequirePermissions('documents.read')
  @ApiOperation({ summary: 'Search and list documents' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DocumentSearchDto,
  ) {
    return apiResponse(
      'Documents retrieved',
      await this.documents.list(user, query),
    );
  }

  @Get('documents/:id')
  @RequirePermissions('documents.read')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({
    summary: 'Get document details, attachments, routes, and timeline',
  })
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return apiResponse(
      'Document retrieved',
      await this.documents.get(user, id),
    );
  }

  @Post('documents')
  @RequirePermissions('documents.write')
  @ApiOperation({ summary: 'Create a draft document' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateDocumentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Draft document created',
      await this.documents.create(user, input, metadata),
    );
  }

  @Patch('documents/:id')
  @RequirePermissions('documents.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Edit a draft document' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateDocumentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Document updated',
      await this.documents.update(user, id, input, metadata),
    );
  }

  @Delete('documents/:id')
  @RequirePermissions('documents.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Delete a draft or archive a submitted document' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    await this.documents.remove(user, id, metadata);
    return apiResponse('Document removed', null);
  }

  @Post('documents/:id/submit')
  @RequirePermissions('documents.route')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Submit a draft document' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: DocumentActionNoteDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Document submitted',
      await this.documents.submit(user, id, input, metadata),
    );
  }

  @Post('documents/:id/forward')
  @RequirePermissions('documents.route')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Forward a document to another department' })
  async forward(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: RouteDocumentDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Document forwarded',
      await this.documents.forward(user, id, input, metadata),
    );
  }

  @Post('documents/:id/return')
  @RequirePermissions('documents.route')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Return a document to the sender department' })
  async returnDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: DocumentActionNoteDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Document returned',
      await this.documents.return(user, id, input, metadata),
    );
  }

  @Post('documents/:id/receive')
  @RequirePermissions('documents.route')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Mark a routed document as received' })
  async receive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: DocumentActionNoteDto,
  ) {
    return apiResponse(
      'Document received',
      await this.documents.receive(user, id, input),
    );
  }

  @Get('inbox')
  @RequirePermissions('documents.read')
  @ApiOperation({ summary: 'View routed documents assigned to my department' })
  async inbox(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse('Inbox retrieved', await this.documents.inbox(user));
  }

  @Get('sent')
  @RequirePermissions('documents.read')
  @ApiOperation({ summary: 'View sent documents' })
  async sent(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(
      'Sent documents retrieved',
      await this.documents.sent(user),
    );
  }

  @Get('drafts')
  @RequirePermissions('documents.read')
  @ApiOperation({ summary: 'View my draft documents' })
  async drafts(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse('Drafts retrieved', await this.documents.drafts(user));
  }

  @Get('archive')
  @RequirePermissions('documents.read')
  @ApiOperation({ summary: 'View archived documents' })
  async archive(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse('Archive retrieved', await this.documents.archive(user));
  }
}
