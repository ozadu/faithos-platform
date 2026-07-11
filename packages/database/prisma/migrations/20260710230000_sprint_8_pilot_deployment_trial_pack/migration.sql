-- Sprint 8: Pilot Deployment & Real-World Trial Pack
-- Adds tenant-scoped pilot feedback, issue tracking, and admin onboarding completion state.

CREATE TABLE "PilotFeedback" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "submittedByUserId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleOrDepartment" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "affectedArea" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilotIssue" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "feedbackId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedOwner" TEXT,
    "relatedArea" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminOnboardingItem" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOnboardingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PilotFeedback_organizationId_status_priority_idx" ON "PilotFeedback"("organizationId", "status", "priority");
CREATE INDEX "PilotFeedback_organizationId_type_createdAt_idx" ON "PilotFeedback"("organizationId", "type", "createdAt");
CREATE INDEX "PilotIssue_organizationId_status_severity_idx" ON "PilotIssue"("organizationId", "status", "severity");
CREATE INDEX "PilotIssue_organizationId_source_createdAt_idx" ON "PilotIssue"("organizationId", "source", "createdAt");
CREATE UNIQUE INDEX "AdminOnboardingItem_organizationId_userId_key_key" ON "AdminOnboardingItem"("organizationId", "userId", "key");
CREATE INDEX "AdminOnboardingItem_organizationId_key_idx" ON "AdminOnboardingItem"("organizationId", "key");

ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PilotIssue" ADD CONSTRAINT "PilotIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotIssue" ADD CONSTRAINT "PilotIssue_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "PilotFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PilotIssue" ADD CONSTRAINT "PilotIssue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminOnboardingItem" ADD CONSTRAINT "AdminOnboardingItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminOnboardingItem" ADD CONSTRAINT "AdminOnboardingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
