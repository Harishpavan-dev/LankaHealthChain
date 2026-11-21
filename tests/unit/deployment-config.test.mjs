import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('release enforces environment-bound URLs and per-portal secret isolation',()=>{
 const out=spawnSync(process.execPath,['scripts/qa/config-audit.mjs'],{cwd:new URL('../..',import.meta.url),encoding:'utf8'});
 assert.equal(out.status,0,`${out.stdout}\n${out.stderr}`);
});
