export type ConsentState = {
  status: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  purpose: string;
  allowedTypes: string[];
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
};
export type RecordAccessContext = {
  patientId: string;
  doctorId: string;
  hospitalId: string;
  purpose: string;
  resourceType: string;
  now: Date;
};

/** Fail closed: every binding must match the authorization currently in force. */
export function isConsentValid(consent: ConsentState | null | undefined, ctx: RecordAccessContext): boolean {
  if (!consent || consent.status !== 'ACTIVE' || consent.revokedAt != null) return false;
  if (consent.patientId !== ctx.patientId || consent.doctorId !== ctx.doctorId ||
      consent.hospitalId !== ctx.hospitalId || consent.purpose !== ctx.purpose) return false;
  if (!consent.allowedTypes.includes(ctx.resourceType)) return false;
  const expiry = new Date(consent.expiresAt).getTime();
  return Number.isFinite(expiry) && ctx.now.getTime() < expiry;
}

export const ALLOWED_FHIR_TYPES = ['Observation', 'DiagnosticReport', 'MedicationRequest', 'AllergyIntolerance', 'Condition'] as const;

export function validateRequestedTypes(types: string[]): boolean {
  return types.length > 0 && types.length <= ALLOWED_FHIR_TYPES.length &&
    new Set(types).size === types.length && types.every(t => (ALLOWED_FHIR_TYPES as readonly string[]).includes(t));
}
