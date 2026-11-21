#!/usr/bin/env node
/**
 * Real-stack E2E against independently running NestJS, Keycloak, 4 Postgres
 * databases and 3 Hospital APIs. NEVER USE WITH REAL PATIENT DATA.
 * Intentionally loopback-only; this test creates/revokes synthetic consent and
 * inserts a synthetic resource. It does NOT test Cardano/Midnight networks.
 */
import {randomUUID} from 'node:crypto';
const allowedHost = u => ['localhost','127.0.0.1','::1'].includes(new URL(u).hostname);
const origin = process.env.LHC_SMOKE_API || 'http://127.0.0.1:3000';
const kc = process.env.LHC_SMOKE_KEYCLOAK || 'http://127.0.0.1:8080';
if (process.env.LHC_ACCEPT_SYNTHETIC_WRITE !== 'YES') {
 console.error('Refusing synthetic DB writes. Explicitly set LHC_ACCEPT_SYNTHETIC_WRITE=YES');
 process.exit(2);
}
if (!allowedHost(origin)||!allowedHost(kc)) throw new Error('Live E2E is restricted to loopback origins');
const patientId='b1111111-1111-4111-8111-111111111111';
const base=`${origin}/api/v1`;
let consentId;
let requestId;
async function token(username,password){
 const endpoint=`${kc}/realms/lankahealthchain/protocol/openid-connect/token`;
 const response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:'lhc-test-cli',grant_type:'password',username,password}),signal:AbortSignal.timeout(12000)});
 const body=await response.json();
 if(!response.ok||typeof body.access_token!=='string')throw new Error(`Demo test-client login failed: HTTP ${response.status}`);
 return body.access_token;
}
async function call(method,path,accessToken,body,expected=200,extraHeaders={}){
 const response=await fetch(`${base}${path}`,{method,redirect:'error',
  headers:{Authorization:`Bearer ${accessToken}`,...(body===undefined?{}:{'Content-Type':'application/json'}),...extraHeaders},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
 let result;try{result=await response.json();}catch{result=null;}
 if(response.status!==expected){
  // Do not print PHI, session credentials or returned record bodies.
  throw new Error(`${method} ${path.split('?')[0]} returned HTTP ${response.status}; expected ${expected}`);
 }
 return result;
}
function verify(expr,message){if(!expr)throw new Error(message);}
async function main(){
 const doctor=await token('doctor.venus',process.env.LHC_DEMO_DOCTOR_PASSWORD||'DemoDoctor123!');
 const patient=await token('patient.arun',process.env.LHC_DEMO_PATIENT_PASSWORD||'DemoPatient123!');
 const admin=await token('admin.network',process.env.LHC_DEMO_ADMIN_PASSWORD||'DemoAdmin123!');
 console.log('PASS: Keycloak issued patient, doctor and administrator demo access tokens');
 const dependencyHealth=await call('GET','/admin/dependencies',admin);
 verify(dependencyHealth.status==='ready' && Array.isArray(dependencyHealth.hospitals) &&
   dependencyHealth.hospitals.length===3 && dependencyHealth.hospitals.every(h=>h.status==='ready'),
   'One or more local Hospital APIs have not confirmed database readiness');
 verify(!JSON.stringify(dependencyHealth).includes('http://') && dependencyHealth.clinicalDataExposed===false,
   'Admin readiness leaked an internal endpoint or clinical data');
 await call('GET','/admin/dependencies',patient,undefined,403);
 console.log('PASS: Hospital readiness checks are admin-only and expose no internal URLs');
 const requestBody={patientId,purpose:'treatment',requestedTypes:['Observation','MedicationRequest'],requestedDurationMinutes:10};
 const retryKey=`lhc-smoke-${randomUUID()}`;
 const init=await call('POST','/access-requests',doctor,requestBody,201,{'Idempotency-Key':retryKey});
 verify(typeof init.id==='string','No request ID returned'); requestId=init.id;
 const retry=await call('POST','/access-requests',doctor,requestBody,201,{'Idempotency-Key':retryKey});
 verify(retry.id===requestId,'Identical retry created a duplicate request');
 await call('POST','/access-requests',doctor,{...requestBody,requestedDurationMinutes:11},409,{'Idempotency-Key':retryKey});
 console.log('PASS: Doctor created scoped request; same-key retry deduplicated and changed body rejected');
 const doctorPage=await call('GET','/access-requests/mine/page?limit=1',doctor);
 verify(Array.isArray(doctorPage.items) && doctorPage.items.length===1,'Doctor request pagination failed');
 verify(typeof doctorPage.nextCursor==='string' || doctorPage.nextCursor===null,'Doctor pagination cursor malformed');
 await call('GET','/access-requests/mine/page?limit=101',doctor,undefined,400);
 await call('GET','/access-requests/mine/page',patient,undefined,403);
 console.log('PASS: Doctor history pagination and invalid role/limit denials');
 await call('GET',`/access-requests/${requestId}/records`,doctor,undefined,403);
 console.log('PASS: Pre-approval records are denied');
 const approved=await call('POST',`/access-requests/${requestId}/approve`,patient,undefined,201);
 verify(approved.verificationMode==='LOCAL_DEMO_NOT_MIDNIGHT','Consent must be explicitly local-demo');
 consentId=approved.id;
 console.log('PASS: Patient approved, correctly marked LOCAL_DEMO_NOT_MIDNIGHT');
 const patientConsents=await call('GET','/patients/me/consents/page?limit=2',patient);
 verify(Array.isArray(patientConsents.items) && patientConsents.items.some(c=>c.id===consentId),'Patient consent page omitted approved consent');
 await call('GET','/patients/me/consents/page',doctor,undefined,403);
 console.log('PASS: Patient consent pagination and invalid-doctor access denial');
 const records=await call('GET',`/access-requests/${requestId}/records`,doctor);
 verify(Array.isArray(records)&&records.length>=1,'No synthetic records returned');
 verify(records.every(r=>r.integrity?.localHash==='MATCH'),'A FHIR local integrity mismatch occurred');
 console.log(`PASS: Authorized cross-hospital retrieval (${records.length} synthetic records, local hash only)`);
 const firstPage=await call('GET',`/access-requests/${requestId}/records/page?limit=1`,doctor);
 verify(firstPage.items.length===1 && typeof firstPage.nextCursor==='string','Record page 1 or cursor missing');
 const secondPage=await call('GET',`/access-requests/${requestId}/records/page?limit=1&cursor=${firstPage.nextCursor}`,doctor);
 verify(secondPage.items.length===1 && secondPage.items[0].recordId!==firstPage.items[0].recordId,'Record pagination reused a row');
 console.log('PASS: Real medical-record pagination and patient-scoped cursor traversal');
 await call('GET',`/access-requests/${requestId}/records`,patient,undefined,403);
 console.log('PASS: Patient token cannot impersonate doctor');
 const observationId=`smoke-${randomUUID()}`;
 const created=await call('POST','/records',doctor,{patientId,resource:{
   resourceType:'Observation',id:observationId,status:'final',
   code:{coding:[{system:'http://loinc.org',code:'8480-6'}]},
   valueQuantity:{value:117,unit:'mmHg',system:'http://unitsofmeasure.org',code:'mm[Hg]'},
 }},201);
 verify(created.anchorStatus==='PENDING','New record should await Cardano anchoring');
 const timeline=await call('GET','/patients/me/timeline',patient);
 verify(Array.isArray(timeline)&&timeline.some(r=>r.id===created.id),'Synthetic record not indexed in patient timeline');
 console.log('PASS: Doctor write persisted and indexed at owning hospital');
 const page=await call('GET','/patients/me/timeline/page?limit=2',patient);
 verify(Array.isArray(page.items)&&page.items.length<=2,'Paginated timeline missing or invalid');
 console.log('PASS: Cursor-paginated patient timeline');
 const revoked=await call('POST',`/consents/${consentId}/revoke`,patient,undefined,201);
 verify(revoked.status==='REVOKED','Revoke call did not return REVOKED');
 await call('GET',`/access-requests/${requestId}/records`,doctor,undefined,403);
 console.log('PASS: Revocation blocks subsequent records');
 console.log('REAL-STACK LOCAL-DEMO E2E PASS (no Cardano or Midnight on-chain claims).');
}
main().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1;});
