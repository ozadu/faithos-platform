import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { PERMISSIONS_KEY } from '../src/auth/permissions.decorator';
import { AdminController } from '../src/admin/admin.controller';
import { AdminService } from '../src/admin/admin.service';

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

function adminService(prisma: Record<string, unknown>) {
  const recorded = audit();
  const service = new AdminService(
    prisma as never,
    recorded.service as never,
    { send: async () => ({ skipped: false }) } as never,
  );
  return { entries: recorded.entries, service };
}

function organization() {
  return {
    address: '1 Church Road',
    country: 'Nigeria',
    email: 'admin@example.org',
    id: 'org-1',
    name: 'FaithOS Pilot Church',
    phone: '+2348000000000',
    slug: 'faithos-pilot',
    timezone: 'Africa/Lagos',
  };
}

async function withEnv<T>(
  env: Record<string, string | undefined>,
  run: () => Promise<T>,
): Promise<T> {
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
    return await run();
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

it('builds pilot readiness checklist from derived state and manual acknowledgements', async () => {
  await withEnv(
    {
      APP_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://localhost/faithos',
      NODE_ENV: 'development',
      REDIS_URL: 'redis://localhost:6379',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
    },
    async () => {
      const { service } = adminService({
        department: { count: async () => 3 },
        organization: { findUniqueOrThrow: async () => organization() },
        pilotFeedback: { count: async () => 2 },
        role: { count: async () => 3 },
        systemSetting: {
          findMany: async () => [
            {
              key: 'pilot.v090.checklist.mailSettingsVerified',
              value: { acknowledged: true },
            },
            {
              key: 'pilot.v090.checklist.backupTested',
              value: { acknowledged: true },
            },
            {
              key: 'pilot.v090.checklist.restoreTested',
              value: { acknowledged: true },
            },
            {
              key: 'pilot.v090.checklist.uatCompleted',
              value: { acknowledged: true },
            },
          ],
        },
        user: {
          count: async ({ where }: { where: Record<string, unknown> }) => {
            if ('role' in where) return 1;
            if (where.roleId === null) return 0;
            if (where.departmentId === null) return 0;
            if (where.status === 'ACTIVE') return 5;
            return 5;
          },
        },
      });

      const checklist = await service.pilotChecklist(principal);

      assert.equal(checklist.complete, true);
      assert.equal(
        checklist.items.some(
          (item) => item.id === 'backupTested' && item.complete,
        ),
        true,
      );
    },
  );
});

it('updates a manual checklist acknowledgement and records audit history', async () => {
  const upserts: unknown[] = [];
  const { entries, service } = adminService({
    department: { count: async () => 1 },
    organization: { findUniqueOrThrow: async () => organization() },
    pilotFeedback: { count: async () => 0 },
    role: { count: async () => 1 },
    systemSetting: {
      findMany: async () => [],
      upsert: async (input: unknown) => {
        upserts.push(input);
        return {};
      },
    },
    user: { count: async () => 1 },
  });

  await service.updatePilotChecklistItem(
    principal,
    'backupTested',
    { acknowledged: true, note: 'Dry-run completed.' },
    {},
  );

  assert.equal(upserts.length, 1);
  assert.equal(
    (entries.at(-1) as { action: string }).action,
    'pilot.checklist.updated',
  );
});

it('reports deployment readiness without exposing secret values', async () => {
  await withEnv(
    {
      APP_URL: 'https://faithos.example.org',
      JWT_REFRESH_SECRET: 'another-safe-secret-value',
      JWT_SECRET: 'super-safe-secret-value',
    },
    async () => {
      const { service } = adminService({
        $queryRaw: async () => [{ ok: 1 }],
        organization: { findUniqueOrThrow: async () => organization() },
        user: { count: async () => 1 },
      });

      const readiness = await service.deploymentReadiness(principal);
      const json = JSON.stringify(readiness);

      assert.equal(json.includes('super-safe-secret-value'), false);
      assert.equal(
        readiness.checks.some(
          (check) => check.label === 'JWT secret safety check',
        ),
        true,
      );
    },
  );
});

it('protects permission audit endpoint with admin permissions metadata', () => {
  const required = Reflect.getMetadata(
    PERMISSIONS_KEY,
    AdminController.prototype.permissionAudit,
  );

  assert.deepEqual(required, ['admin.permissions.view']);
});

it('builds user onboarding readiness records without password hashes', async () => {
  const { service } = adminService({
    user: {
      findMany: async () => [
        {
          createdAt: new Date(),
          department: null,
          departmentId: null,
          email: 'staff@example.org',
          firstName: 'Staff',
          id: 'user-1',
          lastLoginAt: null,
          lastName: 'Member',
          role: null,
          roleId: null,
          status: 'ACTIVE',
        },
      ],
    },
  });

  const readiness = await service.userOnboardingReadiness(principal);

  assert.equal(readiness.usersWithoutRole.length, 1);
  assert.equal(JSON.stringify(readiness).includes('passwordHash'), false);
});

it('builds permission audit warnings for non-admin sensitive access', async () => {
  const { service } = adminService({
    role: {
      findMany: async () => [
        {
          _count: { users: 2 },
          id: 'role-1',
          isSystem: false,
          name: 'Secretary',
          rolePermissions: [
            {
              permission: {
                code: 'admin.users.manage',
                displayName: 'Manage users',
                id: 'permission-1',
                module: 'admin',
              },
            },
          ],
        },
      ],
    },
  });

  const audit = await service.permissionAudit(principal);

  assert.equal(audit.roles[0]?.sensitivePermissions.length, 1);
  assert.equal(audit.roles[0]?.excessivePermissionsWarning.length > 0, true);
});

it('updates feedback to v0.9.0 triage statuses', async () => {
  const updates: unknown[] = [];
  const { service } = adminService({
    pilotFeedback: {
      findFirst: async () => ({ id: 'feedback-1' }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { id: 'feedback-1', ...data };
      },
    },
  });

  const feedback = await service.updateFeedback(
    principal,
    'feedback-1',
    { status: 'PLANNED' },
    {},
  );

  assert.deepEqual(updates[0], { status: 'PLANNED' });
  assert.equal((feedback as { status: string }).status, 'PLANNED');
});

it('blocks demo seed in production-like pilot checklist state', async () => {
  await withEnv({ ENABLE_DEMO_SEED: 'true', NODE_ENV: 'pilot' }, async () => {
    const { service } = adminService({
      department: { count: async () => 1 },
      organization: { findUniqueOrThrow: async () => organization() },
      pilotFeedback: { count: async () => 0 },
      role: { count: async () => 1 },
      systemSetting: { findMany: async () => [] },
      user: { count: async () => 1 },
    });

    const checklist = await service.pilotChecklist(principal);
    const demoSeed = checklist.items.find(
      (item) => item.id === 'demoSeedDisabled',
    );

    assert.equal(demoSeed?.complete, false);
    assert.equal(demoSeed?.status, 'BLOCKED');
  });
});
