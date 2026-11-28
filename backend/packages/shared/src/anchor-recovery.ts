import {cardanoAnchorMetadata, validateCompleteMerkleManifest, type InclusionProof} from './merkle.ts';

export interface PersistedAnchorRow {
  integrityCommitment: string;
  inclusionProof: unknown;
}

/** Rebuild a complete, deterministic private proof manifest from committed
 * PostgreSQL RecordAnchor rows. No clinical data or patient IDs are used.
 * Refuse partial/mismatched batches rather than generating invalid evidence.
 */
export function recoverAnchorManifest(root:string, rows:readonly PersistedAnchorRow[]) {
  if (!/^[a-f0-9]{64}$/.test(root) || rows.length<1 || rows.length>10000)
    throw new Error('Invalid batch root or size');
  const proofs:InclusionProof[]=rows.map(row => {
    const proof=row.inclusionProof as InclusionProof|null;
    if (!proof || typeof proof!=='object' ||
        typeof row.integrityCommitment!=='string' ||
        row.integrityCommitment.toLowerCase()!==proof.commitment ||
        proof.root!==root)
      throw new Error('A committed anchor does not match its record');
    return proof;
  });
  const manifest={root,proofs:proofs.sort((a,b)=>a.index-b.index)};
  if(!validateCompleteMerkleManifest(manifest))
    throw new Error('Persisted anchor batch is incomplete or cryptographically invalid');
  return {manifest,metadata:cardanoAnchorMetadata(root,proofs.length)};
}
