-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('PENDING', 'RECEIVED', 'APPROVED', 'REJECTED', 'RETURNED', 'FORWARDED', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "WorkflowHistoryAction" AS ENUM ('STARTED', 'APPROVED', 'REJECTED', 'RETURNED', 'FORWARDED', 'RECEIVED', 'COMPLETED', 'CANCELLED', 'DELEGATED', 'REMINDER', 'ESCALATED');

-- CreateEnum
CREATE TYPE "WorkflowConditionOperator" AS ENUM ('LT', 'LTE', 'GT', 'GTE', 'EQ', 'NEQ');

-- CreateEnum
CREATE TYPE "WorkflowNotificationType" AS ENUM ('APPROVAL_REQUIRED', 'RETURNED', 'REJECTED', 'FORWARDED', 'COMPLETED', 'ESCALATED', 'REMINDER');

-- CreateTable
CREATE TABLE "Workflow" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "workflowVersionId" UUID,
    "sequence" INTEGER NOT NULL,
    "departmentId" UUID NOT NULL,
    "roleId" UUID,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "canReturn" BOOLEAN NOT NULL DEFAULT true,
    "canForward" BOOLEAN NOT NULL DEFAULT false,
    "dueDays" INTEGER NOT NULL DEFAULT 2,
    "escalationDays" INTEGER NOT NULL DEFAULT 1,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "conditionField" TEXT,
    "conditionOperator" "WorkflowConditionOperator",
    "conditionValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAssignment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "workflowId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "workflowVersionId" UUID,
    "currentStepId" UUID,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "metadata" JSONB,
    "startedBy" UUID NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTask" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workflowInstanceId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "assignedDepartmentId" UUID NOT NULL,
    "assignedRoleId" UUID,
    "assignedUserId" UUID,
    "delegatedFromUserId" UUID,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "reminderAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowHistoryEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workflowInstanceId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "actorDepartmentId" UUID,
    "action" "WorkflowHistoryAction" NOT NULL,
    "comments" TEXT,
    "previousStepId" UUID,
    "nextStepId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDelegation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNotification" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "departmentId" UUID,
    "documentId" UUID,
    "workflowInstanceId" UUID,
    "type" "WorkflowNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_organizationId_active_idx" ON "Workflow"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_organizationId_name_key" ON "Workflow"("organizationId", "name");

-- CreateIndex
CREATE INDEX "WorkflowVersion_workflowId_active_idx" ON "WorkflowVersion"("workflowId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_sequence_idx" ON "WorkflowStep"("workflowId", "sequence");

-- CreateIndex
CREATE INDEX "WorkflowStep_departmentId_idx" ON "WorkflowStep"("departmentId");

-- CreateIndex
CREATE INDEX "WorkflowStep_roleId_idx" ON "WorkflowStep"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowId_workflowVersionId_sequence_key" ON "WorkflowStep"("workflowId", "workflowVersionId", "sequence");

-- CreateIndex
CREATE INDEX "WorkflowAssignment_organizationId_active_idx" ON "WorkflowAssignment"("organizationId", "active");

-- CreateIndex
CREATE INDEX "WorkflowAssignment_workflowId_idx" ON "WorkflowAssignment"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowAssignment_organizationId_documentType_key" ON "WorkflowAssignment"("organizationId", "documentType");

-- CreateIndex
CREATE INDEX "WorkflowInstance_organizationId_status_createdAt_idx" ON "WorkflowInstance"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowInstance_organizationId_documentId_idx" ON "WorkflowInstance"("organizationId", "documentId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_workflowId_status_idx" ON "WorkflowInstance"("workflowId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTask_organizationId_status_dueAt_idx" ON "WorkflowTask"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "WorkflowTask_organizationId_assignedDepartmentId_status_idx" ON "WorkflowTask"("organizationId", "assignedDepartmentId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTask_organizationId_assignedUserId_status_idx" ON "WorkflowTask"("organizationId", "assignedUserId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTask_workflowInstanceId_createdAt_idx" ON "WorkflowTask"("workflowInstanceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowHistoryEvent_organizationId_documentId_createdAt_idx" ON "WorkflowHistoryEvent"("organizationId", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowHistoryEvent_workflowInstanceId_createdAt_idx" ON "WorkflowHistoryEvent"("workflowInstanceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowHistoryEvent_actorUserId_createdAt_idx" ON "WorkflowHistoryEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowDelegation_organizationId_fromUserId_active_idx" ON "WorkflowDelegation"("organizationId", "fromUserId", "active");

-- CreateIndex
CREATE INDEX "WorkflowDelegation_organizationId_toUserId_active_idx" ON "WorkflowDelegation"("organizationId", "toUserId", "active");

-- CreateIndex
CREATE INDEX "WorkflowNotification_organizationId_userId_readAt_idx" ON "WorkflowNotification"("organizationId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "WorkflowNotification_organizationId_departmentId_readAt_idx" ON "WorkflowNotification"("organizationId", "departmentId", "readAt");

-- CreateIndex
CREATE INDEX "WorkflowNotification_workflowInstanceId_createdAt_idx" ON "WorkflowNotification"("workflowInstanceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAssignment" ADD CONSTRAINT "WorkflowAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAssignment" ADD CONSTRAINT "WorkflowAssignment_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_startedBy_fkey" FOREIGN KEY ("startedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_assignedDepartmentId_fkey" FOREIGN KEY ("assignedDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_assignedRoleId_fkey" FOREIGN KEY ("assignedRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_delegatedFromUserId_fkey" FOREIGN KEY ("delegatedFromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistoryEvent" ADD CONSTRAINT "WorkflowHistoryEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistoryEvent" ADD CONSTRAINT "WorkflowHistoryEvent_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistoryEvent" ADD CONSTRAINT "WorkflowHistoryEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistoryEvent" ADD CONSTRAINT "WorkflowHistoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistoryEvent" ADD CONSTRAINT "WorkflowHistoryEvent_actorDepartmentId_fkey" FOREIGN KEY ("actorDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistoryEvent" ADD CONSTRAINT "WorkflowHistoryEvent_previousStepId_fkey" FOREIGN KEY ("previousStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistoryEvent" ADD CONSTRAINT "WorkflowHistoryEvent_nextStepId_fkey" FOREIGN KEY ("nextStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDelegation" ADD CONSTRAINT "WorkflowDelegation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDelegation" ADD CONSTRAINT "WorkflowDelegation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDelegation" ADD CONSTRAINT "WorkflowDelegation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
