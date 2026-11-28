-- Database-level defense in depth for records managed by the demonstration
-- Hospital API. Full HL7 FHIR R4 profile validation remains a separate task.
ALTER TABLE "MedicalRecord"
  ADD CONSTRAINT "MedicalRecord_externalId_shape_check"
  CHECK ("externalId" ~ '^[A-Za-z0-9._-]{1,64}$');
ALTER TABLE "MedicalRecord"
  ADD CONSTRAINT "MedicalRecord_localPatientId_shape_check"
  CHECK ("localPatientId" ~ '^[A-Za-z0-9._-]{1,80}$');
ALTER TABLE "MedicalRecord"
  ADD CONSTRAINT "MedicalRecord_resourceType_demo_check"
  CHECK ("resourceType" IN ('Observation','DiagnosticReport','MedicationRequest','AllergyIntolerance','Condition'));
ALTER TABLE "MedicalRecord"
  ADD CONSTRAINT "MedicalRecord_FHIR_envelope_check"
  CHECK (jsonb_typeof("fhir") = 'object' AND "fhir" ->> 'id' = "externalId" AND
         "fhir" ->> 'resourceType' = "resourceType");
