import test from 'node:test';
import assert from 'node:assert/strict';
import {fhirPatientReference,bindFhirPatient,isSupportedFhirResource,validateDemoClinicalWrite} from '../../packages/shared/src/fhir.ts';
const local='synthetic-123';
test('FHIR R4 AllergyIntolerance uses patient instead of subject',()=>{
 const original={resourceType:'AllergyIntolerance',id:'allergy-01',subject:{reference:'Patient/attacker'},code:{text:'Synthetic drug allergy'}};
 const bound=bindFhirPatient(original,local);
 assert.equal(bound.subject,undefined);
 assert.deepEqual(bound.patient,{reference:`Patient/${local}`});
 assert.equal(fhirPatientReference(bound),`Patient/${local}`);
 assert.equal(isSupportedFhirResource(bound),true);
 assert.equal(validateDemoClinicalWrite(bound),true);
 assert.equal(isSupportedFhirResource({...bound,subject:{reference:'Patient/attacker'}}),false);
});
test('FHIR Observation requires a real coding or text and bounded numeric values',()=>{
 const base={resourceType:'Observation',id:'obs-001',status:'final',subject:{reference:'Patient/test'}};
 assert.equal(isSupportedFhirResource(base),true); // envelope != clinical validation
 assert.equal(validateDemoClinicalWrite(base),false);
 assert.equal(validateDemoClinicalWrite({...base,code:{text:'BP'},valueQuantity:{value:120,unit:'mmHg'}}),true);
 assert.equal(validateDemoClinicalWrite({...base,code:{text:'BP'},valueQuantity:{value:'120',unit:'mmHg'}}),false);
 assert.equal(validateDemoClinicalWrite({...base,code:{text:'BP'},valueQuantity:{value:120,unit:'mmHg'},note:'x'.repeat(300000)}),false);
});
test('FHIR MedicationRequest requires medication and intent, wrong patient reference rejected',()=>{
 const base={resourceType:'MedicationRequest',id:'med-001',status:'active',subject:{reference:'Patient/test'}};
 assert.equal(validateDemoClinicalWrite(base),false);
 assert.equal(validateDemoClinicalWrite({...base,intent:'order',medicationCodeableConcept:{text:'Synthetic medication'}}),true);
 assert.equal(isSupportedFhirResource({...base,subject:{reference:'Patient/../../other'}}),false);
});
test('patient binding refuses attacker-provided reference and invalid local ids',()=>{
 const b=bindFhirPatient({resourceType:'Condition',subject:{reference:'Patient/other'},patient:{reference:'Patient/fake'},code:{text:'synthetic'}},local);
 assert.deepEqual(b.subject,{reference:`Patient/${local}`});
 assert.equal(b.patient,undefined);
 assert.throws(()=>bindFhirPatient({resourceType:'Observation'},'bad/id'));
});
