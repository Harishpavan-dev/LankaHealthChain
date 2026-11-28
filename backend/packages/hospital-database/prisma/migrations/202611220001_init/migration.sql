-- Applied independently to hospital_northern, hospital_jaffna and hospital_venus.
CREATE TABLE "MedicalRecord" (
  "id" UUID NOT NULL, "externalId" TEXT NOT NULL, "localPatientId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL, "version" INTEGER NOT NULL, "fhir" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicalRecord_version_positive" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "MedicalRecord_externalId_version_key" ON "MedicalRecord"("externalId", "version");
CREATE INDEX "MedicalRecord_localPatientId_resourceType_idx" ON "MedicalRecord"("localPatientId","resourceType");
