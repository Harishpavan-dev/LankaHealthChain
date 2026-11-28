import test from 'node:test';
import assert from 'node:assert/strict';
import {readJsonResponseBounded} from '../../backend/packages/shared/src/bounded-json.ts';
test('streams a bounded JSON response safely',async()=>{
 const body=new Response('{"resourceType":"Observation","id":"obs1"}');
 assert.deepEqual(await readJsonResponseBounded(body),{resourceType:'Observation',id:'obs1'});
});
test('rejects advertised oversize before consuming body',async()=>{
 const r=new Response('{}',{headers:{'content-length':'10000'}});
 await assert.rejects(readJsonResponseBounded(r,100),/size limit/);
});
test('rejects actual oversized chunked body with no Content-Length',async()=>{
 const r=new Response('x'.repeat(4000));
 await assert.rejects(readJsonResponseBounded(r,1500),/size limit/);
});
test('rejects invalid JSON and empty body',async()=>{
 await assert.rejects(readJsonResponseBounded(new Response('not json')),SyntaxError);
 await assert.rejects(readJsonResponseBounded(new Response(null)),/no body/);
});
