import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
test('all implemented API v1 endpoints have valid, role-aware OpenAPI contracts',()=>{
 const run=spawnSync(process.execPath,['scripts/qa/verify-openapi.mjs'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
 assert.equal(run.status,0,run.stderr||run.stdout);
 assert.match(run.stdout,/19 OpenAPI operations/);
});
