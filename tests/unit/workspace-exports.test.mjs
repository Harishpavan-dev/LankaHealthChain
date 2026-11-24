import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
const base=resolve('.');
const shared=JSON.parse(readFileSync(join(base,'packages/shared/package.json'),'utf8'));
const roots=['apps/api/src','apps/hospital-simulator/src','apps/worker/src'];
function files(root){
 return readdirSync(join(base,root),{withFileTypes:true}).flatMap(d=>
  d.isDirectory()?files(join(root,d.name)):[join(base,root,d.name)]);
}
test('all shared imports used by domain services are exposed in workspace package exports',()=>{
 for(const folder of roots)for(const f of files(folder)){
  if(!f.endsWith('.ts'))continue;
  const source=readFileSync(f,'utf8');
  for(const match of source.matchAll(/['"]@lhc\/shared\/([^'"]+)['"]/g)){
   const sub=match[1];
   assert.ok(shared.exports['./'+sub],`${relative(base,f)} imports unexported @lhc/shared/${sub}`);
   assert.ok(existsSync(join(base,'packages/shared/src/'+sub+'.ts')));
  }
 }
});
