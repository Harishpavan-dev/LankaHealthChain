#!/usr/bin/env node
/** Deterministic fictional dataset, NEVER derived from real medical records.
 * Generates 100 patients * 5 FHIR-envelope medical resources = 500 records.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const output=new URL('../demo/fixtures/population.json',import.meta.url);
function uuid(seed){const s=createHash('sha256').update(`LHC:SYNTHETIC:${seed}`).digest('hex');return `${s.slice(0,8)}-${s.slice(8,12)}-4${s.slice(13,16)}-8${s.slice(17,20)}-${s.slice(20,32)}`;}
const data={dataset:'LankaHealthChain-Synthetic-v1',patients:[],records:{northern:[],jaffna:[],venus:[]}};
for(let i=1;i<=100;i++){
 const idx=String(i).padStart(3,'0');
 const localRef={northern:`synthetic-n-${idx}`,jaffna:`synthetic-j-${idx}`,venus:`synthetic-v-${idx}`};
 data.patients.push({id:uuid(`patient-${idx}`),authSubject:uuid(`auth-${idx}`),displayName:`Synthetic Patient ${idx}`,localRef});
 const clinical=[
  {hospital:'northern',type:'Observation',id:`syn-n-${idx}-hgb`,fhir:{status:'final',code:{coding:[{system:'http://loinc.org',code:'718-7'}]},valueQuantity:{value:12.0+(i%26)/10,unit:'g/dL',system:'http://unitsofmeasure.org',code:'g/dL'}}},
  {hospital:'northern',type:'DiagnosticReport',id:`syn-n-${idx}-cbc`,fhir:{status:'final',code:{text:'Synthetic full blood count'}}},
  {hospital:'jaffna',type:'MedicationRequest',id:`syn-j-${idx}-med`,fhir:{status:'active',intent:'order',medicationCodeableConcept:{text:'Fictional sample prescription — not for clinical use'}}},
  {hospital:'jaffna',type:'Observation',id:`syn-j-${idx}-temp`,fhir:{status:'final',code:{coding:[{system:'http://loinc.org',code:'8310-5'}]},valueQuantity:{value:36+(i%15)/10,unit:'°C'}}},
  {hospital:'venus',type:'Observation',id:`syn-v-${idx}-bp`,fhir:{status:'final',code:{coding:[{system:'http://loinc.org',code:'8480-6'}]},valueQuantity:{value:105+(i%40),unit:'mmHg',system:'http://unitsofmeasure.org',code:'mm[Hg]'}}},
 ];
 for(const r of clinical){
  const subject={reference:`Patient/${localRef[r.hospital]}`};
  const fhir={resourceType:r.type,id:r.id,subject,...r.fhir};
  data.records[r.hospital].push({externalId:r.id,localPatientId:localRef[r.hospital],resourceType:r.type,version:1,fhir});
 }
}
writeFileSync(output,JSON.stringify(data,null,2)+'\n',{flag:'w'});
console.log('Wrote 100 fictional patients and 500 FHIR envelopes to demo/fixtures/population.json');
