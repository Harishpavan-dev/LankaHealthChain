-- Institutional governance: each hospital admin is DB-scoped, not claim-scoped.
CREATE TABLE "HospitalOperator" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "authSubject" TEXT NOT NULL,
  "hospitalId" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HospitalOperator_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HospitalOperator_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HospitalOperator_authSubject_hospitalId_key" ON "HospitalOperator"("authSubject", "hospitalId");
CREATE INDEX "HospitalOperator_hospitalId_active_idx" ON "HospitalOperator"("hospitalId", "active");

CREATE TABLE "ResearchGrant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "authSubject" TEXT NOT NULL,
  "projectName" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "approvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ResearchGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResearchGrant_expiry_check" CHECK ("expiresAt" > "approvedAt")
);
CREATE UNIQUE INDEX "ResearchGrant_authSubject_key" ON "ResearchGrant"("authSubject");
CREATE INDEX "ResearchGrant_active_expiresAt_idx" ON "ResearchGrant"("active", "expiresAt");

CREATE TABLE "AdministrativeAuditEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "hospitalId" UUID,
  "actorSub" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetKind" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdministrativeAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdministrativeAuditEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AdministrativeAuditEvent_hospitalId_createdAt_id_idx" ON "AdministrativeAuditEvent"("hospitalId", "createdAt" DESC, "id" DESC);
CREATE INDEX "AdministrativeAuditEvent_createdAt_id_idx" ON "AdministrativeAuditEvent"("createdAt" DESC, "id" DESC);

-- No UPDATE/DELETE audit mutations; database owners must use administrative migrations to change structure.
CREATE FUNCTION lhc_reject_administrative_audit_changes() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Administrative audit events are append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AdministrativeAuditEvent_immutable" BEFORE UPDATE OR DELETE ON "AdministrativeAuditEvent"
FOR EACH ROW EXECUTE FUNCTION lhc_reject_administrative_audit_changes();
