import test from 'node:test';
import assert from 'node:assert/strict';
import { isSupportedFhirResource } from '../../packages/shared/src/fhir.ts';
test('FHIR envelope validates allowed resource types', () => {
  assert.equal(isSupportedFhirResource({ resourceType: 'Observation', id: 'obs-test-001', status: 'final', subject: { reference: 'Patient/test' } }), true);
  assert.equal(isSupportedFhirResource({ resourceType: 'Patient', status: 'final', subject: {} }), false);
  assert.equal(isSupportedFhirResource({ resourceType: 'Observation', subject: {} }), false);
  assert.equal(isSupportedFhirResource(null), false);
});

test('FHIR R4 Condition and AllergyIntolerance have no required `status` attribute', () => {
 for(const type of ['Condition','AllergyIntolerance']) {
   assert.equal(isSupportedFhirResource({resourceType:type,id:'clinical-001',...(type==='AllergyIntolerance'?{patient:{reference:'Patient/test'}}:{subject:{reference:'Patient/test'}})}),true);
 }
 assert.equal(isSupportedFhirResource({resourceType:'DiagnosticReport',id:'report-001',subject:{reference:'Patient/test'}}),false);
});
