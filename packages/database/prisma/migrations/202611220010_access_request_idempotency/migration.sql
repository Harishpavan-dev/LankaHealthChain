-- Optional doctor-scoped idempotency for POST /api/v1/access-requests.
-- PostgreSQL allows multiple NULL keys; only explicitly keyed retries are deduplicated.
ALTER TABLE "AccessRequest"
  ADD COLUMN "clientRequestKey" VARCHAR(128),
  ADD COLUMN "clientRequestFingerprint" VARCHAR(64);
CREATE UNIQUE INDEX "AccessRequest_doctorId_clientRequestKey_key"
  ON "AccessRequest"("doctorId", "clientRequestKey");
ALTER TABLE "AccessRequest"
  ADD CONSTRAINT "AccessRequest_idempotency_pair_check"
  CHECK (("clientRequestKey" IS NULL AND "clientRequestFingerprint" IS NULL) OR
         ("clientRequestKey" IS NOT NULL AND "clientRequestFingerprint" ~ '^[a-f0-9]{64}$'));
