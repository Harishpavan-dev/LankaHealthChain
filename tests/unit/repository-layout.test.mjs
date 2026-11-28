import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('frontend/backend workspace paths and English docs remain consistent',()=>{
 const result=spawnSync(process.execPath,['scripts/qa/verify-layout.mjs'],{encoding:'utf8',cwd:process.cwd()});
 assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
 assert.match(result.stdout,/pnpm workspaces/);
});
