// Duplicate the small allowlist here to keep this parser dependency-free.
const ALLOWED_FHIR_TYPES = ['Observation', 'DiagnosticReport', 'MedicationRequest', 'AllergyIntolerance', 'Condition'] as const;

/** Basic envelope guard only. For production add profile validation and terminology service. */
export function isSupportedFhirResource(resource: unknown): resource is Record<string, unknown> {
  if (resource === null || typeof resource !== 'object' || Array.isArray(resource)) return false;
  const item = resource as Record<string, unknown>;
  return typeof item.resourceType === 'string' &&
    (ALLOWED_FHIR_TYPES as readonly string[]).includes(item.resourceType) &&
    typeof item.status === 'string' && item.status.length > 0 &&
    item.subject !== null && typeof item.subject === 'object';
}
