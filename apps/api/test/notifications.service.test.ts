import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { WorkflowNotificationType } from '@faithos/database';

import { EmailService } from '../src/email/email.service';
import { NotificationsService } from '../src/notifications/notifications.service';

const principal = {
  id: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  sessionId: 'session-1',
};

function service(prisma: Record<string, unknown>) {
  return new NotificationsService(
    prisma as never,
    { sendNotification: async () => ({ skipped: false }) } as EmailService,
  );
}

it('lists notifications scoped to the current tenant and visible recipient', async () => {
  let capturedWhere: unknown;
  const notifications = service({
    user: {
      findFirstOrThrow: async () => ({ departmentId: 'department-1' }),
    },
    workflowNotification: {
      findMany: async ({ where }: { where: unknown }) => {
        capturedWhere = where;
        return [];
      },
    },
  });

  await notifications.list(principal, {
    module: 'workflows',
    unread: 'true',
  });

  assert.deepEqual(capturedWhere, {
    organizationId: 'org-1',
    readAt: null,
    type: {
      in: [
        WorkflowNotificationType.APPROVAL_REQUIRED,
        WorkflowNotificationType.RETURNED,
        WorkflowNotificationType.REJECTED,
        WorkflowNotificationType.FORWARDED,
        WorkflowNotificationType.COMPLETED,
        WorkflowNotificationType.ESCALATED,
        WorkflowNotificationType.REMINDER,
        WorkflowNotificationType.WORKFLOW_ASSIGNED,
        WorkflowNotificationType.WORKFLOW_APPROVED,
        WorkflowNotificationType.WORKFLOW_REJECTED,
        WorkflowNotificationType.WORKFLOW_RETURNED,
        WorkflowNotificationType.WORKFLOW_COMPLETED,
        WorkflowNotificationType.WORKFLOW_OVERDUE,
        WorkflowNotificationType.DELEGATION_ASSIGNED,
      ],
    },
    OR: [
      { userId: 'user-1' },
      { departmentId: 'department-1' },
      { AND: [{ userId: null }, { departmentId: null }] },
    ],
  });
});

it('marks all visible unread notifications as read', async () => {
  let updatedWhere: unknown;
  const notifications = service({
    user: {
      findFirstOrThrow: async () => ({ departmentId: 'department-1' }),
    },
    workflowNotification: {
      updateMany: async ({ where }: { where: unknown }) => {
        updatedWhere = where;
        return { count: 3 };
      },
    },
  });

  const result = await notifications.markAllRead(principal);

  assert.equal(result.count, 3);
  assert.ok(JSON.stringify(updatedWhere).includes('"readAt":null'));
});

it('returns unread notification count', async () => {
  const notifications = service({
    user: {
      findFirstOrThrow: async () => ({ departmentId: 'department-1' }),
    },
    workflowNotification: {
      count: async () => 5,
    },
  });

  assert.deepEqual(await notifications.unreadCount(principal), { count: 5 });
});
