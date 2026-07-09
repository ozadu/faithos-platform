import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { RawResponse } from '../common/raw-response.decorator';
import {
  AttachmentsService,
  UploadedDocumentFile,
} from './attachments.service';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('documents/:id/attachments')
  @RequirePermissions('documents.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      properties: { file: { format: 'binary', type: 'string' } },
      required: ['file'],
      type: 'object',
    },
  })
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Upload a local document attachment' })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') documentId: string,
    @UploadedFile() file?: UploadedDocumentFile,
  ) {
    return apiResponse(
      'Attachment uploaded',
      await this.attachments.upload(user, documentId, file),
    );
  }

  @Get('attachments/:id/download')
  @RequirePermissions('documents.read')
  @RawResponse()
  @Header('Cache-Control', 'private, max-age=0')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Download an attachment' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true })
    response: {
      setHeader(name: string, value: string): void;
    },
  ) {
    const { attachment, file } = await this.attachments.download(user, id);
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.fileName.replaceAll('"', '')}"`,
    );
    return file;
  }

  @Delete('attachments/:id')
  @RequirePermissions('documents.write')
  @ApiParam({ format: 'uuid', name: 'id' })
  @ApiOperation({ summary: 'Delete an attachment and its local file' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.attachments.remove(user, id);
    return apiResponse('Attachment deleted', null);
  }
}
