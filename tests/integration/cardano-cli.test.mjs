/** Full CLI process round-trip of OFFLINE (not Preprod) Merkle anchoring toolss. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=new URL('../../',import.meta.url).pathname;
const call=(script,args)=>spawnSync(process.execPath,['--experimental-strip-types',script,...args],{
 cwd:root,encoding:'utf8',timeout:10000,
});
test('Cardano CLI prepares 100 randomized inputs, verifies inclusion, rejects public PHI metadata',()=>{
 const dir=mkdtempSync(join(tmpdir(),'lhc-cardano-'));
 try{
  const commitments=Array.from({length:100},(_,i)=>createHash('sha256').update(`synthetic-only:${i}`).digest('hex'));
  const file=join(dir,'commitments.json');writeFileSync(file,JSON.stringify(commitments));
  const prepared=call('contracts/cardano/scripts/prepare-batch.mjs',[file,dir]);
  assert.equal(prepared.status,0,prepared.stderr);
  const proof=join(dir,'private-inclusion-proofs.json'),metadata=join(dir,'cardano-metadata.json');
  for(const ix of ['0','13','99']){
   const r=call('contracts/cardano/scripts/verify-batch.mjs',[proof,metadata,ix]);
   assert.equal(r.status,0,r.stderr);
   assert.match(r.stdout,/INCLUSION VERIFIED \(OFFLINE ONLY\)/);
  }
  const unsafe={...JSON.parse(readFileSync(metadata,'utf8'))};
  unsafe['1900']={...unsafe['1900'],patientName:'Synthetic Arun'};
  const bad=join(dir,'unsafe.json');writeFileSync(bad,JSON.stringify(unsafe));
  const rejected=call('contracts/cardano/scripts/verify-batch.mjs',[proof,bad,'13']);
  assert.notEqual(rejected.status,0,'Unsafe on-chain metadata must not pass');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
