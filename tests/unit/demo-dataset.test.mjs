import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSupportedFhirResource } from '../../backend/packages/shared/src/fhir.ts';
import { createCommitment, verifyCommitment } from '../../backend/packages/shared/src/crypto.ts';
const fixture=JSON.parse(readFileSync(new URL('../../demo/fixtures/records.json',import.meta.url)));
test('each simulated hospital contains valid synthetic resource envelopes', () => {
  assert.deepEqual(Object.keys(fixture).sort(), ['jaffna','northern','venus']);
  const ids=new Set();
  for (const [code,entries] of Object.entries(fixture)) {
    assert.ok(entries.length>0,code);
    for(const record of entries){
      assert.equal(record.version,1);
      assert.ok(!ids.has(record.externalId), 'external ID unique across fixture');
      ids.add(record.externalId);
      assert.equal(record.resourceType,record.fhir.resourceType);
      assert.equal(isSupportedFhirResource(record.fhir),true);
      const {commitment,nonceHex}=createCommitment(record.fhir);
      assert.equal(verifyCommitment(record.fhir,nonceHex,commitment),true);
    }
  }
});
