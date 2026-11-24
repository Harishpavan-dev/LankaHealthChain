// Duplicate the small allowlist here to keep this parser dependency-free.
const ALLOWED_FHIR_TYPES = ['Observation', 'DiagnosticReport', 'MedicationRequest', 'AllergyIntolerance', 'Condition'] as const;

/** Basic envelope guard only. For production add profile validation and terminology service. */
export function isSupportedFhirResource(resource: unknown): resource is Record<string, unknown> {
  if (resource === null || typeof resource !== 'object' || Array.isArray(resource)) return false;
  const item = resource as Record<string, unknown>;
  const subject = item.subject as { reference?: unknown } | null;
  // R4 Condition and AllergyIntolerance do NOT expose a required `status` string.
  // Other supported resources require a nonempty status in this demo envelope.
  const requiresStatus = !['Condition', 'AllergyIntolerance'].includes(String(item.resourceType));
  return typeof item.resourceType === 'string' &&
    (ALLOWED_FHIR_TYPES as readonly string[]).includes(item.resourceType) &&
    (!requiresStatus || (typeof item.status === 'string' && item.status.length > 0)) &&
    subject !== null && typeof subject === 'object' && typeof subject.reference === 'string' &&
    /^Patient\/[a-zA-Z0-9._-]{1,80}$/.test(subject.reference) &&
    typeof item.id === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(item.id);
}
