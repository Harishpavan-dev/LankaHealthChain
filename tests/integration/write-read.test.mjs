/** External HTTP shape integration with an IN-MEMORY hospital double.
 * It is not a real NestJS+Prisma integration test.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {issueRecordToken,verifyRecordToken} from '../../backend/packages/shared/src/internal-token.ts';
import {ReplayGuard} from '../../backend/packages/shared/src/replay.ts';
import {canonicalJson,createCommitment,verifyCommitment} from '../../backend/packages/shared/src/crypto.ts';
import {isSupportedFhirResource} from '../../backend/packages/shared/src/fhir.ts';
const secret='Synthetic-Hospital-Scoped-Test-Secret-Only-0123456789abcdef';
function createHospital(){
 const records=new Map();const replay=new ReplayGuard();
 const server=createServer(async(req,res)=>{
  let claims;try{claims=verifyRecordToken(req.headers.authorization?.replace(/^Bearer /,'')||'',secret);}catch{res.writeHead(401).end();return;}
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/internal/v1/records'){
   if(claims.action!=='write'||claims.hospitalCode!=='venus'){res.writeHead(403).end();return;}
   let payload;try{payload=JSON.parse(await (async()=>{let s='';for await(const x of req){s+=x;if(s.length>1e6)throw Error('oversized');}return s;})());}catch{res.writeHead(400).end();return;}
   const fhir=payload?.fhir;
   if(!isSupportedFhirResource(fhir)||fhir.id!==claims.externalRecordId||
     fhir.subject.reference!==`Patient/${claims.localPatientId}`||fhir.resourceType!==claims.resourceType||
     payload.version!==claims.version){res.writeHead(403).end();return;}
   const id=`${claims.externalRecordId}:${claims.version}`;
   if(records.has(id)&&canonicalJson(records.get(id))!==canonicalJson(fhir)){res.writeHead(409).end();return;}
   if(!replay.accept(claims.jti,claims.exp)){res.writeHead(403).end();return;}
   records.set(id,fhir);res.writeHead(201,{'content-type':'application/json'}).end(JSON.stringify({created:true}));return;
  }
  if(req.method==='GET'&&url.pathname.startsWith('/internal/v1/records/')){
   if(claims.action!=='read'||url.pathname.split('/').at(-1)!==claims.externalRecordId){res.writeHead(403).end();return;}
   const body=records.get(`${claims.externalRecordId}:${claims.version}`);
   if(!body||!replay.accept(claims.jti,claims.exp)){res.writeHead(403).end();return;}
   res.writeHead(200,{'content-type':'application/fhir+json'}).end(JSON.stringify(body));return;
  }
  res.writeHead(404).end();
 });
 return new Promise(r=>server.listen(0,'127.0.0.1',()=>r({server,url:`http://127.0.0.1:${server.address().port}`})));
}
test('scoped token writes a synthetic hospital resource and separate read verifies commitment',async()=>{
 const hospital=await createHospital();
 const fhir={resourceType:'Observation',id:'obs-new-001',status:'final',
  subject:{reference:'Patient/arun-v-0088'},code:{text:'Synthetic clinical value'},valueQuantity:{value:120,unit:'mmHg'}};
 const claims={hospitalCode:'venus',externalRecordId:fhir.id,localPatientId:'arun-v-0088',resourceType:'Observation',version:1};
 const write=issueRecordToken({...claims,action:'write'},secret);
 const proof=createCommitment(fhir);
 try{
  const post=()=>fetch(`${hospital.url}/internal/v1/records`,{method:'POST',headers:{authorization:`Bearer ${write}`,'content-type':'application/json'},body:JSON.stringify({fhir,version:1})});
  assert.equal((await post()).status,201);
  assert.equal((await post()).status,403,'same signed token cannot be replayed');
  assert.equal((await fetch(`${hospital.url}/internal/v1/records/${fhir.id}?version=1`,{headers:{authorization:`Bearer ${write}`}})).status,403,'write token cannot read');
  const read=issueRecordToken(claims,secret);
  const result=await fetch(`${hospital.url}/internal/v1/records/${fhir.id}?version=1`,{headers:{authorization:`Bearer ${read}`}});
  assert.equal(result.status,200);
  assert.equal(verifyCommitment(await result.json(),proof.nonceHex,proof.commitment),true);
  assert.equal((await fetch(`${hospital.url}/internal/v1/records/${fhir.id}?version=1`,{headers:{authorization:`Bearer ${read}`}})).status,403,'read token replay refused');
 }finally{await new Promise(r=>hospital.server.close(r));}
});
