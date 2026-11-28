-- v0.10: durable outbox scheduling and deliberately nonclinical worker heartbeat.
ALTER TABLE "OutboxEvent" ADD COLUMN "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OutboxEvent" ADD COLUMN "deadLetteredAt" TIMESTAMPTZ(3);
ALTER TABLE "OutboxEvent" ADD COLUMN "lastErrorCode" VARCHAR(64);
CREATE INDEX "OutboxEvent_delivery_ready_idx" ON "OutboxEvent"("publishedAt", "deadLetteredAt", "nextAttemptAt", "createdAt");

CREATE TABLE "WorkerHeartbeat" (
  "id" VARCHAR(64) NOT NULL,
  "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSuccessAt" TIMESTAMPTZ(3),
  "lastErrorCode" VARCHAR(64),
  "preparedTotal" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "WorkerHeartbeat" ADD CONSTRAINT "WorkerHeartbeat_preparedTotal_check" CHECK ("preparedTotal" >= 0);
