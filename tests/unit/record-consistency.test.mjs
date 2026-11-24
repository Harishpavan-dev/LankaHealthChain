import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCommitment} from '../../packages/shared/src/crypto.ts';
import {matchesExistingRecord} from '../../packages/shared/src/record-consistency.ts';
const resource = { resourceType:'Observation', id:'synthetic-a',status:'final',subject:{reference:'Patient/demo-1'},code:{text:'Synthetic example'} };
test('idempotent retry accepts only same patient, FHIR resource and original content',()=>{
 const proof=createCommitment(resource);
 const entry={patientId:'patient-a',resourceType:'Observation',nonceHex:proof.nonceHex,integrityCommitment:proof.commitment};
 assert.equal(matchesExistingRecord(entry,'patient-a','Observation',resource),true);
 assert.equal(matchesExistingRecord(entry,'patient-b','Observation',resource),false);
 assert.equal(matchesExistingRecord(entry,'patient-a','Condition',resource),false);
 assert.equal(matchesExistingRecord(entry,'patient-a','Observation',{...resource,status:'amended'}),false);
});
