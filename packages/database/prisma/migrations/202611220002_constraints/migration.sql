-- Explicit domain constraints cannot all be modeled in Prisma schema; managed as raw migration.
-- Enforced on top of declarative schema. Do not use prisma db push in shared environments.
ALTER TABLE "AccessRequest" ADD CONSTRAINT access_duration_bounds CHECK ("requestedDurationMinutes" BETWEEN 1 AND 1440);
ALTER TABLE "AccessRequest" ADD CONSTRAINT access_status_allowed CHECK ("status" IN ('PENDING','APPROVED','REJECTED','REVOKED'));
ALTER TABLE "AccessRequest" ADD CONSTRAINT access_purpose_allowed CHECK ("purpose" IN ('treatment','follow-up'));
ALTER TABLE "Consent" ADD CONSTRAINT consent_status_allowed CHECK ("status" IN ('ACTIVE','REVOKED'));
ALTER TABLE "Consent" ADD CONSTRAINT consent_expiry_after_creation CHECK ("expiresAt" > "createdAt");
ALTER TABLE "MedicalRecordIndex" ADD CONSTRAINT record_version_positive CHECK ("recordVersion" > 0);
ALTER TABLE "MedicalRecordIndex" ADD CONSTRAINT record_anchor_status_allowed CHECK ("anchorStatus" IN ('PENDING','CONFIRMED','FAILED'));
CREATE INDEX "AuditEvent_actorSub_idx" ON "AuditEvent"("actorSub");
