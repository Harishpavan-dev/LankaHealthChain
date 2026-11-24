import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePageLimit,parsePageCursor,pageResult} from '../../packages/shared/src/pagination.ts';
test('limit defaults to 25 and caps at 100',()=>{
 assert.equal(parsePageLimit(),25);
 assert.equal(parsePageLimit('100'),100);
 for(const bad of ['0','101','1000','-2','1.1','2e1',' 2','02','NaN'])
  assert.throws(()=>parsePageLimit(bad));
});
test('UUID cursor is strict; no arbitrary SQL or URL injection',()=>{
 assert.equal(parsePageCursor(),undefined);
 assert.equal(parsePageCursor('ce1d1c45-5b10-4261-8226-b9353c38df47'),'ce1d1c45-5b10-4261-8226-b9353c38df47');
 for(const bad of ['../../../etc/passwd','%27 OR 1=1','1','f'.repeat(36)])
  assert.throws(()=>parsePageCursor(bad));
});
test('cursor pagination yields the last item and never duplicates it',()=>{
 const rows=['a','b','c','d'].map(id=>({id}));
 assert.deepEqual(pageResult(rows,3),{items:rows.slice(0,3),nextCursor:'c'});
 assert.deepEqual(pageResult(rows,4),{items:rows,nextCursor:null});
});
