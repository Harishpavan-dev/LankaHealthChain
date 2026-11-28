-- Idempotent batching: one record registration event per record-version and
-- one prepared/confirmed anchor per record-version and batch Merkle root.
CREATE UNIQUE INDEX "OutboxEvent_eventType_aggregateId_key" ON "OutboxEvent"("eventType","aggregateId");
CREATE UNIQUE INDEX "RecordAnchor_recordIndexId_batchId_key" ON "RecordAnchor"("recordIndexId","batchId");
