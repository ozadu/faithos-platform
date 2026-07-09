-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'FORWARDED', 'RETURNED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DocumentConfidentiality" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "DocumentRouteAction" AS ENUM ('SUBMITTED', 'FORWARDED', 'RETURNED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "DocumentTimelineAction" AS ENUM ('CREATED', 'EDITED', 'SUBMITTED', 'FORWARDED', 'RETURNED', 'RECEIVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "DocumentPriority" NOT NULL DEFAULT 'NORMAL',
    "confidentiality" "DocumentConfidentiality" NOT NULL DEFAULT 'INTERNAL',
    "senderDepartmentId" UUID NOT NULL,
    "currentDepartmentId" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAttachment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRoute" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "fromDepartmentId" UUID NOT NULL,
    "toDepartmentId" UUID NOT NULL,
    "routedBy" UUID NOT NULL,
    "action" "DocumentRouteAction" NOT NULL,
    "note" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTimelineEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "action" "DocumentTimelineAction" NOT NULL,
    "actorUserId" UUID NOT NULL,
    "fromDepartmentId" UUID,
    "toDepartmentId" UUID,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_referenceNumber_key" ON "Document"("referenceNumber");

-- CreateIndex
CREATE INDEX "Document_organizationId_status_createdAt_idx" ON "Document"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Document_organizationId_currentDepartmentId_status_idx" ON "Document"("organizationId", "currentDepartmentId", "status");

-- CreateIndex
CREATE INDEX "Document_organizationId_senderDepartmentId_idx" ON "Document"("organizationId", "senderDepartmentId");

-- CreateIndex
CREATE INDEX "Document_organizationId_ownerUserId_status_idx" ON "Document"("organizationId", "ownerUserId", "status");

-- CreateIndex
CREATE INDEX "Document_organizationId_referenceNumber_idx" ON "Document"("organizationId", "referenceNumber");

-- CreateIndex
CREATE INDEX "DocumentAttachment_organizationId_documentId_idx" ON "DocumentAttachment"("organizationId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentAttachment_uploadedBy_createdAt_idx" ON "DocumentAttachment"("uploadedBy", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentRoute_organizationId_documentId_createdAt_idx" ON "DocumentRoute"("organizationId", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentRoute_organizationId_toDepartmentId_isRead_idx" ON "DocumentRoute"("organizationId", "toDepartmentId", "isRead");

-- CreateIndex
CREATE INDEX "DocumentRoute_organizationId_fromDepartmentId_createdAt_idx" ON "DocumentRoute"("organizationId", "fromDepartmentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentTimelineEvent_organizationId_documentId_createdAt_idx" ON "DocumentTimelineEvent"("organizationId", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentTimelineEvent_actorUserId_createdAt_idx" ON "DocumentTimelineEvent"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_senderDepartmentId_fkey" FOREIGN KEY ("senderDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_currentDepartmentId_fkey" FOREIGN KEY ("currentDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAttachment" ADD CONSTRAINT "DocumentAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAttachment" ADD CONSTRAINT "DocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAttachment" ADD CONSTRAINT "DocumentAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRoute" ADD CONSTRAINT "DocumentRoute_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRoute" ADD CONSTRAINT "DocumentRoute_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRoute" ADD CONSTRAINT "DocumentRoute_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRoute" ADD CONSTRAINT "DocumentRoute_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRoute" ADD CONSTRAINT "DocumentRoute_routedBy_fkey" FOREIGN KEY ("routedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTimelineEvent" ADD CONSTRAINT "DocumentTimelineEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTimelineEvent" ADD CONSTRAINT "DocumentTimelineEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTimelineEvent" ADD CONSTRAINT "DocumentTimelineEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTimelineEvent" ADD CONSTRAINT "DocumentTimelineEvent_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTimelineEvent" ADD CONSTRAINT "DocumentTimelineEvent_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
