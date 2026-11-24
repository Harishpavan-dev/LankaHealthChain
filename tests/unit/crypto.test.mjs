import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, createCommitment, computeCommitment, verifyCommitment } from '../../packages/shared/src/crypto.ts';

test('canonical JSON stable under key ordering', () => {
  assert.equal(canonicalJson({ b: 2, a: { y: 3, x: 1 } }), canonicalJson({ a: { x: 1, y: 3 }, b: 2 }));
});
test('commitment detects report tampering and incorrect nonce', () => {
  const report = { resourceType: 'Observation', valueQuantity: { value: 13.4, unit: 'g/dL' } };
  const { commitment, nonceHex } = createCommitment(report);
  assert.equal(verifyCommitment(report, nonceHex, commitment), true);
  assert.equal(verifyCommitment({ ...report, valueQuantity: { value: 11.0, unit: 'g/dL' } }, nonceHex, commitment), false);
  assert.equal(verifyCommitment(report, 'a'.repeat(64), commitment), false);
  assert.notEqual(computeCommitment(report, 'b'.repeat(64)), commitment);
});
test('reject invalid non-JSON and bad hash values', () => {
  assert.throws(() => canonicalJson({ a: undefined }));
  assert.throws(() => canonicalJson(Infinity));
  assert.equal(verifyCommitment({ a: 1 }, 'b'.repeat(64), 'wronghash'), false);
});
