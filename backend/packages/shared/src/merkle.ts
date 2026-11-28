/** Domain-separated SHA-256 Merkle tree over *already randomized* record commitments.
 * No patient identifier, medical data or nonce may be included in public metadata.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
export type ProofStep = { side: 'left' | 'right'; hash: string };
export type InclusionProof = { commitment: string; leaf: string; index: number; siblings: ProofStep[]; root: string };
const HEX = /^[0-9a-f]{64}$/i;
function digest(data: Buffer): Buffer { return createHash('sha256').update(data).digest(); }
function valid(hex: string): Buffer {
  if (typeof hex !== 'string' || !HEX.test(hex)) throw new Error('Expected 32-byte hexadecimal commitment');
  return Buffer.from(hex.toLowerCase(), 'hex');
}
function leaf(hex: string): Buffer { return digest(Buffer.concat([Buffer.from([0]), valid(hex)])); }
function parent(a: Buffer, b: Buffer): Buffer { return digest(Buffer.concat([Buffer.from([1]), a, b])); }
export function makeMerkleBatch(commitments: string[]): { root: string; proofs: InclusionProof[] } {
  if (commitments.length === 0 || commitments.length > 10000) throw new Error('Batch must have 1-10000 commitments');
  const normalized = commitments.map(c => { valid(c); return c.toLowerCase(); });
  if (new Set(normalized).size !== normalized.length) throw new Error('Duplicate commitments are not allowed');
  // Sorted leaves make output independent of DB query ordering.
  const sorted = [...normalized].sort();
  const layers: Buffer[][] = [sorted.map(leaf)];
  while (layers[layers.length - 1].length > 1) {
    const current = layers[layers.length - 1]; const next: Buffer[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(parent(current[i], current[i+1] ?? current[i]));
    }
    layers.push(next);
  }
  const root = layers[layers.length-1][0].toString('hex');
  const proofs = sorted.map((commitment,index) => {
    let position = index;
    const siblings: ProofStep[] = [];
    for (const layer of layers.slice(0,-1)) {
      const other = position ^ 1;
      siblings.push({side:position % 2 === 0 ? 'right' : 'left', hash:(layer[other] ?? layer[position]).toString('hex')});
      position = Math.floor(position/2);
    }
    return {commitment,leaf:leaf(commitment).toString('hex'),index,siblings,root};
  });
  return {root,proofs};
}
export function verifyMerkleProof(p: InclusionProof, claimedRoot: string): boolean {
  try {
    valid(p.commitment); valid(p.leaf); valid(p.root); valid(claimedRoot);
    if (!Number.isSafeInteger(p.index) || p.index < 0 || !Array.isArray(p.siblings) || p.siblings.length > 20) return false;
    let position = p.index; let current = leaf(p.commitment);
    if (!timingSafeEqual(current,valid(p.leaf))) return false;
    for (const step of p.siblings) {
      if (!step || (step.side !== 'right' && step.side !== 'left')) return false;
      // Reject inverted proof position and malformed odd-leaf padding.
      if (step.side !== (position % 2 === 0 ? 'right' : 'left')) return false;
      const sibling = valid(step.hash);
      current = step.side === 'right' ? parent(current,sibling) : parent(sibling,current);
      position = Math.floor(position/2);
    }
    return timingSafeEqual(current,valid(claimedRoot)) && timingSafeEqual(valid(p.root),valid(claimedRoot));
  } catch { return false; }
}
/** Cardano metadata label 1900; labels and fields contain no PHI. */
export function cardanoAnchorMetadata(root: string, count: number): Record<string,unknown> {
  valid(root);
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000) throw new Error('Invalid batch size');
  return {'1900':{v:1,alg:'LHC_SHA256_MERKLE_V1',root:root.toLowerCase(),count}};
}

/** Validate proof shape against the declared number of leaves, including
 * duplicated-last-leaf padding. A valid root alone does not bind an index.
 */
export function verifyMerkleProofWithCount(p:InclusionProof,root:string,count:number):boolean {
 if(!Number.isSafeInteger(count)||count<1||count>10000 || !p ||
    !Number.isSafeInteger(p.index)||p.index<0||p.index>=count ||
    !Array.isArray(p.siblings))return false;
 let levels=0, width=count;
 while(width>1){width=Math.ceil(width/2);levels++;}
 if(p.siblings.length!==levels)return false;
 width=count; let position=p.index;
 for(let i=0;i<levels;i++){
  const step=p.siblings[i];
  if(!step || step.side!==(position%2===0?'right':'left'))return false;
  // The odd trailing node is paired with itself; its sibling is not arbitrary.
  if((position^1)>=width){
   try{
    let current=leaf(p.commitment);
    for(let j=0;j<i;j++){
     const s=p.siblings[j], sibling=valid(s.hash);
     current=s.side==='right'?parent(current,sibling):parent(sibling,current);
    }
    if(!timingSafeEqual(current,valid(step.hash)))return false;
   }catch{return false;}
  }
  position=Math.floor(position/2); width=Math.ceil(width/2);
 }
 return verifyMerkleProof(p,root);
}
/** Files used to register an anchor must cover ALL leaves exactly once. */
export function validateCompleteMerkleManifest(m:unknown):m is {root:string;proofs:InclusionProof[]} {
 try {
  if(typeof m!=='object'||m===null||Array.isArray(m))return false;
  const manifest=m as {root?:unknown;proofs?:unknown};
  if(typeof manifest.root!=='string'||!HEX.test(manifest.root)||!Array.isArray(manifest.proofs)||
     manifest.proofs.length<1||manifest.proofs.length>10000)return false;
  const count=manifest.proofs.length, indices=new Set<number>(), commitments=new Set<string>();
  for(const proof of manifest.proofs as InclusionProof[]){
   if(!proof || !verifyMerkleProofWithCount(proof,manifest.root,count) ||
      indices.has(proof.index) || commitments.has(proof.commitment.toLowerCase()))return false;
   indices.add(proof.index);commitments.add(proof.commitment.toLowerCase());
  }
  return indices.size===count;
 }catch{return false;}
}
/** Refuse additional public metadata keys so an operator cannot accidentally
 * anchor plaintext patient identifiers alongside the privacy-safe Merkle root.
 */
export function validatePublicCardanoMetadata(input:unknown):boolean {
 if(typeof input!=='object'||input===null||Array.isArray(input))return false;
 const record=input as Record<string,unknown>;
 if(Object.keys(record).length!==1 || !Object.hasOwn(record,'1900'))return false;
 const value=record['1900'];
 if(typeof value!=='object'||value===null||Array.isArray(value))return false;
 const entry=value as Record<string,unknown>;
 if(Object.keys(entry).length!==4 || !['v','alg','root','count'].every(k=>Object.hasOwn(entry,k)))return false;
 return entry.v===1 && entry.alg==='LHC_SHA256_MERKLE_V1' &&
  typeof entry.root==='string' && /^[a-f0-9]{64}$/.test(entry.root) &&
  Number.isSafeInteger(entry.count) && (entry.count as number)>=1 && (entry.count as number)<=10000;
}
