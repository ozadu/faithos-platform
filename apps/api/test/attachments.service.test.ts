import 'reflect-metadata';

import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma.service';
import { AttachmentsService } from '../src/attachments/attachments.service';

const principal = {
  id: 'user-id',
  organizationId: 'org-id',
  roleId: null,
  sessionId: 'session-id',
};

it('rejects unsupported attachment MIME types', async () => {
  const service = new AttachmentsService({} as PrismaService);

  await assert.rejects(
    () =>
      service.upload(principal, 'document-id', {
        buffer: Buffer.from('bad'),
        mimetype: 'text/plain',
        originalname: 'notes.txt',
        size: 3,
      }),
    BadRequestException,
  );
});

it('stores valid attachments locally and persists metadata', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'faithos-docroute-'));
  process.env.ATTACHMENT_STORAGE_DIR = storageRoot;
  let storagePath = '';
  const prisma = {
    document: {
      findFirst: async () => ({
        id: 'document-id',
        organizationId: principal.organizationId,
      }),
    },
    documentAttachment: {
      create: async ({ data }: { data: { storagePath: string } }) => {
        storagePath = data.storagePath;
        return { id: 'attachment-id', ...data };
      },
    },
  } as unknown as PrismaService;
  const service = new AttachmentsService(prisma);

  const result = await service.upload(principal, 'document-id', {
    buffer: Buffer.from('%PDF-1.7'),
    mimetype: 'application/pdf',
    originalname: 'brief.pdf',
    size: 8,
  });

  assert.equal(result.fileName, 'brief.pdf');
  assert.equal(await readFile(storagePath, 'utf8'), '%PDF-1.7');
});
