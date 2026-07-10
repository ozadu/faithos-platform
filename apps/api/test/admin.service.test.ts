import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Reflector } from '@nestjs/core';

import { AdminService } from '../src/admin/admin.service';
import { PermissionGuard } from '../src/auth/permission.guard';

const principal = {
  id: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  sessionId: 'session-1',
};

function admin(prisma: Record<string, unknown>) {
  const entries: unknown[] = [];
  const service = new AdminService(
    prisma as never,
    {
      record: async (entry: unknown) => {
        entries.push(entry);
      },
    } as never,
  );
  return { entries, service };
}

it('builds admin dashboard summary and pilot checklist counts', async () => {
  const { service } = admin({
    auditLog: { findMany: async () => [{ action: 'admin.user.created' }] },
    department: { count: async () => 4 },
    documentType: { count: async () => 6 },
    organization: {
      findUniqueOrThrow: async () => ({
        address: 'Demo Campus',
        email: 'hello@example.com',
        name: 'Demo',
        phone: '123',
        timezone: 'Africa/Lagos',
      }),
    },
    role: { count: async () => 4 },
    rolePermission: { count: async () => 1 },
    user: {
      count: async ({ where }: { where: { status?: string } }) =>
        where.status === 'ACTIVE' ? 5 : 6,
      findFirst: async () => ({ id: 'admin-user' }),
    },
    workflowAssignment: { count: async () => 6 },
    workflowNotification: { count: async () => 2 },
  });

  const summary = await service.summary(principal);

  assert.equal(summary.counts.totalUsers, 6);
  assert.equal(summary.counts.activeUsers, 5);
  assert.equal(summary.counts.incompletePilotChecklistItems, 0);
});

it('updates organization settings and records an audit entry', async () => {
  const { entries, service } = admin({
    organization: {
      findUniqueOrThrow: async () => ({
        email: 'old@example.com',
        id: 'org-1',
        name: 'Old',
        status: 'ACTIVE',
      }),
      update: async ({ data }: { data: unknown }) => ({
        id: 'org-1',
        ...(data as Record<string, unknown>),
      }),
    },
  });

  const organization = await service.updateOrganization(
    principal,
    { name: 'New Church' },
    {},
  );

  assert.equal(organization.name, 'New Church');
  assert.equal(
    (entries[0] as { action: string }).action,
    'admin.organization.updated',
  );
});

it('creates, updates, and deactivates departments', async () => {
  const updates: unknown[] = [];
  const { entries, service } = admin({
    department: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'dept-1',
        ...data,
      }),
      findFirst: async () => ({
        active: true,
        code: 'FIN',
        id: 'dept-1',
        name: 'Finance',
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { id: 'dept-1', ...data };
      },
    },
    user: { findFirst: async () => ({ id: 'head-1' }) },
  });

  const created = await service.createDepartment(
    principal,
    { code: 'fin', departmentHeadId: 'head-1', name: 'Finance' },
    {},
  );
  await service.updateDepartment(principal, 'dept-1', { code: 'acct' }, {});
  const deactivated = await service.deactivateDepartment(
    principal,
    'dept-1',
    {},
  );

  assert.equal(created.code, 'FIN');
  assert.deepEqual(updates.at(-1), { active: false });
  assert.equal(deactivated.active, false);
  assert.equal(entries.length, 3);
});

it('lists, updates, and deactivates users with tenant-scoped filters', async () => {
  let capturedWhere: unknown;
  const { service } = admin({
    department: { findFirst: async () => ({ id: 'dept-1' }) },
    role: { findFirst: async () => ({ id: 'role-1' }) },
    session: { updateMany: async () => ({ count: 1 }) },
    user: {
      findFirst: async () => ({
        email: 'user@example.com',
        id: 'user-2',
        status: 'ACTIVE',
      }),
      findMany: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return [];
      },
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        email: 'user@example.com',
        id: 'user-2',
        ...data,
      }),
    },
  });

  await service.users(principal, { search: 'finance', status: 'ACTIVE' });
  const user = await service.deactivateUser(principal, 'user-2', {});

  assert.ok(JSON.stringify(capturedWhere).includes('"organizationId":"org-1"'));
  assert.ok(JSON.stringify(capturedWhere).includes('finance'));
  assert.equal(user.status, 'DISABLED');
});

