import { createHash } from 'node:crypto';
import { canonicalJson } from './crypto.ts';
/** Idempotency tokens are opaque and scoped by authenticated doctor; never include PHI. */
export function normalizeIdempotencyKey(key: unknown): string | undefined {
  if (key === undefined || key === null) return undefined;
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
    throw new Error('Idempotency-Key must be 8-128 ASCII alphanumeric, _ or - characters');
  return key;
}
export function accessRequestFingerprint(body: {
 patientId:string; purpose:string; requestedTypes:string[]; requestedDurationMinutes:number;
}): string {
  return createHash('sha256').update(canonicalJson({
    patientId:body.patientId, purpose:body.purpose,
    requestedTypes:[...body.requestedTypes].sort(),
    requestedDurationMinutes:body.requestedDurationMinutes,
  })).digest('hex');
}
export function isSameIdempotentPayload(storedFingerprint:string | null | undefined, expectedFingerprint:string):boolean {
 return storedFingerprint === expectedFingerprint;
}
