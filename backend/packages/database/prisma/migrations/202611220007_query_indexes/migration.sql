-- Indexes for the bounded patient timeline, consent history and pending anchors.
CREATE INDEX "MedicalRecordIndex_patientId_createdAt_idx" ON "MedicalRecordIndex"("patientId", "createdAt" DESC);
CREATE INDEX "MedicalRecordIndex_anchorStatus_createdAt_idx" ON "MedicalRecordIndex"("anchorStatus", "createdAt");
CREATE INDEX "Consent_patientId_createdAt_idx" ON "Consent"("patientId", "createdAt" DESC);
