import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { ReportsService } from '../src/reports/reports.service';

const principal = {
  id: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  sessionId: 'session-1',
};

function reports(prisma: Record<string, unknown>) {
  return new ReportsService(prisma as never);
}

const organizationPermissions = [
  { permission: { code: 'reports.view.organization' } },
  { permission: { code: 'reports.view' } },
  { permission: { code: 'reports.export' } },
];

it('builds report summary metrics from operational data', async () => {
  const service = reports({
    department: { findMany: async () => [] },
    document: {
      count: async () => 2,
      findMany: async () => [],
    },
    documentTimelineEvent: { count: async () => 1 },
    rolePermission: { findMany: async () => organizationPermissions },
    user: {
      count: async () => 0,
      findFirst: async () => ({ departmentId: 'dept-1', id: 'user-1' }),
      findMany: async () => [],
    },
    workflowInstance: {
      count: async () => 1,
      findMany: async () => [
        {
          completedAt: new Date('2026-07-10T12:00:00.000Z'),
          createdAt: new Date('2026-07-10T06:00:00.000Z'),
        },
      ],
    },
    workflowTask: {
      count: async () => 3,
      findMany: async () => [
        {
          completedAt: new Date('2026-07-10T10:00:00.000Z'),
          createdAt: new Date('2026-07-10T08:00:00.000Z'),
        },
      ],
    },
  });

  const summary = await service.summary(principal, {});

  assert.equal(summary.totalDocuments, 2);
  assert.equal(summary.completedWorkflows, 1);
  assert.equal(summary.overdueWorkflows, 3);
  assert.equal(summary.averageWorkflowCompletionHours, 6);
  assert.equal(summary.averageApprovalHours, 2);
});

it('applies document report filters and tenant isolation', async () => {
  let capturedWhere: unknown;
  const service = reports({
    document: {
      count: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return 1;
      },
      findMany: async () => [
        {
          confidentiality: 'INTERNAL',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          creator: {
            email: 'admin@demo.faithos.local',
            firstName: 'Demo',
            id: 'user-1',
            lastName: 'Admin',
          },
          currentDepartment: { id: 'dept-1', name: 'Finance' },
          id: 'doc-1',
          priority: 'HIGH',
          referenceNumber: 'DOC-2026-000001',
          status: 'SUBMITTED',
          timeline: [{ action: 'SUBMITTED', createdAt: new Date() }],
          title: 'Budget',
          workflowInstances: [],
        },
      ],
    },
    rolePermission: { findMany: async () => organizationPermissions },
  });

  const report = await service.documents(principal, {
    priority: 'HIGH',
    status: 'SUBMITTED',
  });

  assert.equal(report.items[0]?.referenceNumber, 'DOC-2026-000001');
  assert.ok(JSON.stringify(capturedWhere).includes('"organizationId":"org-1"'));
  assert.ok(JSON.stringify(capturedWhere).includes('"priority":"HIGH"'));
});

it('applies workflow report filters', async () => {
  let capturedWhere: unknown;
  const service = reports({
    rolePermission: { findMany: async () => organizationPermissions },
    workflowInstance: {
      count: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return 1;
      },
      findMany: async () => [
        {
          completedAt: null,
          createdAt: new Date(),
          currentStep: {
            department: { id: 'dept-1', name: 'Finance' },
            sequence: 1,
          },
          document: { referenceNumber: 'DOC-2026-000001', title: 'Budget' },
          id: 'instance-1',
          status: 'IN_PROGRESS',
          tasks: [],
          workflow: { name: 'Memo Review' },
        },
      ],
    },
  });

  const report = await service.workflows(principal, {
    workflowId: '00000000-0000-0000-0000-000000000001',
  });

  assert.equal(report.items[0]?.workflowName, 'Memo Review');
  assert.ok(
    JSON.stringify(capturedWhere).includes(
      '00000000-0000-0000-0000-000000000001',
    ),
  );
});

