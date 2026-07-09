import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { DocumentStatus } from '@faithos/database';

import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/database/prisma.service';
import { DocumentsService } from '../src/documents/documents.service';

const principal = {
  id: 'user-id',
  organizationId: 'org-id',
  roleId: null,
  sessionId: 'session-id',
};

it('generates reference numbers using DOC-YYYY-000001 format', async () => {
  const prisma = {
    document: {
      findFirst: async () => ({ referenceNumber: 'DOC-2026-000009' }),
    },
  } as unknown as PrismaService;
  const service = new DocumentsService(prisma, {} as AuditService);

  assert.equal(
    await service.generateReferenceNumber(new Date('2026-07-09T00:00:00.000Z')),
    'DOC-2026-000010',
  );
});

it('starts a new year reference sequence at 000001', async () => {
  const prisma = {
    document: {
      findFirst: async () => null,
    },
  } as unknown as PrismaService;
  const service = new DocumentsService(prisma, {} as AuditService);

  assert.equal(
    await service.generateReferenceNumber(new Date('2027-01-01T00:00:00.000Z')),
    'DOC-2027-000001',
  );
});

it('forwards a document to another department and records route history', async () => {
  const calls: string[] = [];
  const existing = {
    attachments: [],
    body: 'Body',
    category: 'Finance',
    confidentiality: 'INTERNAL',
    createdAt: new Date(),
    createdBy: principal.id,
    currentDepartment: { id: 'from-dept', name: 'Finance' },
    currentDepartmentId: 'from-dept',
    id: 'document-id',
    owner: {
      email: 'owner@example.com',
      firstName: 'Owner',
      id: principal.id,
      lastName: 'User',
    },
    ownerUserId: principal.id,
    priority: 'NORMAL',
    referenceNumber: 'DOC-2026-000001',
    routes: [],
    senderDepartment: { id: 'from-dept', name: 'Finance' },
    senderDepartmentId: 'from-dept',
    status: DocumentStatus.SUBMITTED,
    subject: 'Subject',
    timeline: [],
    title: 'Title',
    updatedAt: new Date(),
    updatedBy: principal.id,
  };
  const updated = {
    ...existing,
    currentDepartmentId: 'to-dept',
    status: DocumentStatus.FORWARDED,
  };
  const tx = {
    document: {
      update: async () => {
        calls.push('document.update');
        return updated;
      },
    },
    documentRoute: {
      create: async () => {
        calls.push('route.create');
      },
    },
    documentTimelineEvent: {
      create: async () => {
        calls.push('timeline.create');
      },
    },
  };
  const prisma = {
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    department: {
      findFirst: async () => ({ id: 'to-dept' }),
    },
    document: {
      findFirst: async () => existing,
    },
    user: {
      findFirst: async () => ({ departmentId: 'from-dept', id: principal.id }),
    },
  } as unknown as PrismaService;
  const service = new DocumentsService(prisma, {
    record: async () => {
      calls.push('audit.record');
    },
  } as unknown as AuditService);

  const result = await service.forward(
    principal,
    'document-id',
    { departmentId: 'to-dept', note: 'Please review' },
    {},
  );

  assert.equal(result.status, DocumentStatus.FORWARDED);
  assert.deepEqual(calls, [
    'document.update',
    'route.create',
    'timeline.create',
    'audit.record',
  ]);
});
