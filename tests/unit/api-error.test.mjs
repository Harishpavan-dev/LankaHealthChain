import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicApiError} from '../../backend/packages/shared/src/api-error.ts';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('API error model retains safe validation errors and request correlation',()=>{
 const err=publicApiError(400,{message:['patientId must be a UUID']},id);
 assert.deepEqual(err,{statusCode:400,code:'BAD_REQUEST',message:['patientId must be a UUID'],requestId:id});
});
test('API error model sanitizes unknown exceptions and server details',()=>{
 const err=publicApiError(500,{message:'SQL connection password=secret, stack: ...'},id);
 assert.equal(err.code,'HTTP_ERROR');
 assert.equal(err.message,'Service temporarily unavailable');
 assert.ok(!JSON.stringify(err).includes('secret'));
});
test('API error model refuses oversized and invalid messages',()=>{
 assert.equal(publicApiError(400,{message:'a'.repeat(500)},'sensitive').message,'Request failed');
 assert.equal(publicApiError(401,{message:'No token'},'sensitive').requestId,'unavailable');
});
