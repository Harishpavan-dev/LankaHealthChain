-- Versioned baseline migration for the CORE DATABASE ONLY.
-- Each hospital has its own separately owned database and separate migration history.
CREATE TABLE "Hospital" (
  "id" UUID NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Hospital_code_key" ON "Hospital"("code");

CREATE TABLE "Patient" (
  "id" UUID NOT NULL, "authSubject" TEXT NOT NULL, "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Patient_authSubject_key" ON "Patient"("authSubject");

CREATE TABLE "Doctor" (
  "id" UUID NOT NULL, "authSubject" TEXT NOT NULL, "displayName" TEXT NOT NULL,
  "hospitalId" UUID NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Doctor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Doctor_authSubject_key" ON "Doctor"("authSubject");
CREATE INDEX "Doctor_hospitalId_active_idx" ON "Doctor"("hospitalId", "active");

CREATE TABLE "PatientIdentityMap" (
  "id" UUID NOT NULL, "patientId" UUID NOT NULL, "hospitalId" UUID NOT NULL,
  "localPatientRef" TEXT NOT NULL,
  CONSTRAINT "PatientIdentityMap_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientIdentityMap_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PatientIdentityMap_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PatientIdentityMap_patientId_hospitalId_key" ON "PatientIdentityMap"("patientId","hospitalId");

CREATE TABLE "MedicalRecordIndex" (
  "id" UUID NOT NULL, "patientId" UUID NOT NULL, "hospitalId" UUID NOT NULL,
  "remoteRecordId" TEXT NOT NULL, "resourceType" TEXT NOT NULL,
  "recordVersion" INTEGER NOT NULL, "integrityCommitment" TEXT NOT NULL,
  "nonceHex" TEXT NOT NULL, "anchorStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalRecordIndex_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicalRecordIndex_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MedicalRecordIndex_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MedicalRecordIndex_hospitalId_remoteRecordId_recordVersion_key" ON "MedicalRecordIndex"("hospitalId","remoteRecordId","recordVersion");
CREATE INDEX "MedicalRecordIndex_patientId_resourceType_idx" ON "MedicalRecordIndex"("patientId","resourceType");

CREATE TABLE "AccessRequest" (
  "id" UUID NOT NULL, "patientId" UUID NOT NULL, "doctorId" UUID NOT NULL,
  "purpose" TEXT NOT NULL, "requestedTypes" TEXT[] NOT NULL,
  "requestedDurationMinutes" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccessRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccessRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AccessRequest_patientId_status_idx" ON "AccessRequest"("patientId","status");
CREATE INDEX "AccessRequest_doctorId_createdAt_idx" ON "AccessRequest"("doctorId","createdAt");

CREATE TABLE "Consent" (
  "id" UUID NOT NULL, "requestId" UUID NOT NULL, "patientId" UUID NOT NULL,
  "doctorId" UUID NOT NULL, "hospitalId" UUID NOT NULL, "purpose" TEXT NOT NULL,
  "allowedTypes" TEXT[] NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMPTZ(3) NOT NULL, "revokedAt" TIMESTAMPTZ(3),
  "midnightProofRef" TEXT, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Consent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Consent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Consent_requestId_key" ON "Consent"("requestId");
CREATE INDEX "Consent_doctorId_status_expiresAt_idx" ON "Consent"("doctorId","status","expiresAt");

CREATE TABLE "RecordAnchor" (
  "id" UUID NOT NULL, "recordIndexId" UUID NOT NULL,
  "batchId" TEXT, "cardanoTxHash" TEXT, "inclusionProof" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecordAnchor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecordAnchor_recordIndexId_fkey" FOREIGN KEY ("recordIndexId") REFERENCES "MedicalRecordIndex"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "RecordAnchor_recordIndexId_idx" ON "RecordAnchor"("recordIndexId");

CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL, "patientId" UUID NOT NULL,
  "actorSub" TEXT NOT NULL, "action" TEXT NOT NULL, "requestId" UUID,
  "recordIndexId" UUID, "outcome" TEXT NOT NULL, "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AuditEvent_patientId_createdAt_idx" ON "AuditEvent"("patientId", "createdAt" DESC);

CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL, "eventType" TEXT NOT NULL, "aggregateId" UUID NOT NULL,
  "payload" JSONB NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");
