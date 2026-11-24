import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isSupportedFhirResource} from '../../packages/shared/src/fhir.ts';
const sample={resourceType:'Observation',id:'obs-hgb-001',status:'final',subject:{reference:'Patient/arun-n-0001'}};
test('valid FHIR envelope is accepted',()=>assert.equal(isSupportedFhirResource(sample),true));
test('missing or malformed patient reference is rejected',()=>{for(const sub of [{},{reference:'Practitioner/1'},{reference:'Patient/1/../../evil'},null])assert.equal(isSupportedFhirResource({...sample,subject:sub}),false);});
test('missing resource identifier is rejected',()=>assert.equal(isSupportedFhirResource({...sample,id:undefined}),false));
