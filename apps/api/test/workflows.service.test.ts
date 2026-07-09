import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import {
  DocumentStatus,
  WorkflowInstanceStatus,
  WorkflowNotificationType,
  WorkflowTaskStatus,
} from '@faithos/database';

import { PrismaService } from '../src/database/prisma.service';
import { WorkflowsService } from '../src/workflows/workflows.service';

const principal = {
  id: 'admin-user',
  organizationId: 'org-id',
  roleId: 'role-id',
  sessionId: 'session-id',
};

function service(prisma: Partial<PrismaService> = {}) {
  return new WorkflowsService(prisma as PrismaService) as WorkflowsService & {
    createTask: (...args: unknown[]) => Promise<unknown>;
    getActionableTask: () => Promise<unknown>;
    nextEligibleStep: (...args: unknown[]) => unknown;
  };
}

it('routes conditionally based on purchase amount', () => {
  const workflows = service();
  const steps = [
    {
      conditionField: 'purchaseAmount',
      conditionOperator: 'LT',
      conditionValue: '500000',
      id: 'finance-step',
      sequence: 1,
    },
    {
      conditionField: 'purchaseAmount',
      conditionOperator: 'GTE',
      conditionValue: '500000',
      id: 'executive-step',
      sequence: 2,
    },
  ];
  const document = {
    category: 'Purchase Request',
    confidentiality: 'INTERNAL',
    priority: 'HIGH',
    subject: 'Generator procurement',
    title: 'Generator procurement',
  };

  assert.equal(
    workflows.nextEligibleStep(steps, document, { purchaseAmount: 250000 })?.id,
    'finance-step',
  );
  assert.equal(
    workflows.nextEligibleStep(steps, document, { purchaseAmount: 750000 })?.id,
    'executive-step',
  );
});

it('assigns workflow tasks to active delegates when the primary user is unavailable', async () => {
  let createdTask: Record<string, unknown> | undefined;
  let delegatedHistory = false;
  const workflows = service();
  const tx = {
    user: {
      findFirst: async () => ({ id: 'finance-lead' }),
    },
    workflowDelegation: {
      findFirst: async () => ({
        fromUserId: 'finance-lead',
        toUserId: 'ops-delegate',
      }),
    },
    workflowHistoryEvent: {
      create: async () => {
        delegatedHistory = true;
      },
    },
    workflowNotification: {
      create: async () => undefined,
    },
    workflowTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdTask = data;
        return { id: 'task-id', ...data };
      },
    },
  };

  await workflows.createTask(tx, {
    documentId: 'document-id',
    instanceId: 'instance-id',
    organizationId: principal.organizationId,
    step: {
      departmentId: 'finance',
      dueDays: 2,
      escalationDays: 1,
      id: 'step-id',
      roleId: null,
    },
  });

  assert.equal(createdTask?.assignedUserId, 'ops-delegate');
  assert.equal(createdTask?.delegatedFromUserId, 'finance-lead');
  assert.equal(delegatedHistory, true);
});

it('approves a workflow task and progresses to the next eligible step', async () => {
  const calls: string[] = [];
  let documentDepartment: string | undefined;
  const task = taskFixture();
  const nextStep = {
    canForward: false,
    canReturn: true,
    conditionField: null,
    conditionOperator: null,
    conditionValue: null,
    departmentId: 'executive',
    dueDays: 3,
    escalationDays: 1,
    id: 'step-2',
    roleId: null,
    sequence: 2,
  };
  const tx = transactionFixture(calls);
  tx.document.update = async ({
    data,
  }: {
    data: { currentDepartmentId?: string };
  }) => {
    documentDepartment = data.currentDepartmentId;
    calls.push('document.update');
  };
  const workflows = service({
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    workflowStep: {
      findMany: async () => [nextStep],
    },
  } as unknown as PrismaService);
  workflows.getActionableTask = async () => ({
    profile: { departmentId: 'finance', id: principal.id },
    task,
  });

  await workflows.approveTask(principal, 'task-id', {
    comments: 'Approved',
  });

  assert.equal(documentDepartment, 'executive');
  assert.ok(calls.includes('workflowTask.create'));
  assert.ok(calls.includes('history.create'));
});

