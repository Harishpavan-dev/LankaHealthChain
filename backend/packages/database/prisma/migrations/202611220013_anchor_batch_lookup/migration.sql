-- Recovery worker queries pending prepared batches by Merkle root. This
-- index avoids a full scan as the anchoring queue grows across hospitals.
CREATE INDEX "RecordAnchor_batchId_status_idx" ON "RecordAnchor"("batchId", "status");
