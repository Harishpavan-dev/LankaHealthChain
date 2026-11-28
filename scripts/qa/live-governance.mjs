#!/usr/bin/env node
/** Requires a LOCAL running Keycloak/NestJS/PostgreSQL synthetic demo stack.
 * Uses only synthetic identities. No live Cardano, Midnight or clinical PHI.
 */
const base=process.env.LHC_SMOKE_API||process.env.VITE_API_URL?.replace(/\/api\/v1\/?$/,'')||(()=>{throw Error('Set LHC_SMOKE_API or VITE_API_URL')})();
const kc=process.env.LHC_SMOKE_KEYCLOAK||process.env.VITE_OIDC_URL||(()=>{throw Error('Set LHC_SMOKE_KEYCLOAK or VITE_OIDC_URL')})();
if(process.env.LHC_ACCEPT_SYNTHETIC_WRITE!=='YES')throw Error('Set LHC_ACCEPT_SYNTHETIC_WRITE=YES for demo governance writes');
for(const uri of [base,kc])if(!['localhost','127.0.0.1','::1'].includes(new URL(uri).hostname))
 throw Error('Governance E2E restricted to loopback synthetic environment');
function requiredDemo(name){const v=process.env[name];if(!v)throw Error(`${name} missing; source private .env`);return v;}
async function token(username,password){
 const response=await fetch(kc+'/realms/lankahealthchain/protocol/openid-connect/token',{
  method:'POST',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:'lhc-test-cli',grant_type:'password',username,password}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Keycloak demo authentication failed: '+username);
 return (await response.json()).access_token;
}
async function call(method,path,bearer,expected=200,body){
 const response=await fetch(base+'/api/v1'+path,{method,redirect:'error',signal:AbortSignal.timeout(12000),
 headers:{Authorization:`Bearer ${bearer}`,...(body===undefined?{}:{'Content-Type':'application/json'})},
 ...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(response.status!==expected)throw Error(`${method} ${path.split('?')[0]}: expected ${expected}, received ${response.status}`);
 return response.json();
}
const patient=await token('patient.arun',requiredDemo('LHC_DEMO_PATIENT_PASSWORD'));
const doctor=await token('doctor.venus',requiredDemo('LHC_DEMO_DOCTOR_PASSWORD'));
const operator=await token('hospital.venus',requiredDemo('LHC_DEMO_HOSPITAL_PASSWORD'));
const auditor=await token('auditor.demo',requiredDemo('LHC_DEMO_AUDITOR_PASSWORD'));
const researcher=await token('researcher.demo',requiredDemo('LHC_DEMO_RESEARCHER_PASSWORD'));
const admin=await token('admin.network',requiredDemo('LHC_DEMO_ADMIN_PASSWORD'));
// Check the dedicated worker is alive and its telemetry has no clinical data.
let workerState;
for(let attempt=0;attempt<30;attempt++){
 workerState=await call('GET','/admin/worker-status',admin);
 if(workerState.status==='healthy')break;
 await new Promise(resolve=>setTimeout(resolve,2000));
}
if(workerState?.worker!=='cardano-anchor-preparer' || workerState.status!=='healthy' ||
 workerState.clinicalDataExposed!==false ||
 !Number.isSafeInteger(workerState.queued) || !Number.isSafeInteger(workerState.deadLettered) ||
 'patientId' in workerState || 'privateKey' in workerState || 'inclusionProof' in workerState)
 throw Error('Worker status unhealthy or unsafe');
await call('GET','/admin/worker-status',operator,403);
await call('GET','/admin/worker-status',auditor,403);
console.log('PASS: Dedicated worker is healthy and monitoring does not expose clinical information');
const assignments=await call('GET','/hospital-admin/hospitals',operator);
if(assignments.length!==1||assignments[0].hospital.code!=='venus')throw Error('Scoped membership incorrect');
await call('GET','/hospital-admin/hospitals/northern/overview',operator,403);
const overview=await call('GET','/hospital-admin/hospitals/venus/overview',operator);
if(overview.clinicalDataExposed!==false||overview.doctors<1)throw Error('Hospital overview invalid');
const people=await call('GET','/hospital-admin/hospitals/venus/doctors/page?limit=10',operator);
if(!people.items.length||typeof people.items[0].id!=='string')throw Error('Scoped doctor listing unavailable');
await call('GET','/patients/me/timeline',operator,403);
await call('GET','/hospital-admin/hospitals/venus/overview',patient,403);
console.log('PASS: Hospital administrator scoped to Venus only; no patient records');
const audit=await call('GET','/security-audit/summary',auditor);
if(audit.clinicalDataExposed!==false||audit.identifiersExposed!==false)throw Error('Audit summary privacy missing');
const events=await call('GET','/security-audit/events/page?limit=10',auditor);
for(const e of events.items){for(const privateField of ['patientId','actorSub','recordIndexId','metadata','resource'])
 if(privateField in e)throw Error('Audit event leaked '+privateField);}
await call('GET','/security-audit/summary',doctor,403);
console.log('PASS: Auditor has read-only, de-identified events and role isolation');
const grant=await call('GET','/research/me',researcher);
const agg=await call('GET','/research/aggregates',researcher);
if(grant.mode!=='SYNTHETIC_AGGREGATES_ONLY'||agg.minimumCellSize!==10||agg.resourceCounts.some(x=>x.count<10))
 throw Error('Research suppression or approval policy invalid');
await call('GET','/research/aggregates',patient,403);
console.log('PASS: Researcher restricted to approved synthetic aggregate cells >=10');
const operators=await call('GET','/admin/operators',admin);
const scoped=operators.find(x=>x.authSubject==='44444444-4444-4444-8444-444444444444');
if(!scoped)throw Error('Demo hospital operator missing');
const grants=await call('GET','/admin/research-grants',admin);
const scopedGrant=grants.find(x=>x.authSubject==='66666666-6666-4666-8666-666666666666');
if(!scopedGrant)throw Error('Synthetic researcher grant missing');
await call('PATCH',`/admin/operators/${scoped.id}/status`,admin,200,{active:false});
await call('GET','/hospital-admin/hospitals/venus/overview',operator,403);
await call('PATCH',`/admin/operators/${scoped.id}/status`,admin,200,{active:true});
await call('GET','/hospital-admin/hospitals/venus/overview',operator,200);
console.log('PASS: DB-backed hospital operator revocation/restore immediately enforced');
await call('PATCH',`/admin/research-grants/${scopedGrant.id}/status`,admin,200,{active:false});
await call('GET','/research/aggregates',researcher,403);
await call('PATCH',`/admin/research-grants/${scopedGrant.id}/status`,admin,200,{active:true});
await call('GET','/research/aggregates',researcher,200);
console.log('PASS: DB-backed researcher revocation/restore immediately enforced');
const auditEvents=await call('GET','/security-audit/admin-events/page?limit=10',auditor);
if(!auditEvents.items.some(x=>x.action.includes('REVOKED')))throw Error('Governance changes missing from audit');
console.log('PASS: Governance events are audited and readable only in redacted form');
console.log('LOCAL SYNTHETIC GOVERNANCE E2E PASS; no blockchain integration tested');
