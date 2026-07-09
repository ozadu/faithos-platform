import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  Prisma,
  WorkflowHistoryAction,
  WorkflowInstanceStatus,
  WorkflowNotificationType,
  WorkflowTaskStatus,
} from '@faithos/database';

import { AuthenticatedUser } from '../common/authenticated-user';
import { PrismaService } from '../database/prisma.service';
import {
  AssignWorkflowDto,
  UpdateWorkflowAssignmentDto,
} from './dto/assign-workflow.dto';
import { CreateDelegationDto } from './dto/delegation.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import {
  ForwardWorkflowTaskDto,
  StartWorkflowDto,
  WorkflowActionDto,
} from './dto/workflow-action.dto';
import { WorkflowStepDto } from './dto/workflow-step.dto';

const workflowInclude = {
  assignments: true,
  steps: {
    include: {
      department: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
      workflowVersion: { select: { active: true, id: true, version: true } },
    },
    orderBy: { sequence: 'asc' },
    where: { workflowVersion: { active: true } },
  },
  versions: { orderBy: { version: 'desc' } },
} satisfies Prisma.WorkflowInclude;

const instanceInclude = {
  currentStep: {
    include: {
      department: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
    },
  },
  document: {
    select: {
      category: true,
      id: true,
      referenceNumber: true,
      status: true,
      title: true,
    },
  },
  history: {
    include: {
      actor: {
        select: { email: true, firstName: true, id: true, lastName: true },
      },
      actorDepartment: { select: { id: true, name: true } },
      nextStep: { select: { id: true, sequence: true } },
      previousStep: { select: { id: true, sequence: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
  tasks: {
    include: {
      assignedDepartment: { select: { id: true, name: true } },
      assignedRole: { select: { id: true, name: true } },
      assignedUser: {
        select: { email: true, firstName: true, id: true, lastName: true },
      },
      delegatedFromUser: {
        select: { email: true, firstName: true, id: true, lastName: true },
      },
      step: { select: { id: true, sequence: true } },
    },
    orderBy: { createdAt: 'desc' },
  },
  workflow: { select: { id: true, name: true, version: true } },
} satisfies Prisma.WorkflowInstanceInclude;

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  listWorkflows(principal: AuthenticatedUser) {
    return this.prisma.workflow.findMany({
      include: workflowInclude,
      orderBy: { updatedAt: 'desc' },
      where: { organizationId: principal.organizationId },
    });
  }

  async getWorkflow(principal: AuthenticatedUser, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      include: workflowInclude,
      where: { id, organizationId: principal.organizationId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async createWorkflow(principal: AuthenticatedUser, input: CreateWorkflowDto) {
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          active: input.active ?? true,
          name: input.name,
          organizationId: principal.organizationId,
          version: 1,
          ...(input.description ? { description: input.description } : {}),
        },
      });
      const version = await tx.workflowVersion.create({
        data: {
          active: true,
          description: 'Initial workflow version',
          version: 1,
          workflowId: workflow.id,
        },
      });
      await this.createSteps(tx, workflow.id, version.id, input.steps ?? []);
      return tx.workflow.findUniqueOrThrow({
        include: workflowInclude,
        where: { id: workflow.id },
      });
    });
  }

  async updateWorkflow(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateWorkflowDto,
  ) {
    await this.ensureWorkflow(principal, id);

    return this.prisma.$transaction(async (tx) => {
      const nextVersion =
        input.steps?.length === undefined
          ? undefined
          : await this.nextWorkflowVersion(tx, id);

      await tx.workflow.update({
        data: {
          ...(input.active === undefined ? {} : { active: input.active }),
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(nextVersion ? { version: nextVersion } : {}),
        },
        where: { id },
      });

      if (nextVersion) {
        await tx.workflowVersion.updateMany({
          data: { active: false },
          where: { workflowId: id },
        });
        const version = await tx.workflowVersion.create({
          data: {
            active: true,
            description: `Version ${nextVersion}`,
            version: nextVersion,
            workflowId: id,
          },
        });
        await this.createSteps(tx, id, version.id, input.steps ?? []);
      }

      return tx.workflow.findUniqueOrThrow({
        include: workflowInclude,
        where: { id },
      });
    });
  }

  async deactivateWorkflow(principal: AuthenticatedUser, id: string) {
    await this.ensureWorkflow(principal, id);
    return this.prisma.workflow.update({
      data: { active: false },
      where: { id },
    });
  }

  listAssignments(principal: AuthenticatedUser) {
    return this.prisma.workflowAssignment.findMany({
      include: {
        workflow: { select: { id: true, name: true, version: true } },
      },
      orderBy: { documentType: 'asc' },
      where: { organizationId: principal.organizationId },
    });
  }

  async assignWorkflow(principal: AuthenticatedUser, input: AssignWorkflowDto) {
    await this.ensureWorkflow(principal, input.workflowId);
    return this.prisma.workflowAssignment.upsert({
      create: {
        active: input.active ?? true,
        documentType: input.documentType,
        organizationId: principal.organizationId,
        workflowId: input.workflowId,
      },
      include: {
        workflow: { select: { id: true, name: true, version: true } },
      },
      update: {
        active: input.active ?? true,
        workflowId: input.workflowId,
      },
      where: {
        organizationId_documentType: {
          documentType: input.documentType,
          organizationId: principal.organizationId,
        },
      },
    });
  }

  async updateAssignment(
    principal: AuthenticatedUser,
    id: string,
    input: UpdateWorkflowAssignmentDto,
  ) {
    const existing = await this.prisma.workflowAssignment.findFirst({
      where: { id, organizationId: principal.organizationId },
    });
    if (!existing) throw new NotFoundException('Workflow assignment not found');
    if (input.workflowId)
      await this.ensureWorkflow(principal, input.workflowId);
    return this.prisma.workflowAssignment.update({
      data: {
        ...(input.active === undefined ? {} : { active: input.active }),
        ...(input.workflowId ? { workflowId: input.workflowId } : {}),
      },
      include: {
        workflow: { select: { id: true, name: true, version: true } },
      },
      where: { id },
    });
  }

  async removeAssignment(principal: AuthenticatedUser, id: string) {
    const existing = await this.prisma.workflowAssignment.findFirst({
      where: { id, organizationId: principal.organizationId },
    });
    if (!existing) throw new NotFoundException('Workflow assignment not found');
    return this.prisma.workflowAssignment.update({
      data: { active: false },
      where: { id },
    });
  }

  async startWorkflow(
    principal: AuthenticatedUser,
    documentId: string,
    input: StartWorkflowDto = {},
  ) {
    return this.startForDocument(principal, documentId, input);
  }

  async startForDocument(
    principal: AuthenticatedUser,
    documentId: string,
    input: StartWorkflowDto = {},
  ) {
    const profile = await this.getPrincipalProfile(principal);
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId: principal.organizationId },
    });
    if (!document) throw new NotFoundException('Document not found');

    const active = await this.prisma.workflowInstance.findFirst({
      include: instanceInclude,
      where: {
        documentId,
        organizationId: principal.organizationId,
        status: WorkflowInstanceStatus.IN_PROGRESS,
      },
    });
    if (active) return active;

    const assignment = await this.prisma.workflowAssignment.findFirst({
      include: {
        workflow: {
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
              where: { active: true },
            },
          },
        },
      },
      where: {
        active: true,
        documentType: document.category,
        organizationId: principal.organizationId,
        workflow: { active: true },
      },
    });
    if (!assignment) return null;

    const version = assignment.workflow.versions[0];
    const steps = await this.workflowStepsForVersion(
      assignment.workflowId,
      version?.id,
    );
    const firstStep = this.nextEligibleStep(steps, document, input.metadata);
    if (!firstStep) {
      throw new BadRequestException(
        'Assigned workflow has no eligible first step',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.create({
        data: {
          currentStepId: firstStep.id,
          documentId: document.id,
          organizationId: principal.organizationId,
          startedBy: principal.id,
          workflowId: assignment.workflowId,
          ...(input.metadata
            ? { metadata: input.metadata as Prisma.InputJsonObject }
            : {}),
          ...(version?.id ? { workflowVersionId: version.id } : {}),
        },
      });

      await tx.document.update({
        data: {
          currentDepartmentId: firstStep.departmentId,
          status: DocumentStatus.IN_REVIEW,
          updatedBy: principal.id,
        },
        where: { id: document.id },
      });

      await this.createTask(tx, {
        documentId: document.id,
        instanceId: instance.id,
        organizationId: principal.organizationId,
        step: firstStep,
      });
      await this.recordHistory(tx, {
        action: WorkflowHistoryAction.STARTED,
        actorDepartmentId: profile.departmentId,
        actorUserId: principal.id,
        comments: input.comments,
        documentId: document.id,
        nextStepId: firstStep.id,
        organizationId: principal.organizationId,
        workflowInstanceId: instance.id,
      });

      return tx.workflowInstance.findUniqueOrThrow({
        include: instanceInclude,
        where: { id: instance.id },
      });
    });
  }

  async receiveTask(
    principal: AuthenticatedUser,
    taskId: string,
    input: WorkflowActionDto,
  ) {
    const { profile, task } = await this.getActionableTask(principal, taskId);
    return this.prisma.$transaction(async (tx) => {
      await tx.workflowTask.update({
        data: { receivedAt: new Date(), status: WorkflowTaskStatus.RECEIVED },
        where: { id: task.id },
      });
      await this.recordHistory(tx, {
        action: WorkflowHistoryAction.RECEIVED,
        actorDepartmentId: profile.departmentId,
        actorUserId: principal.id,
        comments: input.comments,
        documentId: task.documentId,
        nextStepId: task.stepId,
        organizationId: principal.organizationId,
        workflowInstanceId: task.workflowInstanceId,
      });
      return tx.workflowInstance.findUniqueOrThrow({
        include: instanceInclude,
        where: { id: task.workflowInstanceId },
      });
    });
  }

  async approveTask(
    principal: AuthenticatedUser,
    taskId: string,
    input: WorkflowActionDto,
  ) {
    const { profile, task } = await this.getActionableTask(principal, taskId);
    const document = task.document;
    const steps = await this.workflowStepsForVersion(
      task.workflowInstance.workflowId,
      task.workflowInstance.workflowVersionId,
    );
    const nextStep = this.nextEligibleStep(
      steps.filter((step) => step.sequence > task.step.sequence),
      document,
      task.workflowInstance.metadata,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowTask.update({
        data: { completedAt: new Date(), status: WorkflowTaskStatus.APPROVED },
        where: { id: task.id },
      });

      if (!nextStep) {
        await tx.workflowInstance.update({
          data: {
            completedAt: new Date(),
            currentStepId: null,
            status: WorkflowInstanceStatus.COMPLETED,
          },
          where: { id: task.workflowInstanceId },
        });
        await tx.document.update({
          data: {
            status: DocumentStatus.APPROVED,
            updatedBy: principal.id,
          },
          where: { id: task.documentId },
        });
        await this.notify(tx, {
          documentId: task.documentId,
          organizationId: principal.organizationId,
          title: 'Workflow completed',
          type: WorkflowNotificationType.COMPLETED,
          workflowInstanceId: task.workflowInstanceId,
        });
      } else {
        await tx.workflowInstance.update({
          data: { currentStepId: nextStep.id },
          where: { id: task.workflowInstanceId },
        });
        await tx.document.update({
          data: {
            currentDepartmentId: nextStep.departmentId,
            status: DocumentStatus.IN_REVIEW,
            updatedBy: principal.id,
          },
          where: { id: task.documentId },
        });
        await this.createTask(tx, {
          documentId: task.documentId,
          instanceId: task.workflowInstanceId,
          organizationId: principal.organizationId,
          step: nextStep,
        });
      }

      await this.recordHistory(tx, {
        action: nextStep
          ? WorkflowHistoryAction.APPROVED
          : WorkflowHistoryAction.COMPLETED,
        actorDepartmentId: profile.departmentId,
        actorUserId: principal.id,
        comments: input.comments,
        documentId: task.documentId,
        nextStepId: nextStep?.id,
        organizationId: principal.organizationId,
        previousStepId: task.stepId,
        workflowInstanceId: task.workflowInstanceId,
      });

      return tx.workflowInstance.findUniqueOrThrow({
        include: instanceInclude,
        where: { id: task.workflowInstanceId },
      });
    });
  }

  async rejectTask(
    principal: AuthenticatedUser,
    taskId: string,
    input: WorkflowActionDto,
  ) {
    const { profile, task } = await this.getActionableTask(principal, taskId);
    return this.finishAsRejectedOrCancelled({
      action: WorkflowHistoryAction.REJECTED,
      comments: input.comments,
      documentStatus: DocumentStatus.REJECTED,
      instanceStatus: WorkflowInstanceStatus.REJECTED,
      notificationType: WorkflowNotificationType.REJECTED,
      principal,
      profileDepartmentId: profile.departmentId,
      task,
    });
  }

  async cancelTask(
    principal: AuthenticatedUser,
    taskId: string,
    input: WorkflowActionDto,
  ) {
    const { profile, task } = await this.getActionableTask(principal, taskId);
    return this.finishAsRejectedOrCancelled({
      action: WorkflowHistoryAction.CANCELLED,
      comments: input.comments,
      documentStatus: DocumentStatus.RETURNED,
      instanceStatus: WorkflowInstanceStatus.CANCELLED,
      notificationType: WorkflowNotificationType.RETURNED,
      principal,
      profileDepartmentId: profile.departmentId,
      task,
    });
  }

  completeTask(
    principal: AuthenticatedUser,
    taskId: string,
    input: WorkflowActionDto,
  ) {
    return this.approveTask(principal, taskId, input);
  }

  async returnTask(
    principal: AuthenticatedUser,
    taskId: string,
    input: WorkflowActionDto,
  ) {
    const { profile, task } = await this.getActionableTask(principal, taskId);
    if (!task.step.canReturn) {
      throw new BadRequestException('This workflow step cannot return work');
    }

    const previous = await this.prisma.workflowHistoryEvent.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        nextStepId: task.stepId,
        workflowInstanceId: task.workflowInstanceId,
      },
    });
    const previousStep = previous?.previousStepId
      ? await this.prisma.workflowStep.findUnique({
          where: { id: previous.previousStepId },
        })
      : null;
    const fallbackDepartmentId =
      previousStep?.departmentId ?? task.document.senderDepartmentId;

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowTask.update({
        data: { completedAt: new Date(), status: WorkflowTaskStatus.RETURNED },
        where: { id: task.id },
      });
      await tx.workflowInstance.update({
        data: { currentStepId: previousStep?.id ?? null },
        where: { id: task.workflowInstanceId },
      });
      await tx.document.update({
        data: {
          currentDepartmentId: fallbackDepartmentId,
          status: DocumentStatus.RETURNED,
          updatedBy: principal.id,
        },
        where: { id: task.documentId },
      });
      if (previousStep) {
        await this.createTask(tx, {
          documentId: task.documentId,
          instanceId: task.workflowInstanceId,
          organizationId: principal.organizationId,
          step: previousStep,
        });
      }
      await this.notify(tx, {
        departmentId: fallbackDepartmentId,
        documentId: task.documentId,
        message: input.comments,
        organizationId: principal.organizationId,
        title: 'Workflow task returned',
        type: WorkflowNotificationType.RETURNED,
        workflowInstanceId: task.workflowInstanceId,
      });
      await this.recordHistory(tx, {
        action: WorkflowHistoryAction.RETURNED,
        actorDepartmentId: profile.departmentId,
        actorUserId: principal.id,
        comments: input.comments,
        documentId: task.documentId,
        nextStepId: previousStep?.id,
        organizationId: principal.organizationId,
        previousStepId: task.stepId,
        workflowInstanceId: task.workflowInstanceId,
      });
      return tx.workflowInstance.findUniqueOrThrow({
        include: instanceInclude,
        where: { id: task.workflowInstanceId },
      });
    });
  }

  async forwardTask(
    principal: AuthenticatedUser,
    taskId: string,
    input: ForwardWorkflowTaskDto,
  ) {
    const { profile, task } = await this.getActionableTask(principal, taskId);
    if (!task.step.canForward) {
      throw new BadRequestException('This workflow step cannot forward work');
    }
    const department = await this.prisma.department.findFirst({
      where: {
        id: input.departmentId,
        organizationId: principal.organizationId,
      },
    });
    if (!department)
      throw new NotFoundException('Forward department not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowTask.update({
        data: { completedAt: new Date(), status: WorkflowTaskStatus.FORWARDED },
        where: { id: task.id },
      });
      const adHocTask = await tx.workflowTask.create({
        data: {
          assignedDepartmentId: department.id,
          documentId: task.documentId,
          dueAt: this.addDays(new Date(), task.step.dueDays),
          organizationId: principal.organizationId,
          reminderAt: this.addDays(
            new Date(),
            Math.max(task.step.dueDays - 1, 0),
          ),
          status: WorkflowTaskStatus.PENDING,
          stepId: task.stepId,
          workflowInstanceId: task.workflowInstanceId,
        },
      });
      await tx.document.update({
        data: {
          currentDepartmentId: department.id,
          status: DocumentStatus.FORWARDED,
          updatedBy: principal.id,
        },
        where: { id: task.documentId },
      });
      await this.notify(tx, {
        departmentId: department.id,
        documentId: task.documentId,
        message: input.comments,
        organizationId: principal.organizationId,
        title: 'Workflow task forwarded',
        type: WorkflowNotificationType.FORWARDED,
        workflowInstanceId: task.workflowInstanceId,
      });
      await this.recordHistory(tx, {
        action: WorkflowHistoryAction.FORWARDED,
        actorDepartmentId: profile.departmentId,
        actorUserId: principal.id,
        comments: input.comments,
        documentId: task.documentId,
        nextStepId: task.stepId,
        organizationId: principal.organizationId,
        previousStepId: task.stepId,
        workflowInstanceId: task.workflowInstanceId,
      });
      return tx.workflowTask.findUniqueOrThrow({
        include: this.taskInclude(),
        where: { id: adHocTask.id },
      });
    });
  }

  async myTasks(principal: AuthenticatedUser) {
    const profile = await this.getPrincipalProfile(principal);
    return this.prisma.workflowTask.findMany({
      include: this.taskInclude(),
      orderBy: { dueAt: 'asc' },
      where: {
        organizationId: principal.organizationId,
        status: {
          in: [
            WorkflowTaskStatus.PENDING,
            WorkflowTaskStatus.RECEIVED,
            WorkflowTaskStatus.OVERDUE,
          ],
        },
        OR: [
          { assignedUserId: principal.id },
          { assignedUserId: null, assignedDepartmentId: profile.departmentId },
        ],
      },
    });
  }

  pendingApprovals(principal: AuthenticatedUser) {
    return this.prisma.workflowTask.findMany({
      include: this.taskInclude(),
      orderBy: { dueAt: 'asc' },
      where: {
        organizationId: principal.organizationId,
        status: {
          in: [
            WorkflowTaskStatus.PENDING,
            WorkflowTaskStatus.RECEIVED,
            WorkflowTaskStatus.OVERDUE,
          ],
        },
        step: { approvalRequired: true },
      },
    });
  }

  history(principal: AuthenticatedUser, documentId?: string) {
    return this.prisma.workflowHistoryEvent.findMany({
      include: {
        actor: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
        actorDepartment: { select: { id: true, name: true } },
        document: { select: { id: true, referenceNumber: true, title: true } },
        nextStep: { select: { id: true, sequence: true } },
        previousStep: { select: { id: true, sequence: true } },
      },
      orderBy: { createdAt: 'desc' },
      where: {
        ...(documentId ? { documentId } : {}),
        organizationId: principal.organizationId,
      },
    });
  }

  notifications(principal: AuthenticatedUser) {
    return this.prisma.workflowNotification.findMany({
      include: {
        document: { select: { id: true, referenceNumber: true, title: true } },
        workflowInstance: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      where: { organizationId: principal.organizationId },
    });
  }

  delegations(principal: AuthenticatedUser) {
    return this.prisma.workflowDelegation.findMany({
      include: {
        fromUser: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
        toUser: {
          select: { email: true, firstName: true, id: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      where: { organizationId: principal.organizationId },
    });
  }

  createDelegation(principal: AuthenticatedUser, input: CreateDelegationDto) {
    return this.prisma.workflowDelegation.create({
      data: {
        active: input.active ?? true,
        endsAt: new Date(input.endsAt),
        fromUserId: input.fromUserId,
        organizationId: principal.organizationId,
        startsAt: new Date(input.startsAt),
        toUserId: input.toUserId,
        ...(input.reason ? { reason: input.reason } : {}),
      },
    });
  }

  async removeDelegation(principal: AuthenticatedUser, id: string) {
    const delegation = await this.prisma.workflowDelegation.findFirst({
      where: { id, organizationId: principal.organizationId },
    });
    if (!delegation) throw new NotFoundException('Delegation not found');
    return this.prisma.workflowDelegation.update({
      data: { active: false },
      where: { id },
    });
  }

  async markOverdue(principal: AuthenticatedUser) {
    const now = new Date();
    const overdueTasks = await this.prisma.workflowTask.findMany({
      where: {
        dueAt: { lt: now },
        organizationId: principal.organizationId,
        status: {
          in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.RECEIVED],
        },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const task of overdueTasks) {
        await tx.workflowTask.update({
          data: { escalatedAt: now, status: WorkflowTaskStatus.OVERDUE },
          where: { id: task.id },
        });
        await this.notify(tx, {
          departmentId: task.assignedDepartmentId,
          documentId: task.documentId,
          organizationId: principal.organizationId,
          title: 'Workflow task overdue',
          type: WorkflowNotificationType.ESCALATED,
          workflowInstanceId: task.workflowInstanceId,
        });
      }
    });

    return { markedOverdue: overdueTasks.length };
  }

  private async ensureWorkflow(principal: AuthenticatedUser, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId: principal.organizationId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  private async createSteps(
    tx: Prisma.TransactionClient,
    workflowId: string,
    workflowVersionId: string,
    steps: WorkflowStepDto[],
  ) {
    for (const step of steps) {
      await tx.workflowStep.create({
        data: {
          approvalRequired: step.approvalRequired ?? true,
          canForward: step.canForward ?? false,
          canReturn: step.canReturn ?? true,
          departmentId: step.departmentId,
          dueDays: step.dueDays ?? 2,
          escalationDays: step.escalationDays ?? 1,
          notifyEmail: step.notifyEmail ?? false,
          notifyInApp: step.notifyInApp ?? true,
          sequence: step.sequence,
          workflowId,
          workflowVersionId,
          ...(step.conditionField
            ? { conditionField: step.conditionField }
            : {}),
          ...(step.conditionOperator
            ? { conditionOperator: step.conditionOperator }
            : {}),
          ...(step.conditionValue
            ? { conditionValue: step.conditionValue }
            : {}),
          ...(step.roleId ? { roleId: step.roleId } : {}),
        },
      });
    }
  }

  private async nextWorkflowVersion(
    tx: Prisma.TransactionClient,
    workflowId: string,
  ) {
    const workflow = await tx.workflow.findUniqueOrThrow({
      select: { version: true },
      where: { id: workflowId },
    });
    return workflow.version + 1;
  }

  private workflowStepsForVersion(
    workflowId: string,
    versionId?: string | null,
  ) {
    return this.prisma.workflowStep.findMany({
      orderBy: { sequence: 'asc' },
      where: {
        workflowId,
        ...(versionId ? { workflowVersionId: versionId } : {}),
      },
    });
  }

  private nextEligibleStep<
    T extends {
      conditionField: string | null;
      conditionOperator: string | null;
      conditionValue: string | null;
    },
  >(
    steps: T[],
    document: {
      category: string;
      priority: string;
      confidentiality: string;
      title: string;
      subject: string;
    },
    metadata?: Prisma.JsonValue | Record<string, unknown> | null,
  ) {
    return steps.find((step) =>
      this.matchesCondition(step, document, metadata),
    );
  }

  private matchesCondition(
    step: {
      conditionField: string | null;
      conditionOperator: string | null;
      conditionValue: string | null;
    },
    document: {
      category: string;
      confidentiality: string;
      priority: string;
      subject: string;
      title: string;
    },
    metadata?: Prisma.JsonValue | Record<string, unknown> | null,
  ) {
    if (!step.conditionField || !step.conditionOperator) return true;
    const source =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};
    const actual =
      source[step.conditionField] ??
      document[step.conditionField as keyof typeof document];
    const expected = step.conditionValue;
    if (actual === undefined || expected === null) return false;
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    const numeric =
      !Number.isNaN(actualNumber) && !Number.isNaN(expectedNumber);
    switch (step.conditionOperator) {
      case 'LT':
        return numeric && actualNumber < expectedNumber;
      case 'LTE':
        return numeric && actualNumber <= expectedNumber;
      case 'GT':
        return numeric && actualNumber > expectedNumber;
      case 'GTE':
        return numeric && actualNumber >= expectedNumber;
      case 'EQ':
        return String(actual) === expected;
      case 'NEQ':
        return String(actual) !== expected;
      default:
        return false;
    }
  }

  private async createTask(
    tx: Prisma.TransactionClient,
    input: {
      documentId: string;
      instanceId: string;
      organizationId: string;
      step: {
        departmentId: string;
        dueDays: number;
        escalationDays: number;
        id: string;
        roleId: string | null;
      };
    },
  ) {
    const now = new Date();
    const assignedUser = await tx.user.findFirst({
      orderBy: { createdAt: 'asc' },
      where: {
        departmentId: input.step.departmentId,
        organizationId: input.organizationId,
        status: 'ACTIVE',
        ...(input.step.roleId ? { roleId: input.step.roleId } : {}),
      },
    });
    const delegation = assignedUser
      ? await tx.workflowDelegation.findFirst({
          orderBy: { createdAt: 'desc' },
          where: {
            active: true,
            endsAt: { gte: now },
            fromUserId: assignedUser.id,
            organizationId: input.organizationId,
            startsAt: { lte: now },
          },
        })
      : null;
    const assigneeId = delegation?.toUserId ?? assignedUser?.id;

    const task = await tx.workflowTask.create({
      data: {
        assignedDepartmentId: input.step.departmentId,
        documentId: input.documentId,
        dueAt: this.addDays(now, input.step.dueDays),
        organizationId: input.organizationId,
        reminderAt: this.addDays(now, Math.max(input.step.dueDays - 1, 0)),
        status: WorkflowTaskStatus.PENDING,
        stepId: input.step.id,
        workflowInstanceId: input.instanceId,
        ...(input.step.roleId ? { assignedRoleId: input.step.roleId } : {}),
        ...(assigneeId ? { assignedUserId: assigneeId } : {}),
        ...(delegation?.fromUserId
          ? { delegatedFromUserId: delegation.fromUserId }
          : {}),
      },
    });

    await this.notify(tx, {
      departmentId: input.step.departmentId,
      documentId: input.documentId,
      organizationId: input.organizationId,
      title: 'Workflow approval required',
      type: WorkflowNotificationType.APPROVAL_REQUIRED,
      workflowInstanceId: input.instanceId,
      ...(assigneeId ? { userId: assigneeId } : {}),
    });

    if (delegation) {
      await tx.workflowHistoryEvent.create({
        data: {
          action: WorkflowHistoryAction.DELEGATED,
          actorUserId: delegation.fromUserId,
          documentId: input.documentId,
          metadata: { delegatedToUserId: delegation.toUserId },
          nextStepId: input.step.id,
          organizationId: input.organizationId,
          workflowInstanceId: input.instanceId,
        },
      });
    }

    return task;
  }

  private async getActionableTask(
    principal: AuthenticatedUser,
    taskId: string,
  ) {
    const profile = await this.getPrincipalProfile(principal);
    const task = await this.prisma.workflowTask.findFirst({
      include: {
        document: true,
        step: true,
        workflowInstance: true,
      },
      where: { id: taskId, organizationId: principal.organizationId },
    });
    if (!task) throw new NotFoundException('Workflow task not found');
    if (
      task.status !== WorkflowTaskStatus.PENDING &&
      task.status !== WorkflowTaskStatus.RECEIVED &&
      task.status !== WorkflowTaskStatus.OVERDUE
    ) {
      throw new BadRequestException('Workflow task is already closed');
    }
    const assignedToUser = task.assignedUserId === principal.id;
    const assignedToDepartment =
      !task.assignedUserId &&
      task.assignedDepartmentId === profile.departmentId;
    if (!assignedToUser && !assignedToDepartment) {
      throw new ForbiddenException('Workflow task is not assigned to you');
    }
    return { profile, task };
  }

  private async finishAsRejectedOrCancelled(input: {
    action: WorkflowHistoryAction;
    comments?: string | undefined;
    documentStatus: DocumentStatus;
    instanceStatus: WorkflowInstanceStatus;
    notificationType: WorkflowNotificationType;
    principal: AuthenticatedUser;
    profileDepartmentId?: string | null | undefined;
    task: Awaited<ReturnType<WorkflowsService['getActionableTask']>>['task'];
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.workflowTask.update({
        data: { completedAt: new Date(), status: WorkflowTaskStatus.REJECTED },
        where: { id: input.task.id },
      });
      await tx.workflowInstance.update({
        data: {
          status: input.instanceStatus,
          ...(input.instanceStatus === WorkflowInstanceStatus.CANCELLED
            ? { cancelledAt: new Date() }
            : {}),
          ...(input.instanceStatus === WorkflowInstanceStatus.REJECTED
            ? { completedAt: new Date() }
            : {}),
        },
        where: { id: input.task.workflowInstanceId },
      });
      await tx.document.update({
        data: {
          status: input.documentStatus,
          updatedBy: input.principal.id,
        },
        where: { id: input.task.documentId },
      });
      await this.notify(tx, {
        documentId: input.task.documentId,
        message: input.comments,
        organizationId: input.principal.organizationId,
        title:
          input.notificationType === WorkflowNotificationType.REJECTED
            ? 'Workflow rejected'
            : 'Workflow cancelled',
        type: input.notificationType,
        workflowInstanceId: input.task.workflowInstanceId,
      });
      await this.recordHistory(tx, {
        action: input.action,
        actorDepartmentId: input.profileDepartmentId,
        actorUserId: input.principal.id,
        comments: input.comments,
        documentId: input.task.documentId,
        organizationId: input.principal.organizationId,
        previousStepId: input.task.stepId,
        workflowInstanceId: input.task.workflowInstanceId,
      });
      return tx.workflowInstance.findUniqueOrThrow({
        include: instanceInclude,
        where: { id: input.task.workflowInstanceId },
      });
    });
  }

  private recordHistory(
    tx: Prisma.TransactionClient,
    input: {
      action: WorkflowHistoryAction;
      actorDepartmentId?: string | null | undefined;
      actorUserId: string;
      comments?: string | undefined;
      documentId: string;
      nextStepId?: string | null | undefined;
      organizationId: string;
      previousStepId?: string | null | undefined;
      workflowInstanceId: string;
    },
  ) {
    return tx.workflowHistoryEvent.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId,
        documentId: input.documentId,
        organizationId: input.organizationId,
        workflowInstanceId: input.workflowInstanceId,
        ...(input.comments ? { comments: input.comments } : {}),
        ...(input.actorDepartmentId
          ? { actorDepartmentId: input.actorDepartmentId }
          : {}),
        ...(input.nextStepId ? { nextStepId: input.nextStepId } : {}),
        ...(input.previousStepId
          ? { previousStepId: input.previousStepId }
          : {}),
      },
    });
  }

  private notify(
    tx: Prisma.TransactionClient,
    input: {
      departmentId?: string | null | undefined;
      documentId?: string | undefined;
      message?: string | undefined;
      organizationId: string;
      title: string;
      type: WorkflowNotificationType;
      userId?: string | null | undefined;
      workflowInstanceId?: string | undefined;
    },
  ) {
    return tx.workflowNotification.create({
      data: {
        message: input.message ?? input.title,
        organizationId: input.organizationId,
        title: input.title,
        type: input.type,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        ...(input.documentId ? { documentId: input.documentId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.workflowInstanceId
          ? { workflowInstanceId: input.workflowInstanceId }
          : {}),
      },
    });
  }

  private async getPrincipalProfile(principal: AuthenticatedUser) {
    const profile = await this.prisma.user.findFirst({
      select: { departmentId: true, id: true },
      where: { id: principal.id, organizationId: principal.organizationId },
    });
    if (!profile)
      throw new ForbiddenException('Current user profile not found');
    if (!profile.departmentId) {
      throw new ForbiddenException('Current user has no department');
    }
    return { departmentId: profile.departmentId, id: profile.id };
  }

  private taskInclude() {
    return {
      assignedDepartment: { select: { id: true, name: true } },
      assignedRole: { select: { id: true, name: true } },
      assignedUser: {
        select: { email: true, firstName: true, id: true, lastName: true },
      },
      delegatedFromUser: {
        select: { email: true, firstName: true, id: true, lastName: true },
      },
      document: {
        select: {
          category: true,
          id: true,
          referenceNumber: true,
          title: true,
        },
      },
      step: {
        include: {
          department: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
        },
      },
      workflowInstance: {
        include: { workflow: { select: { id: true, name: true } } },
      },
    } satisfies Prisma.WorkflowTaskInclude;
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }
}
