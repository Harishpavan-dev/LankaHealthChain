/** Network-protocol integration on ephemeral localhost sockets using the shared domain
 * code and synthetic hospital fixtures. NO NestJS, PostgreSQL or blockchain here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCommitment, verifyCommitment } from '../../packages/shared/src/crypto.ts';
import { verifyRecordToken, issueRecordToken } from '../../packages/shared/src/internal-token.ts';
import { isConsentValid } from '../../packages/shared/src/authorization.ts';
import { isSupportedFhirResource } from '../../packages/shared/src/fhir.ts';
import { ReplayGuard } from '../../packages/shared/src/replay.ts';
const fixture=JSON.parse(readFileSync(resolve('demo/fixtures/records.json'),'utf8'));
const secret='Local-FHIR-Integration-Only-Secret-Not-For-Production-123456789';
const patientId='synthetic-patient', doctorId='synthetic-doctor', hospitalId='venus';
const refs={northern:'arun-n-0001',jaffna:'arun-j-0099',venus:'arun-v-0088'};
function startHospital(code) {
 const replay=new ReplayGuard();
 const active=fixture[code];
 const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method!=='GET' || !url.pathname.startsWith('/internal/v1/records/')) {res.writeHead(404).end();return;}
  let claims;
  try{claims=verifyRecordToken(req.headers.authorization?.replace(/^Bearer /,'')||'',secret);}
  catch{res.writeHead(401).end();return;}
  const record=active.find(r=>r.externalId===url.pathname.split('/').at(-1) && String(r.version)===url.searchParams.get('version'));
  if(!record || claims.hospitalCode!==code || claims.externalRecordId!==record.externalId ||
     claims.resourceType!==record.resourceType || claims.localPatientId!==record.localPatientId ||
     claims.version!==record.version || !replay.accept(claims.jti,claims.exp)) {res.writeHead(403).end();return;}
  res.writeHead(200,{'Content-Type':'application/fhir+json'}).end(JSON.stringify(record.fhir));
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({server,baseUrl:`http://127.0.0.1:${server.address().port}`})));
}
test('real localhost HTTP: deny -> approve -> retrieve across 3 DB simulators -> tamper reject -> revoke deny',async()=>{
 const hosts={}; for(const code of Object.keys(fixture)) hosts[code]=await startHospital(code);
 const audit=[];
 const records=Object.entries(fixture).flatMap(([hospital,rs])=>rs.map(r=>({...r,hospital,proof:createCommitment(r.fhir)})));
 let consent=null;
 async function access(requestingDoctor,requestedType){
   const allowed = isConsentValid(consent,{
      patientId,doctorId:requestingDoctor,hospitalId,purpose:'treatment',resourceType:requestedType,now:new Date()
   });
   if(!allowed) {audit.push('DENY'); return {status:403,records:[]};}
   const result=[];
   for(const r of records.filter(x=>x.resourceType===requestedType)){
    const token=issueRecordToken({hospitalCode:r.hospital,externalRecordId:r.externalId,
     localPatientId:refs[r.hospital],resourceType:r.resourceType,version:r.version},secret);
    const response=await fetch(`${hosts[r.hospital].baseUrl}/internal/v1/records/${r.externalId}?version=${r.version}`,
     {headers:{authorization:`Bearer ${token}`}});
    if(response.status!==200) {audit.push('SOURCE_DENY'); return {status:502,records:[]};}
    const resource=await response.json();
    if(!isSupportedFhirResource(resource)||resource.id!==r.externalId ||
      resource.subject.reference!==`Patient/${refs[r.hospital]}` ||
      !verifyCommitment(resource,r.proof.nonceHex,r.proof.commitment)) {audit.push('TAMPER');return {status:409,records:[]};}
    result.push(resource);
   }
   audit.push('ALLOW');return {status:200,records:result};
 }
 try{
  assert.equal((await access(doctorId,'Observation')).status,403,'No consent must fail closed');
  consent={status:'ACTIVE',patientId,doctorId,hospitalId,purpose:'treatment',allowedTypes:['Observation','MedicationRequest'],expiresAt:new Date(Date.now()+60000)};
  const observations=await access(doctorId,'Observation');
  assert.equal(observations.status,200);assert.equal(observations.records.length,2);
  assert.equal((await access(doctorId,'MedicationRequest')).records.length,1);
  assert.equal((await access('unauthorized-doctor','Observation')).status,403);
  assert.equal((await access(doctorId,'DiagnosticReport')).status,403);
  // Simulate source hospital changing its raw record AFTER its commitment was registered.
  fixture.northern[0].fhir.valueQuantity.value=0;
  assert.equal((await access(doctorId,'Observation')).status,409,'Tampering must reject response');
  consent.status='REVOKED'; consent.revokedAt=new Date();
  assert.equal((await access(doctorId,'Observation')).status,403,'Revocation must deny further reads');
  assert.deepEqual(audit,['DENY','ALLOW','ALLOW','DENY','DENY','TAMPER','DENY']);
 } finally { for(const c of Object.keys(hosts))await new Promise(resolve=>hosts[c].server.close(resolve)); }
});
