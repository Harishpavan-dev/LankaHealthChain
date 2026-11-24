import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeMerkleBatch} from '../../packages/shared/src/merkle.ts';
import {verifyBlockfrostAnchor,checkPreprodAnchor} from '../../packages/shared/src/cardano-verification.ts';
const hash=x=>createHash('sha256').update(x).digest('hex');
const batch=makeMerkleBatch([hash('one'),hash('two'),hash('three')]);
const blockfrost=[{label:'1900',json_metadata:{v:1,alg:'LHC_SHA256_MERKLE_V1',root:batch.root,count:3}}];
test('verifies matching Blockfrost metadata and Merkle inclusion proof',()=>assert.equal(verifyBlockfrostAnchor(blockfrost,batch.proofs[0],3),true));
test('rejects forged or altered Cardano metadata',()=>{
 assert.equal(verifyBlockfrostAnchor([],batch.proofs[0]),false);
 assert.equal(verifyBlockfrostAnchor([{label:'1900',json_metadata:{...blockfrost[0].json_metadata,root:`0x${hash('fake')}`}}],batch.proofs[0]),false);
 assert.equal(verifyBlockfrostAnchor(blockfrost,batch.proofs[0],5),false);
});
test('read-only preprod verifier calls exact known origin and validates response',async()=>{
 const calls=[];const fake=async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>blockfrost};};
 const ok=await checkPreprodAnchor('a'.repeat(64),batch.proofs[1],'preprodtestkey123456789',batch.proofs[1].commitment,fake);
 assert.equal(ok,true);assert.equal(calls[0].url,`https://cardano-preprod.blockfrost.io/api/v0/txs/${'a'.repeat(64)}/metadata`);
 assert.equal(calls[0].init.headers.project_id,'preprodtestkey123456789');
});
test('invalid transaction hash and bad provider key rejected before network call',async()=>{
 await assert.rejects(checkPreprodAnchor('../bad',batch.proofs[0],'preprodtestkey123456789',batch.proofs[0].commitment,()=>{throw Error('should not fetch')}));
 await assert.rejects(checkPreprodAnchor('a'.repeat(64),batch.proofs[0],'bad secret',batch.proofs[0].commitment,()=>{throw Error('should not fetch')}));
});

test('valid proof for a different record cannot verify this patient record',async()=>{
 const before=await checkPreprodAnchor('a'.repeat(64),batch.proofs[1],'preprodtestkey123456789',batch.proofs[0].commitment,async()=>{throw Error('network must not be called')});
 assert.equal(before,false);
 assert.equal(verifyBlockfrostAnchor(blockfrost,batch.proofs[1],3,batch.proofs[0].commitment),false);
});
test('out-of-range proof index is rejected even with authentic metadata root',()=>{
 assert.equal(verifyBlockfrostAnchor(blockfrost,{...batch.proofs[0],index:7},3),false);
});
