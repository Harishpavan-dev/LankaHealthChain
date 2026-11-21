import test from 'node:test';
import assert from 'node:assert/strict';
import {probeHospitalReadiness} from '../../packages/shared/src/hospital-readiness.ts';
const config={HOSPITAL_NORTHERN_URL:'http://hospital-northern:4101',NODE_ENV:'development'};
const hospital={code:'northern',baseUrl:'http://hospital-northern:4101',active:true};
const healthy=async url=>{
 assert.equal(url.href,'http://hospital-northern:4101/health/ready');
 return new Response(JSON.stringify({hospital:'northern',status:'ready'}),{status:200});
};
test('hospital readiness only trusts the pinned hostname and expected hospital code',async()=>{
 assert.deepEqual(await probeHospitalReadiness(hospital,'northern',config,healthy),{code:'northern',status:'ready'});
 const attack={...hospital,baseUrl:'http://127.0.0.1:9090'};
 assert.equal((await probeHospitalReadiness(attack,'northern',config,healthy)).status,'unavailable');
 assert.equal((await probeHospitalReadiness({...hospital,code:'venus'},'northern',config,healthy)).status,'unavailable');
});
test('hospital readiness rejects failures, timeouts, unexpected bodies and oversized responses',async()=>{
 const callbacks=[async()=>new Response('down',{status:503}),async()=>{throw new Error('connection failed')},
  async()=>new Response(JSON.stringify({status:'ready',hospital:'venus'}),{status:200}),
  async()=>new Response(JSON.stringify({hospital:'northern',status:'ready',extra:'x'.repeat(4000)}),{status:200})];
 for(const cb of callbacks)assert.equal((await probeHospitalReadiness(hospital,'northern',config,cb)).status,'unavailable');
});
test('disabled hospitals never trigger HTTP requests',async()=>{
 assert.equal((await probeHospitalReadiness({...hospital,active:false},'northern',config,async()=>{throw new Error('must not call');})).status,'disabled');
 assert.equal((await probeHospitalReadiness(null,'northern',config,async()=>{throw new Error('must not call');})).status,'disabled');
});
