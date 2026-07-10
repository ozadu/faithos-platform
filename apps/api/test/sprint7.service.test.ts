import 'reflect-metadata';

import { BadRequestException } from '@nestjs/common';
import { hash } from 'argon2';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { AdminService } from '../src/admin/admin.service';
import { AuthService } from '../src/auth/auth.service';
import { SetupService } from '../src/setup/setup.service';

const principal = {
  id: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  sessionId: 'session-1',
};

function audit() {
  const entries: unknown[] = [];
  return {
    entries,
    service: {
      record: async (entry: unknown) => {
        entries.push(entry);
      },
    },
  };
}

it('reports setup status and records completed setup steps', async () => {
  const recorded = audit();
  const settings: Array<{ key: string; value: boolean }> = [
    { key: 'setup.systemSettingsReviewed', value: true },
  ];
  const service = new SetupService(
    {
      department: { count: async () => 2 },
      documentType: { count: async () => 3 },
      organization: {
        findUniqueOrThrow: async () => ({
          email: 'hello@example.org',
          name: 'Demo Church',
          timezone: 'Africa/Lagos',
        }),
      },
      systemSetting: {
        findMany: async () => settings,
        upsert: async ({ create }: { create: { key: string } }) => {
          settings.push({ key: create.key, value: true });
        },
      },
      user: { count: async () => 1 },
      workflowAssignment: { count: async () => 3 },
    } as never,
    recorded.service as never,
  );

  const before = await service.status(principal);
  const after = await service.completeStep(principal, 'pilotReadiness', {});

  assert.equal(before.setupComplete, false);
  assert.equal(after.pilotReadinessReviewed, true);
  assert.equal(
    (recorded.entries[0] as { action: string }).action,
    'setup.step.completed',
  );
});

it('requests and completes password reset using hashed reset tokens', async () => {
  const token = 'reset-token-for-test-1234567890';
  const tokenHash = await hash(token);
  const recorded = audit();
  const transactions: unknown[] = [];
  const service = new AuthService(
    {
      $transaction: async (items: unknown[]) => {
        transactions.push(...items);
      },
      passwordResetToken: {
        create: async () => ({}),
        findMany: async () => [
          {
            id: 'token-1',
            organizationId: 'org-1',
            tokenHash,
            user: { deletedAt: null },
            userId: 'user-1',
          },
        ],
        update: () => ({}),
      },
      session: { updateMany: () => ({}) },
      user: {
        findUnique: async () => ({
          deletedAt: null,
          email: 'admin@example.org',
          id: 'user-1',
          organization: { status: 'ACTIVE' },
          organizationId: 'org-1',
          status: 'ACTIVE',
        }),
        update: () => ({}),
      },
    } as never,
    {} as never,
    recorded.service as never,
    { send: async () => ({ skipped: false }) } as never,
  );

  const request = await service.forgotPassword('ADMIN@example.org', {});
  const reset = await service.resetPassword(token, 'New-Password-2026!', {});

  assert.equal(request.emailSent, true);
  assert.equal(reset.reset, true);
  assert.equal(transactions.length, 3);
  assert.equal(
    (recorded.entries.at(-1) as { action: string }).action,
    'auth.password_reset.completed',
  );
});

it('rejects invalid password reset tokens', async () => {
  const service = new AuthService(
    { passwordResetToken: { findMany: async () => [] } } as never,
    {} as never,
    audit().service as never,
  );

  await assert.rejects(
    service.resetPassword('missing-token-1234567890', 'New-Password-2026!', {}),
    BadRequestException,
  );
});

it('previews CSV imports with validation and duplicate handling', async () => {
  const { service } = adminService({
    department: {
      findMany: async () => [{ code: 'OPS', id: 'dept-1' }],
    },
    role: { findMany: async () => [{ id: 'role-1', name: 'Standard User' }] },
    user: { findMany: async () => [{ email: 'existing@example.org' }] },
  });
  const csvText = [
    'firstName,lastName,email,departmentCode,roleName,active',
    'Ada,Okafor,ada@example.org,OPS,Standard User,true',
    'Bad,Row,not-an-email,NOPE,Missing,true',
    'Existing,User,existing@example.org,OPS,Standard User,true',
  ].join('\n');

  const preview = await service.previewUserImport(principal, {
    csvText,
    fileName: 'users.csv',
    sizeBytes: Buffer.byteLength(csvText, 'utf8'),
  });

  assert.equal(preview.summary.valid, 1);
  assert.equal(preview.summary.duplicates, 1);
  assert.equal(preview.summary.invalid, 3);
});

it('imports valid CSV users and skips duplicates', async () => {
  const created: unknown[] = [];
  const { entries, service } = adminService({
    department: {
      findMany: async () => [{ code: 'OPS', id: 'dept-1' }],
    },
    role: { findMany: async () => [{ id: 'role-1', name: 'Standard User' }] },
    user: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { email: data.email, id: 'new-user' };
      },
      findMany: async () => [{ email: 'existing@example.org' }],
    },
  });
  const csvText = [
    'firstName,lastName,email,departmentCode,roleName,active',
    'Ada,Okafor,ada@example.org,OPS,Standard User,true',
    'Existing,User,existing@example.org,OPS,Standard User,true',
  ].join('\n');

  const result = await service.importUsers(
    principal,
    {
      csvText,
      fileName: 'users.csv',
      sizeBytes: Buffer.byteLength(csvText, 'utf8'),
    },
    {},
  );

  assert.equal(result.created.length, 1);
  assert.equal(result.skipped.length, 1);
  assert.equal(created.length, 1);
  assert.equal(
    (entries.at(-1) as { action: string }).action,
    'admin.users.import.completed',
  );
});

it('builds production readiness without exposing secret values', async () => {
  process.env.JWT_SECRET = 'x'.repeat(40);
  process.env.JWT_REFRESH_SECRET = 'y'.repeat(40);
  process.env.DATABASE_URL = 'postgresql://example';
  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '1025';
  process.env.WEB_URL = 'https://faithos.example.org';
  const { service } = adminService({
    organization: {
      findUniqueOrThrow: async () => ({ email: 'admin@example.org' }),
    },
    user: { count: async () => 1 },
  });

  const readiness = await service.productionReadiness(principal);

  assert.equal(
    readiness.items.some((item) => item.label.includes('JWT')),
    true,
  );
  assert.equal(
    JSON.stringify(readiness).includes(process.env.JWT_SECRET),
    false,
  );
});

it('reports safe system health statuses', async () => {
  process.env.REDIS_URL = '';
  const { service } = adminService({
    $queryRaw: async () => [{ '?column?': 1 }],
  });

  const health = await service.systemHealth();

  assert.equal((health.database as { healthy: boolean }).healthy, true);
  assert.equal((health.redis as { healthy: boolean }).healthy, false);
});

function adminService(prisma: Record<string, unknown>) {
  const recorded = audit();
  const service = new AdminService(
    prisma as never,
    recorded.service as never,
    { send: async () => ({ skipped: false }) } as never,
  );
  return { entries: recorded.entries, service };
}
