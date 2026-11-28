-- Source-side locators must be FHIR-safe, versioned, and belong to the
-- supported synthetic MVP resource types. This protects the integration layer
-- independently of application DTO validation. Do not apply to real FHIR
-- deployments without broadening the clinical profile first.
ALTER TABLE "MedicalRecordIndex"
  ADD CONSTRAINT "MedicalRecordIndex_remoteRecordId_shape_check"
  CHECK ("remoteRecordId" ~ '^[A-Za-z0-9._-]{1,64}$');
ALTER TABLE "MedicalRecordIndex"
  ADD CONSTRAINT "MedicalRecordIndex_resourceType_demo_check"
  CHECK ("resourceType" IN ('Observation','DiagnosticReport','MedicationRequest','AllergyIntolerance','Condition'));
ALTER TABLE "PatientIdentityMap"
  ADD CONSTRAINT "PatientIdentityMap_localPatientRef_shape_check"
  CHECK ("localPatientRef" ~ '^[A-Za-z0-9._-]{1,80}$');
