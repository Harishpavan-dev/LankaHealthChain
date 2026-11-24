import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isSupportedFhirResource} from '../../packages/shared/src/fhir.ts';
const data=JSON.parse(readFileSync(new URL('../../demo/fixtures/population.json',import.meta.url),'utf8'));
test('exactly 100 synthetic patients and 500 synthetic FHIR resources',()=>{
 assert.equal(data.patients.length,100);
 assert.equal(Object.values(data.records).reduce((acc,items)=>acc+items.length,0),500);
 assert.equal(new Set(data.patients.map(p=>p.id)).size,100);
});
test('every record belongs to correct fake hospital-local patient',()=>{
 const known=new Map();
 for(const patient of data.patients)for(const code of ['northern','jaffna','venus'])known.set(`${code}:${patient.localRef[code]}`,patient.id);
 for(const [code,items] of Object.entries(data.records)){
  assert.equal(new Set(items.map(r=>r.externalId)).size,items.length);
  for(const record of items){
   assert.ok(known.has(`${code}:${record.localPatientId}`));
   assert.equal(record.fhir.subject.reference,`Patient/${record.localPatientId}`);
   assert.equal(isSupportedFhirResource(record.fhir),true);
  }
 }
});
