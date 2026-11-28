import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWorkerPollMs,nextWorkerDelayMs,workerHealth,workerOperationalStatus,ANCHOR_WORKER_ID} from '../../backend/packages/shared/src/worker-policy.ts';

test('worker uses stable nonclinical identity and valid default polling',()=>{
 assert.equal(ANCHOR_WORKER_ID,'cardano-anchor-preparer');
 assert.equal(parseWorkerPollMs(undefined),15000);
 assert.equal(parseWorkerPollMs('5000'),5000);
 assert.equal(parseWorkerPollMs('600000'),600000);
});
test('worker refuses invalid rates and dangerous fast polling',()=>{
 for(const value of ['0','1000','-1','1.5','foo','0x13','600001','99999999999999999999','5 000'])
  assert.throws(()=>parseWorkerPollMs(value));
});
test('worker retry backoff is bounded and resets on success',()=>{
 assert.equal(nextWorkerDelayMs(15000,0),15000);
 assert.equal(nextWorkerDelayMs(15000,1),30000);
 assert.equal(nextWorkerDelayMs(15000,2),60000);
 assert.equal(nextWorkerDelayMs(15000,100),300000);
 assert.throws(()=>nextWorkerDelayMs(15000,-1));
});
test('heartbeat health is stale after configured safe expiry',()=>{
 const now=new Date('2026-11-22T07:00:00Z');
 assert.equal(workerHealth(now,null,15000),'offline');
 assert.equal(workerHealth(now,new Date(now.getTime()-30000),15000),'healthy');
 assert.equal(workerHealth(now,new Date(now.getTime()-120000),15000),'stale');
 assert.equal(workerHealth(now,new Date(now.getTime()-120000),120000),'healthy');
 assert.equal(workerHealth(now,new Date(now.getTime()+30000),15000),'stale');
});

test('worker with a recent cycle error is degraded rather than healthy',()=>{
 const now=new Date('2026-11-22T07:00:00Z');
 const current=new Date(now.getTime()-5000);
 assert.equal(workerOperationalStatus(now,current,15000,null),'healthy');
 assert.equal(workerOperationalStatus(now,current,15000,'BATCH_ERROR'),'degraded');
 assert.equal(workerOperationalStatus(now,null,15000,'BATCH_ERROR'),'offline');
});
