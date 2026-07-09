import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { AuthenticatedUser } from '../common/authenticated-user';
import { PrismaService } from '../database/prisma.service';

export interface UploadedDocumentFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const maxAttachmentBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
]);
const allowedExtensions = new Set([
  '.pdf',
  '.docx',
  '.xlsx',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
]);

@Injectable()
export class AttachmentsService {
  private readonly storageRoot =
    process.env.ATTACHMENT_STORAGE_DIR ??
    resolve(process.cwd(), 'storage', 'attachments');

  constructor(private readonly prisma: PrismaService) {}

  async upload(
    principal: AuthenticatedUser,
    documentId: string,
    file?: UploadedDocumentFile,
  ) {
    if (!file) throw new BadRequestException('Attachment file is required');
    this.validate(file);

    const document = await this.prisma.document.findFirst({
      select: { id: true, organizationId: true },
      where: { id: documentId, organizationId: principal.organizationId },
    });
    if (!document) throw new NotFoundException('Document not found');

    const directory = join(
      this.storageRoot,
      principal.organizationId,
      documentId,
    );
    await mkdir(directory, { recursive: true });

    const extension = extname(file.originalname).toLowerCase();
    const storedFileName = `${randomUUID()}${extension}`;
    const storagePath = join(directory, storedFileName);
    await writeFile(storagePath, file.buffer);

    return this.prisma.documentAttachment.create({
      data: {
        documentId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        organizationId: principal.organizationId,
        sizeBytes: file.size,
        storagePath,
        storedFileName,
        uploadedBy: principal.id,
      },
      select: {
        createdAt: true,
        documentId: true,
        fileName: true,
        id: true,
        mimeType: true,
        sizeBytes: true,
        uploadedBy: true,
      },
    });
  }

  async download(principal: AuthenticatedUser, attachmentId: string) {
    const attachment = await this.prisma.documentAttachment.findFirst({
      where: { id: attachmentId, organizationId: principal.organizationId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    return {
      attachment,
      file: new StreamableFile(createReadStream(attachment.storagePath)),
    };
  }

  async remove(
    principal: AuthenticatedUser,
    attachmentId: string,
  ): Promise<void> {
    const attachment = await this.prisma.documentAttachment.findFirst({
      where: { id: attachmentId, organizationId: principal.organizationId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.prisma.documentAttachment.delete({
      where: { id: attachmentId },
    });
    await unlink(attachment.storagePath).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      },
    );
  }

  private validate(file: UploadedDocumentFile): void {
    const extension = extname(file.originalname).toLowerCase();
    if (
      !allowedExtensions.has(extension) ||
      !allowedMimeTypes.has(file.mimetype)
    ) {
      throw new BadRequestException(
        'Unsupported attachment type. Use pdf, docx, xlsx, pptx, jpg, or png.',
      );
    }
    if (file.size > maxAttachmentBytes) {
      throw new BadRequestException('Attachment must be 10MB or smaller');
    }
  }
}
