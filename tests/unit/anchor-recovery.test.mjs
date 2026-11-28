import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {makeMerkleBatch} from '../../packages/shared/src/merkle.ts';
import {recoverAnchorManifest} from '../../packages/shared/src/anchor-recovery.ts';
import {persistAnchorArtifacts} from '../../packages/shared/src/anchor-artifacts.ts';
const c=i=>i.toString(16).padStart(64,'0');
const fixture=()=>{
 const batch=makeMerkleBatch([c(3),c(1),c(4),c(2),c(5)]);
 return {batch,rows:batch.proofs.reverse().map(p=>({integrityCommitment:p.commitment,inclusionProof:p}))};
};
test('recover persisted unordered 5-leaf Merkle batch with exact metadata',()=>{
 const {batch,rows}=fixture();
 const result=recoverAnchorManifest(batch.root,rows);
 assert.equal(result.manifest.root,batch.root);
 assert.deepEqual(result.manifest.proofs.map(p=>p.index),[0,1,2,3,4]);
 assert.deepEqual(result.metadata,{'1900':{v:1,alg:'LHC_SHA256_MERKLE_V1',root:batch.root,count:5}});
});
test('reject missing, foreign, duplicate, or tampered persisted proofs',()=>{
 const {batch,rows}=fixture();
 assert.throws(()=>recoverAnchorManifest(batch.root,rows.slice(1)),/invalid/);
 assert.throws(()=>recoverAnchorManifest(batch.root,[...rows,rows[0]]),/invalid/);
 assert.throws(()=>recoverAnchorManifest(c(777),rows),/does not match/);
 assert.throws(()=>recoverAnchorManifest(batch.root,[{...rows[0],integrityCommitment:c(987)},...rows.slice(1)]),/does not match/);
 assert.throws(()=>recoverAnchorManifest(batch.root,[{...rows[0],inclusionProof:{...rows[0].inclusionProof,siblings:[]}},...rows.slice(1)]),/invalid/);
});
test('private batch artifact writes are deterministic, atomic and refuse tampering',()=>{
 const dir=mkdtempSync(join(tmpdir(),'lhc-anchor-recovery-'));
 try {
   const {batch,rows}=fixture();
   const first=persistAnchorArtifacts(dir,batch.root,rows);
   assert.equal(first.records,5);
   assert.deepEqual(JSON.parse(readFileSync(join(first.destination,'private-inclusion-proofs.json'),'utf8')).proofs.map(p=>p.index),[0,1,2,3,4]);
   assert.deepEqual(JSON.parse(readFileSync(join(first.destination,'cardano-metadata.json'),'utf8'))['1900'].root,batch.root);
   assert.equal(statSync(join(first.destination,'private-inclusion-proofs.json')).mode & 0o077,0);
   assert.deepEqual(persistAnchorArtifacts(dir,batch.root,rows),first);
   const path=join(first.destination,'private-inclusion-proofs.json');
   writeFileSync(path,'{"tampered":true}\n');
   assert.throws(()=>persistAnchorArtifacts(dir,batch.root,rows),/differs/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
