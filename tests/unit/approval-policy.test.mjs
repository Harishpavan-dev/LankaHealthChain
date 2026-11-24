import test from 'node:test';
import assert from 'node:assert/strict';
import {decisionDeadline,isRequestPendingAndLive} from '../../packages/shared/src/approval-policy.ts';
const now=new Date('2026-11-22T10:00:00.000Z');
test('new consent requests have a bounded decision deadline',()=>{
 assert.equal(decisionDeadline(now).toISOString(),'2026-11-23T10:00:00.000Z');
 assert.throws(()=>decisionDeadline(now,0));
 assert.throws(()=>decisionDeadline(new Date('bad')));
});
test('pending request remains approvable only before deadline',()=>{
 assert.equal(isRequestPendingAndLive({status:'PENDING',decisionDeadlineAt:new Date(now.getTime()+1000)},now),true);
 assert.equal(isRequestPendingAndLive({status:'PENDING',decisionDeadlineAt:now},now),false);
 assert.equal(isRequestPendingAndLive({status:'PENDING',decisionDeadlineAt:new Date(now.getTime()-1000)},now),false);
 assert.equal(isRequestPendingAndLive({status:'APPROVED',decisionDeadlineAt:new Date(now.getTime()+1000)},now),false);
 assert.equal(isRequestPendingAndLive({status:'PENDING',decisionDeadlineAt:'bad-date'},now),false);
 assert.equal(isRequestPendingAndLive(null,now),false);
});
test('consent lifetime is independent of request approval deadline',()=>{
 const decision=decisionDeadline(now);
 assert.equal(decision.getTime()-now.getTime(),86400000);
 assert.equal(isRequestPendingAndLive({status:'PENDING',decisionDeadlineAt:decision},new Date(now.getTime()+3600000)),true);
});
