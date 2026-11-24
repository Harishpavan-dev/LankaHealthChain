import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeMerkleBatch,verifyMerkleProofWithCount,validateCompleteMerkleManifest,cardanoAnchorMetadata,validatePublicCardanoMetadata} from '../../packages/shared/src/merkle.ts';
import {verifyBlockfrostAnchor} from '../../packages/shared/src/cardano-verification.ts';
const dig=s=>createHash('sha256').update(s).digest('hex');
for(const n of [1,2,3,4,5,7,8,9,100])test(`Merkle manifest covers exactly ${n} leaves`,()=>{
 const m=makeMerkleBatch(Array.from({length:n},(_,i)=>dig(`synthetic:${i}`)));
 assert.equal(validateCompleteMerkleManifest(m),true);
 for(const p of m.proofs) assert.equal(verifyMerkleProofWithCount(p,m.root,n),true);
 const broken={...m,proofs:[...m.proofs]}; broken.proofs[broken.proofs.length-1]=broken.proofs[0];
 if(n>1)assert.equal(validateCompleteMerkleManifest(broken),false);
});
test('Merkle depth and claimed index cannot be faked',()=>{
 const m=makeMerkleBatch([dig('1'),dig('2'),dig('3')]);
 assert.equal(verifyMerkleProofWithCount({...m.proofs[0],siblings:[]},m.root,3),false);
 assert.equal(verifyMerkleProofWithCount({...m.proofs[0],index:1},m.root,3),false);
 assert.equal(verifyMerkleProofWithCount(m.proofs[0],m.root,8),false);
});
test('strict Cardano metadata rejects extra public patient data',()=>{
 const root=dig('root'); const valid=cardanoAnchorMetadata(root,3);
 assert.equal(validatePublicCardanoMetadata(valid),true);
 assert.equal(validatePublicCardanoMetadata({...valid,patient:'Arun'}),false);
 assert.equal(validatePublicCardanoMetadata({'1900':{...valid['1900'],NIC:'123'}}),false);
 assert.equal(validatePublicCardanoMetadata({'1900':{...valid['1900'],count:0}}),false);
});
test('Blockfrost proof rejects a wrong tree count or odd-padding proof',()=>{
 const m=makeMerkleBatch([dig('one'),dig('two'),dig('three')]);
 const data=[{label:'1900',json_metadata:{v:1,alg:'LHC_SHA256_MERKLE_V1',root:m.root,count:3}}];
 assert.equal(verifyBlockfrostAnchor(data,m.proofs[2]),true);
 assert.equal(verifyBlockfrostAnchor([{...data[0],json_metadata:{...data[0].json_metadata,count:8}}],m.proofs[2]),false);
 const wrong={...m.proofs[2],siblings:[...m.proofs[2].siblings]};
 wrong.siblings[0]={...wrong.siblings[0],hash:dig('not-self')};
 assert.equal(verifyBlockfrostAnchor(data,wrong),false);
});
