import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

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

it('builds pilot deployment status without exposing secrets', async () => {
  process.env.JWT_SECRET = 'secret-that-should-not-appear';
  const { service } = adminService({
    department: { count: async () => 5 },
    document: { count: async () => 10 },
    documentType: { count: async () => 6 },
    organization: {
      findUnique: async () => ({
        email: 'hello@demo.faithos.local',
        name: 'Demo Org',
        timezone: 'Africa/Lagos',
      }),
      findUniqueOrThrow: async () => ({ email: 'hello@demo.faithos.local' }),
    },
    pilotFeedback: { count: async () => 2 },
    pilotIssue: { count: async () => 1 },
    user: { count: async () => 6 },
    workflowAssignment: { count: async () => 6 },
  });
  Object.assign(service, {
    pilotReadiness: async () => ({ complete: true, items: [] }),
    productionReadiness: async () => ({ complete: false, items: [] }),
  });

  const summary = await service.pilotDeployment(principal);

  assert.equal(summary.setupComplete, true);
  assert.equal(summary.feedbackItems, 2);
  assert.equal(summary.openIssues, 1);
  assert.equal(JSON.stringify(summary).includes(process.env.JWT_SECRET), false);
});

it('returns safe demo credential handover records', async () => {
  const { service } = adminService({
    user: {
      findMany: async () => [
        {
          department: { name: 'Executive' },
          email: 'admin@demo.faithos.local',
          firstName: 'Demo',
          lastLoginAt: null,
          lastName: 'Administrator',
          role: { name: 'Organization Admin' },
        },
      ],
    },
  });

  const result = await service.demoCredentials(principal);

  assert.equal(result.accounts[0].email, 'admin@demo.faithos.local');
  assert.equal(result.accounts[0].password, 'FaithOS-Demo-2026!');
  assert.equal(result.warning.includes('before production'), true);
});

it('builds the pilot setup pack with linked owner guidance', async () => {
  const { service } = adminService({
    department: { count: async () => 5 },
    documentType: { count: async () => 6 },
    organization: {
      findUniqueOrThrow: async () => ({
        email: 'hello@example.org',
        name: 'Demo Org',
        timezone: 'Africa/Lagos',
      }),
    },
    role: { count: async () => 3 },
    user: { count: async () => 6 },
    workflow: { count: async () => 2 },
    workflowAssignment: { count: async () => 6 },
    workflowNotification: { count: async () => 4 },
  });

  const pack = await service.pilotSetupPack(principal);

  assert.equal(
    pack.items.some((item) => item.href === '/admin/users'),
    true,
  );
  assert.equal(
    pack.items.some((item) => item.owner === 'Technical Owner'),
    true,
  );
  assert.equal(pack.complete, false);
});

it('creates and triages pilot feedback', async () => {
  const updated: unknown[] = [];
  const { entries, service } = adminService({
    pilotFeedback: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'feedback-1',
        ...data,
      }),
      findFirst: async () => ({ id: 'feedback-1' }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updated.push(data);
        return { id: 'feedback-1', ...data };
      },
    },
  });

  const created = await service.submitFeedback(principal, {
    affectedArea: 'Documents',
    email: 'PILOT@EXAMPLE.ORG',
    message: 'The document list was easy to test.',
    name: 'Pilot User',
    priority: 'Medium',
    roleOrDepartment: 'Operations',
    type: 'Process improvement',
  });
  const triaged = await service.updateFeedback(
    principal,
    'feedback-1',
    { status: 'REVIEWED' },
    {},
  );

  assert.equal(created.email, 'pilot@example.org');
  assert.deepEqual(updated[0], { status: 'REVIEWED' });
  assert.equal((triaged as { status: string }).status, 'REVIEWED');
  assert.equal(
    (entries.at(-1) as { action: string }).action,
    'pilot.feedback.updated',
  );
});

it('lists pilot feedback using admin filters', async () => {
  const filters: unknown[] = [];
  const { service } = adminService({
    pilotFeedback: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        filters.push(where);
        return [{ id: 'feedback-1', status: 'NEW', type: 'Bug' }];
      },
    },
  });

  const records = await service.feedback(principal, {
    priority: 'High',
    status: 'NEW',
    type: 'Bug',
  });

  assert.equal(records.length, 1);
  assert.deepEqual(filters[0], {
    organizationId: 'org-1',
    priority: 'High',
    status: 'NEW',
    type: 'Bug',
  });
});

it('creates and updates pilot issue tracker records', async () => {
  const { entries, service } = adminService({
    pilotFeedback: { findFirst: async () => ({ id: 'feedback-1' }) },
    pilotIssue: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'issue-1',
        ...data,
      }),
      findFirst: async () => ({ id: 'issue-1' }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'issue-1',
        ...data,
      }),
    },
  });

  const issue = await service.createPilotIssue(
    principal,
    {
      description: 'Backup restore drill needs evidence capture.',
      feedbackId: 'feedback-1',
      severity: 'High',
      source: 'Feedback',
      title: 'Capture restore evidence',
    },
    {},
  );
  const updated = await service.updatePilotIssue(
    principal,
    'issue-1',
    { status: 'Fixed' },
    {},
  );

  assert.equal(issue.status, 'Open');
  assert.equal((updated as { status: string }).status, 'Fixed');
  assert.equal(
    (entries[0] as { action: string }).action,
    'pilot.issue.created',
  );
  assert.equal(
    (entries.at(-1) as { action: string }).action,
    'pilot.issue.updated',
  );
});

it('lists pilot issue tracker records using admin filters', async () => {
  const filters: unknown[] = [];
  const { service } = adminService({
    pilotIssue: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        filters.push(where);
        return [{ id: 'issue-1', severity: 'High', status: 'Open' }];
      },
    },
  });

  const records = await service.pilotIssues(principal, {
    severity: 'High',
    source: 'UAT',
    status: 'Open',
  });

  assert.equal(records.length, 1);
  assert.deepEqual(filters[0], {
    organizationId: 'org-1',
    severity: 'High',
    source: 'UAT',
    status: 'Open',
  });
});

it('builds and completes admin onboarding checklist items', async () => {
  const upserts: unknown[] = [];
  const { entries, service } = adminService({
    adminOnboardingItem: {
      findMany: async () => [{ key: 'reports' }],
      upsert: async ({ create }: { create: Record<string, unknown> }) => {
        upserts.push(create);
        return { id: 'onboarding-1', ...create };
      },
    },
    department: { count: async () => 5 },
    document: { count: async () => 10 },
    documentType: { count: async () => 6 },
    organization: {
      findUnique: async () => ({
        email: 'hello@example.org',
        name: 'Demo Org',
        timezone: 'Africa/Lagos',
      }),
    },
    user: { count: async () => 6 },
    workflowAssignment: { count: async () => 6 },
  });

  const before = await service.onboardingChecklist(principal);
  const after = await service.completeOnboardingItem(
    principal,
    'backup-plan',
    {},
  );

  assert.equal(
    before.items.some((item) => item.key === 'reports'),
    true,
  );
  assert.equal(upserts.length, 1);
  assert.equal(after.complete, false);
  assert.equal(
    (entries.at(-1) as { action: string }).action,
    'pilot.onboarding.completed',
  );
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
