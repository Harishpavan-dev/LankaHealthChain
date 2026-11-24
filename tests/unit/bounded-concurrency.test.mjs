import test from 'node:test';
import assert from 'node:assert/strict';
import {mapBounded} from '../../packages/shared/src/bounded-concurrency.ts';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('large record batches stay at four in-flight hospital calls',async()=>{
 let active=0,max=0;const records=Array.from({length:37},(_,i)=>i);
 const result=await mapBounded(records,4,async item=>{
  active++;max=Math.max(max,active);
  await sleep((item%3)+1);active--;
  return item*2;
 });
 assert.equal(max,4);
 assert.deepEqual(result,records.map(x=>2*x));
});
test('denied hospital record rejects all-or-nothing batch and prevents further work',async()=>{
 let called=0;
 await assert.rejects(mapBounded(Array.from({length:100},(_,i)=>i),3,async i=>{
  called++;if(i===1)throw new Error('access denied');await sleep(3);return i;
 }),/access denied/);
 assert.ok(called<100);
});
test('bounded worker rejects unsupported parallelism',async()=>{
 await assert.rejects(mapBounded([1],0,async x=>x));
 await assert.rejects(mapBounded([1],33,async x=>x));
 assert.deepEqual(await mapBounded([],4,async x=>x),[]);
});
