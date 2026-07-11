import 'reflect-metadata';

import { BadRequestException, ConflictException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { AdminService } from '../src/admin/admin.service';
import { AuthService } from '../src/auth/auth.service';
import { EnvironmentService } from '../src/config/environment.service';
import { AppController } from '../src/app.controller';
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

function withEnv<T>(env: Record<string, string | undefined>, run: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

it('rejects incomplete production environment configuration', () => {
  withEnv(
    {
      DATABASE_URL: undefined,
      JWT_REFRESH_SECRET: 'y'.repeat(40),
      JWT_SECRET: 'x'.repeat(40),
      NODE_ENV: 'production',
      REDIS_URL: undefined,
    },
    () => {
      assert.throws(
        () => new EnvironmentService().onModuleInit(),
        /Production configuration is incomplete/,
      );
    },
  );
});

it('rejects unsafe production JWT defaults and enabled demo seed', () => {
  withEnv(
    {
      APP_URL: 'https://faithos.example.org',
      DATABASE_URL: 'postgresql://example',
      ENABLE_DEMO_SEED: 'true',
      JWT_REFRESH_SECRET: 'y'.repeat(40),
      JWT_SECRET: 'replace-with-a-long-random-secret',
      NODE_ENV: 'production',
      REDIS_URL: 'redis://example:6379',
      SMTP_HOST: 'smtp.example.org',
      SMTP_PORT: '587',
    },
    () => {
      assert.throws(
        () => new EnvironmentService().onModuleInit(),
        /JWT_SECRET uses an unsafe default/,
      );
    },
  );
});

it('defaults demo seed to disabled in production-like environments', () => {
  withEnv(
    {
      ENABLE_DEMO_SEED: undefined,
      NODE_ENV: 'production',
    },
    () => {
      assert.equal(new EnvironmentService().enableDemoSeed, false);
    },
  );
});

it('reports first-admin setup availability only before an admin exists', async () => {
  const open = setupService({ user: { count: async () => 0 } });
  const closed = setupService({ user: { count: async () => 1 } });

  assert.equal((await open.service.firstAdminStatus()).available, true);
  assert.equal((await closed.service.firstAdminStatus()).available, false);
});

it('rejects weak first-admin passwords', async () => {
  const { service } = setupService({ user: { count: async () => 0 } });

  await assert.rejects(
    service.createFirstAdmin(
      {
        email: 'admin@example.org',
        firstName: 'Ada',
        lastName: 'Okafor',
        organizationName: 'FaithOS Pilot',
        password: 'weak-password',
      },
      {},
    ),
    BadRequestException,
  );
});

it('disables first-admin creation after an admin exists', async () => {
  const { service } = setupService({ user: { count: async () => 1 } });

  await assert.rejects(
    service.createFirstAdmin(
      {
        email: 'admin@example.org',
        firstName: 'Ada',
        lastName: 'Okafor',
        organizationName: 'FaithOS Pilot',
        password: 'Strong-Password-2026!',
      },
      {},
    ),
    ConflictException,
  );
});

it('creates first organization, permissions, admin role, and public admin user', async () => {
  const created: Record<string, unknown>[] = [];
  const permissions: Array<{ id: string }> = [];
  const { entries, service } = setupService({
    $transaction: async (callback: (tx: Record<string, unknown>) => unknown) =>
      callback({
        organization: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: 'org-1',
            ...data,
          }),
          findUnique: async () => null,
        },
        permission: {
          upsert: async () => {
            const permission = { id: `permission-${permissions.length + 1}` };
            permissions.push(permission);
            return permission;
          },
        },
        role: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: 'role-1',
            ...data,
          }),
        },
        rolePermission: {
          createMany: async () => ({ count: permissions.length }),
        },
        user: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            created.push(data);
            return {
              email: data.email,
              firstName: data.firstName,
              id: 'user-1',
              lastName: data.lastName,
              organizationId: 'org-1',
              roleId: 'role-1',
              status: data.status,
            };
          },
        },
      }),
    organization: { findUnique: async () => null },
    user: {
      count: async () => 0,
      findUnique: async () => null,
    },
  });

  const result = await service.createFirstAdmin(
    {
      email: 'Admin@Example.org',
      firstName: 'Ada',
      lastName: 'Okafor',
      organizationName: 'FaithOS Pilot',
      password: 'Strong-Password-2026!',
    },
    {},
  );

  assert.equal(result.user.email, 'admin@example.org');
  assert.equal('passwordHash' in result.user, false);
  assert.equal(created.length, 1);
  assert.ok(permissions.length > 10);
  assert.equal(
    (entries.at(-1) as { action: string }).action,
    'setup.first_admin.created',
  );
});

it('submits v0.8.1 feedback shape and maps it to pilot feedback storage', async () => {
  const { service } = adminService({
    pilotFeedback: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'feedback-1',
        ...data,
      }),
    },
    user: {
      findFirst: async () => ({
        department: { name: 'Operations' },
        email: 'pilot@example.org',
        firstName: 'Pilot',
        lastName: 'User',
        role: { name: 'Staff' },
      }),
    },
  });

  const feedback = await service.submitFeedback(principal, {
    category: 'BUG',
    currentRoute: '/documents',
    description: 'The document route action was hard to understand.',
    severity: 'HIGH',
    title: 'Routing action label',
  });

  assert.equal(feedback.type, 'Bug');
  assert.equal(feedback.priority, 'High');
  assert.equal(feedback.affectedArea, '/documents');
  assert.equal(feedback.submittedByUserId, principal.id);
});

it('keeps feedback listing admin-scoped by organization filters', async () => {
  const filters: unknown[] = [];
  const { service } = adminService({
    pilotFeedback: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        filters.push(where);
        return [];
      },
    },
  });

  await service.feedback(principal, { status: 'NEW' });

  assert.deepEqual(filters[0], {
    organizationId: principal.organizationId,
    status: 'NEW',
  });
});

it('returns degraded health when Redis is not configured without exposing secrets', async () => {
  const controller = new AppController({
    $queryRaw: async () => [{ ok: 1 }],
  } as never);

  await withEnv({ REDIS_URL: undefined }, async () => {
    const health = await controller.getHealth();

    assert.equal(health.status, 'degraded');
    assert.equal(health.database.status, 'ok');
    assert.equal(health.redis.status, 'down');
    assert.equal(JSON.stringify(health).includes('JWT'), false);
  });
});

it('auth me response does not expose passwordHash', async () => {
  const service = new AuthService(
    {
      user: {
        findFirst: async () => ({
          deletedAt: null,
          email: 'admin@example.org',
          firstName: 'Ada',
          id: 'user-1',
          lastName: 'Okafor',
          organization: { id: 'org-1' },
          organizationId: 'org-1',
          passwordHash: 'secret-hash',
          role: { id: 'role-1' },
          status: 'ACTIVE',
        }),
      },
    } as never,
    {} as never,
    audit().service as never,
  );

  const response = await service.me(principal);

  assert.equal('passwordHash' in response.user, false);
});

function setupService(prisma: Record<string, unknown>) {
  const recorded = audit();
  const service = new SetupService(prisma as never, recorded.service as never);
  return { entries: recorded.entries, service };
}

function adminService(prisma: Record<string, unknown>) {
  const recorded = audit();
  const service = new AdminService(
    prisma as never,
    recorded.service as never,
    { send: async () => ({ skipped: false }) } as never,
  );
  return { entries: recorded.entries, service };
}