it('rejects a workflow task and closes the workflow instance', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const tx = transactionFixture();
  tx.workflowInstance.update = async ({
    data,
  }: {
    data: Record<string, unknown>;
  }) => {
    calls.push(data);
  };
  tx.document.update = async ({ data }: { data: Record<string, unknown> }) => {
    calls.push(data);
  };
  const workflows = service({
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
  } as unknown as PrismaService);
  workflows.getActionableTask = async () => ({
    profile: { departmentId: 'finance', id: principal.id },
    task: taskFixture(),
  });

  await workflows.rejectTask(principal, 'task-id', { comments: 'Rejected' });

  assert.deepEqual(calls[0]?.status, WorkflowInstanceStatus.REJECTED);
  assert.deepEqual(calls[1]?.status, DocumentStatus.REJECTED);
});

it('returns a workflow task to the previous step when return is allowed', async () => {
  let returnedDepartment: string | undefined;
  const tx = transactionFixture();
  tx.document.update = async ({
    data,
  }: {
    data: { currentDepartmentId?: string };
  }) => {
    returnedDepartment = data.currentDepartmentId;
  };
  const workflows = service({
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    workflowHistoryEvent: {
      findFirst: async () => ({ previousStepId: 'step-0' }),
    },
    workflowStep: {
      findUnique: async () => ({
        canForward: false,
        canReturn: true,
        departmentId: 'operations',
        dueDays: 1,
        escalationDays: 1,
        id: 'step-0',
        roleId: null,
      }),
    },
  } as unknown as PrismaService);
  workflows.getActionableTask = async () => ({
    profile: { departmentId: 'finance', id: principal.id },
    task: taskFixture(),
  });

  await workflows.returnTask(principal, 'task-id', { comments: 'Needs edits' });

  assert.equal(returnedDepartment, 'operations');
});

it('marks overdue workflow tasks and creates escalation notifications', async () => {
  const updates: string[] = [];
  const tx = {
    workflowNotification: {
      create: async () => updates.push('notification.create'),
    },
    workflowTask: {
      update: async () => updates.push('task.update'),
    },
  };
  const workflows = service({
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    workflowTask: {
      findMany: async () => [
        {
          assignedDepartmentId: 'finance',
          documentId: 'document-id',
          id: 'task-id',
          workflowInstanceId: 'instance-id',
        },
      ],
    },
  } as unknown as PrismaService);

  const result = await workflows.markOverdue(principal);

  assert.equal(result.markedOverdue, 1);
  assert.deepEqual(updates, ['task.update', 'notification.create']);
});

function taskFixture() {
  return {
    document: {
      category: 'Purchase Request',
      confidentiality: 'INTERNAL',
      senderDepartmentId: 'finance',
      priority: 'HIGH',
      subject: 'Subject',
      title: 'Title',
    },
    documentId: 'document-id',
    id: 'task-id',
    step: {
      canForward: true,
      canReturn: true,
      dueDays: 2,
      escalationDays: 1,
      id: 'step-1',
      sequence: 1,
    },
    stepId: 'step-1',
    workflowInstance: {
      id: 'instance-id',
      metadata: { purchaseAmount: 750000 },
      workflowId: 'workflow-id',
      workflowVersionId: 'version-id',
    },
    workflowInstanceId: 'instance-id',
  };
}

function transactionFixture(calls: string[] = []) {
  return {
    document: {
      update: async () => calls.push('document.update'),
    },
    user: {
      findFirst: async () => null,
    },
    workflowDelegation: {
      findFirst: async () => null,
    },
    workflowHistoryEvent: {
      create: async () => calls.push('history.create'),
    },
    workflowInstance: {
      findUniqueOrThrow: async () => ({ id: 'instance-id' }),
      update: async () => calls.push('instance.update'),
    },
    workflowNotification: {
      create: async ({
        data,
      }: {
        data: { type?: WorkflowNotificationType };
      }) => {
        calls.push(`notification.${data.type}`);
      },
    },
    workflowTask: {
      create: async () => calls.push('workflowTask.create'),
      findUniqueOrThrow: async () => ({ id: 'task-id' }),
      update: async ({ data }: { data: { status?: WorkflowTaskStatus } }) => {
        calls.push(`task.${data.status}`);
      },
    },
  };
}
