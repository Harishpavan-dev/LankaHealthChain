-- v0.7: deterministic keyset pagination for doctor access and patient consent history.
-- These are non-unique indices; primary IDs already provide stable tie-breaks.
CREATE INDEX "AccessRequest_doctorId_createdAt_id_idx"
  ON "AccessRequest"("doctorId", "createdAt" DESC, "id" DESC);
CREATE INDEX "Consent_patientId_createdAt_id_idx"
  ON "Consent"("patientId", "createdAt" DESC, "id" DESC);
