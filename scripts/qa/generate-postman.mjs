#!/usr/bin/env node
/** Generate safe, reproducible Postman requests from the canonical OpenAPI file.
 * Tokens are variables, never real credentials; all examples use synthetic data.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const api=JSON.parse(readFileSync('docs/api/openapi.json','utf8'));
const variables={baseUrl:'http://localhost:3000',accessToken:'',patientId:'b1111111-1111-4111-8111-111111111111',requestId:'00000000-0000-4000-8000-000000000001',consentId:'00000000-0000-4000-8000-000000000002',recordId:'00000000-0000-4000-8000-000000000003',doctorId:'00000000-0000-4000-8000-000000000004',operatorId:'00000000-0000-4000-8000-000000000005',researchGrantId:'00000000-0000-4000-8000-000000000006',hospitalCode:'venus',staffSubject:'44444444-4444-4444-8444-444444444444'};
const bodyFor=(operationId)=>{
 if(operationId==='createAccessRequest')return {patientId:'{{patientId}}',purpose:'treatment',requestedTypes:['Observation','DiagnosticReport'],requestedDurationMinutes:60};
 if(operationId==='enrollScopedDoctor')return {authSubject:'{{staffSubject}}',displayName:'Synthetic clinician'};
 if(operationId==='assignHospitalOperator')return {hospitalCode:'{{hospitalCode}}',authSubject:'{{staffSubject}}'};
 if(operationId==='assignSyntheticResearchGrant')return {authSubject:'{{staffSubject}}',projectName:'Synthetic cohort demonstration',purpose:'Privacy-preserving anonymous aggregate review',expiresAt:'2027-01-01T00:00:00Z'};
 if(operationId==='updateScopedDoctorStatus')return {verified:true};
 if(operationId==='setHospitalOperatorStatus'||operationId==='setResearchGrantStatus')return {active:false};
 if(operationId==='createSyntheticRecord')return {patientId:'{{patientId}}',resource:{resourceType:'Observation',id:'postman-synthetic-001',status:'final',code:{coding:[{system:'http://loinc.org',code:'8480-6'}]},valueQuantity:{value:120,unit:'mmHg',system:'http://unitsofmeasure.org',code:'mm[Hg]'}}};
 return undefined;
};
function pathToVars(path){return path.replace(/\{code\}/g,'{{hospitalCode}}').replace(/\/doctors\/\{id\}/g,'/doctors/{{doctorId}}').replace(/\/operators\/\{id\}/g,'/operators/{{operatorId}}').replace(/\/research-grants\/\{id\}/g,'/research-grants/{{researchGrantId}}').replace(/\/access-requests\/\{id\}/g,'/access-requests/{{requestId}}').replace(/\/consents\/\{id\}/g,'/consents/{{consentId}}').replace(/\/records\/\{id\}/g,'/records/{{recordId}}');}
const item=[];
for(const [path,verbs] of Object.entries(api.paths))for(const [verb,op] of Object.entries(verbs)){
 const basePath=pathToVars(path);
 const query=path.endsWith('/page')?'?limit=25':'';
 const raw=`{{baseUrl}}/api/v1${basePath}${query}`;
 const body=bodyFor(op.operationId);
 const request={method:verb.toUpperCase(),header:body?[{key:'Content-Type',value:'application/json'}]:[],
  auth:op['x-required-role']==='public'?{type:'noauth'}:{type:'bearer',bearer:[{key:'token',value:'{{accessToken}}',type:'string'}]},
  url:raw,description:`${op.summary}. Required role: ${op['x-required-role']}. Local synthetic-data demo only.`};
 if(body)request.body={mode:'raw',raw:JSON.stringify(body,null,2),options:{raw:{language:'json'}}};
 item.push({name:`${verb.toUpperCase()} ${path}`,request});
}
const collection={info:{name:'LankaHealthChain · Synthetic Demo API v1',description:'Auto-generated from docs/api/openapi.json. Run only against your own local synthetic-data development environment. Never include real PHI or commit access tokens.',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},
 variable:Object.entries(variables).map(([key,value])=>({key,value,type:'string'})),item};
writeFileSync('docs/api/lankahealthchain.postman_collection.json',JSON.stringify(collection,null,2)+'\n');
console.log(`Generated Postman collection: ${item.length} API operations, no embedded secrets`);
