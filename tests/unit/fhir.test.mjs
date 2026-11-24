import test from 'node:test';
import assert from 'node:assert/strict';
import { isSupportedFhirResource } from '../../packages/shared/src/fhir.ts';
test('FHIR envelope validates allowed resource types', () => {
  assert.equal(isSupportedFhirResource({ resourceType: 'Observation', status: 'final', subject: { reference: 'Patient/test' } }), true);
  assert.equal(isSupportedFhirResource({ resourceType: 'Patient', status: 'final', subject: {} }), false);
  assert.equal(isSupportedFhirResource({ resourceType: 'Observation', subject: {} }), false);
  assert.equal(isSupportedFhirResource(null), false);
});
