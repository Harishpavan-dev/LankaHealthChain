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
