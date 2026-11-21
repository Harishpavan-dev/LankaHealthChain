import test from 'node:test';
import assert from 'node:assert/strict';
import {issueRecordToken,verifyRecordToken} from '../../packages/shared/src/internal-token.ts';
const secret='test-service-secret-with-32-chars-of-entropy-like-data';
const base={hospitalCode:'northern',externalRecordId:'obs-001',localPatientId:'arun-n',resourceType:'Observation',version:1};
test('scope gate rejects oversized, fake-hospital and malformed clinical tokens',()=>{
  for(const invalid of [
    {...base,hospitalCode:'other'},
    {...base,externalRecordId:'a'.repeat(65)},
    {...base,localPatientId:'../patient'},
    {...base,resourceType:'Patient'},
    {...base,version:0},
    {...base,version:1000001},
    {...base,action:'delete'},
  ]) assert.throws(()=>issueRecordToken(invalid,secret,1000));
  const good=issueRecordToken(base,secret,1000);
  assert.equal(verifyRecordToken(good,secret,1001).hospitalCode,'northern');
  assert.throws(()=>verifyRecordToken(good.repeat(32),secret,1001));
  assert.throws(()=>verifyRecordToken('a'.repeat(4097),secret,1001));
  assert.throws(()=>verifyRecordToken({},secret,1001));
});
test('clinic tokens have strict action, expiry and issuance boundaries',()=>{
 const write=issueRecordToken({...base,action:'write'},secret,2000);
 assert.equal(verifyRecordToken(write,secret,2000).action,'write');
 assert.throws(()=>verifyRecordToken(write,secret,2045));
 assert.throws(()=>issueRecordToken(base,secret,-10));
 assert.throws(()=>verifyRecordToken(write,secret,1994));
});
