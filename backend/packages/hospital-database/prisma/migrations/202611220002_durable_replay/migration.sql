-- Durable, per-hospital replay protection for horizontally scaled API replicas.
CREATE TABLE "UsedServiceToken" (
    "jti" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsedServiceToken_pkey" PRIMARY KEY ("jti")
);
CREATE INDEX "UsedServiceToken_expiresAt_idx" ON "UsedServiceToken"("expiresAt");
