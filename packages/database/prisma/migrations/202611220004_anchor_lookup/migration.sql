-- Randomized commitment is a unique immutable record-version identifier.
CREATE UNIQUE INDEX "MedicalRecordIndex_integrityCommitment_key" ON "MedicalRecordIndex"("integrityCommitment");
