-- Security hardening: make hospital-local ID mapping injective, constrain statuses.
CREATE UNIQUE INDEX "PatientIdentityMap_hospitalId_localPatientRef_key"
  ON "PatientIdentityMap" ("hospitalId", "localPatientRef");
ALTER TABLE "RecordAnchor" ADD CONSTRAINT record_anchor_event_status_allowed
  CHECK ("status" IN ('PENDING','CONFIRMED','FAILED'));
ALTER TABLE "OutboxEvent" ADD CONSTRAINT outbox_attempts_nonnegative
  CHECK ("attempts" >= 0);
ALTER TABLE "MedicalRecordIndex" ADD CONSTRAINT record_integrity_hex
  CHECK ("integrityCommitment" ~ '^[0-9a-f]{64}$' AND "nonceHex" ~ '^[0-9a-f]{64}$');
CREATE INDEX "OutboxEvent_unpublished_idx" ON "OutboxEvent" ("createdAt")
  WHERE "publishedAt" IS NULL;