it('creates roles and replaces role permissions', async () => {
  let transactionCalled = false;
  const { entries, service } = admin({
    $transaction: async () => {
      transactionCalled = true;
    },
    permission: { count: async () => 2 },
    role: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'role-1',
        ...data,
      }),
      findFirst: async () => ({
        active: true,
        id: 'role-1',
        name: 'Pilot Admin',
      }),
      findUniqueOrThrow: async () => ({ id: 'role-1', rolePermissions: [] }),
    },
    rolePermission: {
      createMany: async () => ({}),
      deleteMany: async () => ({}),
    },
  });

  const role = await service.createRole(principal, { name: 'Pilot Admin' }, {});
  await service.updateRolePermissions(
    principal,
    'role-1',
    {
      permissionIds: [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ],
    },
    {},
  );

  assert.equal(role.name, 'Pilot Admin');
  assert.equal(transactionCalled, true);
  assert.equal(
    entries.at(-1) && (entries.at(-1) as { action: string }).action,
    'admin.role.permissions.updated',
  );
});

it('builds grouped permission matrix', async () => {
  const { service } = admin({
    permission: {
      findMany: async () => [
        { code: 'admin.access', id: 'permission-1', module: 'admin' },
      ],
    },
    role: {
      findMany: async () => [
        {
          id: 'role-1',
          name: 'Organization Admin',
          rolePermissions: [{ permission: { code: 'admin.access' } }],
        },
      ],
    },
  });

  const matrix = await service.permissionMatrix(principal);

  assert.equal(matrix.modules.admin.length, 1);
  assert.deepEqual(matrix.roles[0]?.permissionCodes, ['admin.access']);
});

it('creates document types and assigns workflows', async () => {
  const { entries, service } = admin({
    documentType: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'type-1',
        ...data,
      }),
      findFirst: async () => ({ id: 'type-1', name: 'Memo' }),
    },
    workflow: { findFirst: async () => ({ id: 'workflow-1' }) },
    workflowAssignment: {
      upsert: async ({ create }: { create: Record<string, unknown> }) => create,
    },
  });

  const documentType = await service.createDocumentType(
    principal,
    { name: 'Memo', workflowId: 'workflow-1' },
    {},
  );
  const assignment = await service.assignDocumentTypeWorkflow(
    principal,
    'type-1',
    { workflowId: 'workflow-1' },
    {},
  );

  assert.equal(documentType.name, 'Memo');
  assert.equal(assignment.workflowId, 'workflow-1');
  assert.equal(entries.length, 2);
});

it('updates safe system settings and excludes secrets', async () => {
  const upserts: string[] = [];
  const { service } = admin({
    systemSetting: {
      findMany: async () => [{ key: 'brandingName', value: 'FaithOS Pilot' }],
      upsert: async ({ create }: { create: { key: string } }) => {
        upserts.push(create.key);
      },
    },
  });

  const settings = await service.updateSystemSettings(
    principal,
    { brandingName: 'FaithOS Pilot', maxAttachmentSizeBytes: 1000 },
    {},
  );

  assert.deepEqual(upserts.sort(), ['brandingName', 'maxAttachmentSizeBytes']);
  assert.equal(settings.brandingName, 'FaithOS Pilot');
  assert.equal(Object.hasOwn(settings, 'JWT_SECRET'), false);
});

it('lists tenant-scoped administrative audit log entries', async () => {
  let capturedWhere: unknown;
  const { service } = admin({
    auditLog: {
      findMany: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return [{ action: 'admin.user.created' }];
      },
    },
  });

  const logs = await service.auditLog(principal, { entityType: 'User' });

  assert.equal(logs.length, 1);
  assert.ok(JSON.stringify(capturedWhere).includes('"organizationId":"org-1"'));
});

it('marks pilot readiness incomplete when required configuration is missing', async () => {
  const { service } = admin({
    department: { count: async () => 1 },
    documentType: { count: async () => 0 },
    organization: {
      findUniqueOrThrow: async () => ({
        email: 'hello@example.com',
        name: 'Demo',
        phone: null,
        timezone: 'Africa/Lagos',
      }),
    },
    role: { count: async () => 1 },
    rolePermission: { count: async () => 0 },
    user: {
      count: async () => 2,
      findFirst: async () => null,
    },
    workflowAssignment: { count: async () => 0 },
    workflowNotification: { count: async () => 0 },
  });

  const readiness = await service.pilotReadiness(principal);

  assert.equal(readiness.complete, false);
  assert.ok(readiness.items.some((item) => !item.complete));
});

it('enforces admin permissions through the existing permission guard', async () => {
  const guard = new PermissionGuard(
    {
      getAllAndOverride: () => ['admin.access'],
    } as unknown as Reflector,
    {
      rolePermission: { findMany: async () => [] },
    } as never,
  );

  await assert.rejects(
    () =>
      guard.canActivate({
        getClass: () => AdminService,
        getHandler: () => AdminService,
        switchToHttp: () => ({
          getRequest: () => ({ user: principal }),
        }),
      } as never),
    /Required permission is missing/,
  );
});
