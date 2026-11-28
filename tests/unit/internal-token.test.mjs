import test from 'node:test';
import assert from 'node:assert/strict';
import { issueRecordToken, verifyRecordToken } from '../../backend/packages/shared/src/internal-token.ts';
const secret = 'development-only-long-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const claims = { hospitalCode:'northern', externalRecordId: 'blood-001', localPatientId: 'local-arun-n', resourceType: 'Observation', version: 1 };
test('internal record token valid and scoped', () => {
  const token = issueRecordToken(claims, secret, 1000);
  assert.equal(verifyRecordToken(token, secret, 1010).externalRecordId, 'blood-001');
  assert.equal(verifyRecordToken(token, secret, 1010).localPatientId, 'local-arun-n');
});
test('token fails after expiry or with wrong secret or changed signature', () => {
  const token = issueRecordToken(claims, secret, 1000);
  assert.throws(() => verifyRecordToken(token, secret, 1045));
  assert.throws(() => verifyRecordToken(token, secret + 'xx', 1001));
  assert.throws(() => verifyRecordToken(token.slice(0,-1) + (token.at(-1) === 'A' ? 'B' : 'A'), secret, 1001));
});
test('token rejects inadequate service secret', () => assert.throws(() => issueRecordToken(claims, '123', 1000)));