it('reports overdue workflow tasks', async () => {
  const service = reports({
    rolePermission: { findMany: async () => organizationPermissions },
    workflowTask: {
      count: async () => 1,
      findMany: async () => [
        {
          assignedDepartment: { id: 'dept-1', name: 'Finance' },
          assignedUser: null,
          document: { referenceNumber: 'DOC-2026-000001', title: 'Budget' },
          dueAt: new Date('2026-07-01T00:00:00.000Z'),
          escalatedAt: new Date('2026-07-02T00:00:00.000Z'),
          id: 'task-1',
          workflowInstance: {
            notifications: [
              { createdAt: new Date('2026-07-02T00:00:00.000Z') },
            ],
          },
        },
      ],
    },
  });

  const report = await service.overdue(principal, {});

  assert.equal(report.items[0]?.taskId, 'task-1');
  assert.equal(report.items[0]?.escalationStatus, 'ESCALATED');
});

it('calculates turnaround durations', async () => {
  const service = reports({
    document: {
      findMany: async () => [
        {
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          id: 'doc-1',
          referenceNumber: 'DOC-2026-000001',
          timeline: [
            {
              action: 'SUBMITTED',
              createdAt: new Date('2026-07-01T10:00:00.000Z'),
            },
          ],
          title: 'Budget',
          workflowInstances: [
            {
              completedAt: new Date('2026-07-01T14:00:00.000Z'),
              tasks: [
                {
                  assignedDepartment: { id: 'dept-1', name: 'Finance' },
                  completedAt: new Date('2026-07-01T12:00:00.000Z'),
                  createdAt: new Date('2026-07-01T10:00:00.000Z'),
                  step: { sequence: 1 },
                },
              ],
            },
          ],
        },
      ],
    },
    rolePermission: { findMany: async () => organizationPermissions },
  });

  const report = await service.turnaround(principal, {});

  assert.equal(report.averageCreationToSubmissionHours, 2);
  assert.equal(report.averageSubmissionToCompletionHours, 4);
  assert.equal(report.averageDepartmentProcessingHours, 2);
});

it('combines workflow, document, and audit activity', async () => {
  const service = reports({
    auditLog: {
      findMany: async () => [
        {
          action: 'document.created',
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          entityId: 'doc-1',
          entityType: 'Document',
          id: 'audit-1',
          user: null,
        },
      ],
    },
    documentTimelineEvent: {
      findMany: async () => [
        {
          action: 'SUBMITTED',
          actor: null,
          createdAt: new Date('2026-07-01T09:00:00.000Z'),
          document: { referenceNumber: 'DOC-2026-000001' },
          id: 'document-event-1',
          note: null,
          toDepartment: null,
        },
      ],
    },
    rolePermission: { findMany: async () => organizationPermissions },
    workflowHistoryEvent: {
      findMany: async () => [
        {
          action: 'APPROVED',
          actor: null,
          actorDepartment: null,
          comments: null,
          createdAt: new Date('2026-07-01T10:00:00.000Z'),
          document: { referenceNumber: 'DOC-2026-000001' },
          id: 'workflow-event-1',
        },
      ],
    },
  });

  const report = await service.activity(principal, {});

  assert.equal(report.items.length, 3);
  assert.equal(report.items[0]?.action, 'APPROVED');
});

it('exports document reports as CSV', async () => {
  const service = reports({
    document: {
      count: async () => 1,
      findMany: async () => [
        {
          confidentiality: 'INTERNAL',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          creator: {
            email: 'admin@demo.faithos.local',
            firstName: 'Demo',
            id: 'user-1',
            lastName: 'Admin',
          },
          currentDepartment: { id: 'dept-1', name: 'Finance' },
          id: 'doc-1',
          priority: 'HIGH',
          referenceNumber: 'DOC-2026-000001',
          status: 'SUBMITTED',
          timeline: [],
          title: 'Budget',
          workflowInstances: [],
        },
      ],
    },
    rolePermission: { findMany: async () => organizationPermissions },
  });

  const csv = await service.documentsCsv(principal, {});

  assert.ok(csv.startsWith('Reference Number,Title,Status'));
  assert.ok(csv.includes('DOC-2026-000001'));
});

it('rejects report access when reporting permissions are missing', async () => {
  const service = reports({
    rolePermission: { findMany: async () => [] },
  });

  await assert.rejects(() => service.summary(principal, {}), /permission/);
});
