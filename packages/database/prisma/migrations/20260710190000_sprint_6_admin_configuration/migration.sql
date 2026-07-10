-- Sprint 6: Admin Configuration & Pilot Readiness

ALTER TABLE "Organization"
  ADD COLUMN "shortName" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "defaultCurrency" TEXT NOT NULL DEFAULT 'NGN';

ALTER TABLE "Department"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "parentDepartmentId" UUID,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Department"
  ADD CONSTRAINT "Department_parentDepartmentId_fkey"
  FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Role"
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "DocumentType" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "referencePrefix" TEXT NOT NULL DEFAULT 'DOC',
  "defaultConfidentiality" "DocumentConfidentiality" NOT NULL DEFAULT 'INTERNAL',
  "defaultPriority" "DocumentPriority" NOT NULL DEFAULT 'NORMAL',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_organizationId_code_key" ON "Department"("organizationId", "code");
CREATE INDEX "Department_organizationId_active_idx" ON "Department"("organizationId", "active");
CREATE INDEX "Role_organizationId_active_idx" ON "Role"("organizationId", "active");
CREATE UNIQUE INDEX "DocumentType_organizationId_name_key" ON "DocumentType"("organizationId", "name");
CREATE INDEX "DocumentType_organizationId_active_idx" ON "DocumentType"("organizationId", "active");
CREATE UNIQUE INDEX "SystemSetting_organizationId_key_key" ON "SystemSetting"("organizationId", "key");
CREATE INDEX "SystemSetting_organizationId_idx" ON "SystemSetting"("organizationId");

ALTER TABLE "DocumentType"
  ADD CONSTRAINT "DocumentType_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SystemSetting"
  ADD CONSTRAINT "SystemSetting_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
