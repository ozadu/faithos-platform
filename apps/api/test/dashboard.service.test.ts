import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { DashboardService } from '../src/dashboard/dashboard.service';
import { NotificationsService } from '../src/notifications/notifications.service';

const principal = {
  id: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  sessionId: 'session-1',
};

function dashboard(prisma: Record<string, unknown>) {
  return new DashboardService(
    prisma as never,
    { unreadCount: async () => ({ count: 7 }) } as NotificationsService,
  );
}

it('builds operational dashboard counts from documents, tasks, and notifications', async () => {
  let taskCountCalls = 0;
  let documentCountCalls = 0;
  const service = dashboard({
    document: {
      count: async () => {
        documentCountCalls += 1;
        return documentCountCalls === 1 ? 4 : 2;
      },
      findMany: async () => [],
    },
    user: {
      findFirst: async () => ({ departmentId: 'department-1', id: 'user-1' }),
    },
    workflowHistoryEvent: {
      findMany: async () => [],
    },
    workflowInstance: {
      findMany: async () => [],
    },
    workflowTask: {
      count: async () => {
        taskCountCalls += 1;
        return taskCountCalls === 1 ? 3 : 1;
      },
    },
  });

  const summary = await service.summary(principal);

  assert.equal(summary.counts.myPendingTasks, 3);
  assert.equal(summary.counts.unreadNotifications, 7);
  assert.equal(summary.counts.inboxDocuments, 4);
  assert.equal(summary.counts.draftDocuments, 2);
  assert.equal(summary.counts.overdueWorkflows, 1);
});

it('aggregates my work into actionable buckets', async () => {
  const task = { id: 'task-1' };
  const service = dashboard({
    document: {
      findMany: async () => [{ id: 'document-1' }],
    },
    user: {
      findFirst: async () => ({ departmentId: 'department-1', id: 'user-1' }),
    },
    workflowTask: {
      findMany: async () => [task],
    },
  });

  const summary = await service.myWork(principal);

  assert.deepEqual(summary.assignedTasks, [task]);
  assert.deepEqual(summary.pendingApprovals, [task]);
  assert.deepEqual(summary.overdueItems, [task]);
  assert.deepEqual(summary.recentlyCompletedTasks, [task]);
  assert.deepEqual(summary.returnedDocuments, [{ id: 'document-1' }]);
});
