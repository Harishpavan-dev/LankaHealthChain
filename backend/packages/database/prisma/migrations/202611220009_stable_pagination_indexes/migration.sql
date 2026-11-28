-- Stable keyset pagination uses both timestamp and UUID as a tiebreaker.
CREATE INDEX "MedicalRecordIndex_patientId_createdAt_id_idx"
  ON "MedicalRecordIndex" ("patientId", "createdAt" DESC, "id" DESC);
CREATE INDEX "AuditEvent_patientId_createdAt_id_idx"
  ON "AuditEvent" ("patientId", "createdAt" DESC, "id" DESC);
