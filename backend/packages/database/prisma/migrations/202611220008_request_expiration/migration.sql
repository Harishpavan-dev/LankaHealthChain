-- Expire unapproved requests after 24h. Existing historical rows receive a
-- 24h grace window after this migration (not a new clinical consent).
ALTER TABLE "AccessRequest" ADD COLUMN "decisionDeadlineAt" TIMESTAMPTZ(3)
  NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');
CREATE INDEX "AccessRequest_patientId_status_decisionDeadlineAt_idx"
  ON "AccessRequest" ("patientId", "status", "decisionDeadlineAt");
