import { verifyCommitment } from './crypto.ts';

/** A repeat POST with the same FHIR id must not silently attach a different
 * clinical payload or a different patient to an existing Core locator. */
export function matchesExistingRecord(
  record: { patientId: string; resourceType: string; nonceHex: string; integrityCommitment: string },
  expectedPatientId: string, expectedResourceType: string, resource: unknown,
): boolean {
  return record.patientId === expectedPatientId &&
    record.resourceType === expectedResourceType &&
    verifyCommitment(resource, record.nonceHex, record.integrityCommitment);
}
