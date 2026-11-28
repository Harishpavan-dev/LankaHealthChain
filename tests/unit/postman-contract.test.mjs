import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const load=path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
test('postman collection follows all public documented API v1 operations, without secrets',()=>{
 const api=load('docs/api/openapi.json');
 const collection=load('docs/api/lankahealthchain.postman_collection.json');
 const expected=new Set(Object.entries(api.paths).flatMap(([path,verbs])=>Object.keys(verbs).map(v=>`${v.toUpperCase()} ${path}`)));
 const actual=new Set(collection.item.map(x=>x.name));
 assert.deepEqual(actual,expected);
 assert.equal(collection.item.length,expected.size);
 const vars=Object.fromEntries(collection.variable.map(v=>[v.key,v.value]));
 assert.equal(vars.accessToken,'');
 assert.equal(vars.baseUrl,'http://localhost:3000');
 assert.ok(collection.item.every(x=>x.request.url.startsWith('{{baseUrl}}/api/v1/')));
 assert.ok(collection.item.every(x=>x.request.description.includes('Required role:')));
});
test('Postman generator is deterministic and does not drift from committed contract',()=>{
 const before=readFileSync(new URL('../../docs/api/lankahealthchain.postman_collection.json',import.meta.url),'utf8');
 const run=spawnSync(process.execPath,['scripts/qa/generate-postman.mjs'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert.equal(readFileSync(new URL('../../docs/api/lankahealthchain.postman_collection.json',import.meta.url),'utf8'),before);
});
