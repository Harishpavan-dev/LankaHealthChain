import test from 'node:test';
import assert from 'node:assert/strict';
import { isConsentValid, validateRequestedTypes } from '../../backend/packages/shared/src/authorization.ts';

const consent = {
  status: 'ACTIVE', patientId: 'patient-A', doctorId: 'doctor-B', hospitalId: 'hospital-C',
  purpose: 'treatment', allowedTypes: ['Observation'], expiresAt: '2026-12-01T00:00:00Z', revokedAt: null,
};
const context = {
  patientId: 'patient-A', doctorId: 'doctor-B', hospitalId: 'hospital-C',
  purpose: 'treatment', resourceType: 'Observation', now: new Date('2026-11-22T00:00:00Z'),
};
test('scoped active consent authorizes', () => assert.equal(isConsentValid(consent, context), true));
for (const [reason, altered] of [
  ['revoked', { ...consent, revokedAt: '2026-11-23T00:00:00Z' }],
  ['status denied', { ...consent, status: 'REVOKED' }],
  ['different doctor', { ...consent, doctorId: 'attacker' }],
  ['different hospital', { ...consent, hospitalId: 'attacker' }],
  ['different patient', { ...consent, patientId: 'attacker' }],
  ['wrong purpose', { ...consent, purpose: 'analytics' }],
  ['wrong type', { ...consent, allowedTypes: ['MedicationRequest'] }],
  ['expired', { ...consent, expiresAt: '2026-11-01T00:00:00Z' }],
]) test(`consent blocks ${reason}`, () => assert.equal(isConsentValid(altered, context), false));
test('expiry boundary is exclusive', () => assert.equal(isConsentValid(consent, { ...context, now: new Date(consent.expiresAt) }), false));
test('FHIR type allowlist rejects unexpected and repeated scopes', () => {
  assert.equal(validateRequestedTypes(['Observation', 'MedicationRequest']), true);
  assert.equal(validateRequestedTypes(['Patient']), false);
  assert.equal(validateRequestedTypes(['Observation','Observation']), false);
  assert.equal(validateRequestedTypes([]), false);
});
