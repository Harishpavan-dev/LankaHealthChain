import { verifyMerkleProofWithCount, type InclusionProof } from './merkle.ts';
/** Blockfrost metadata response is authoritative only when retrieved from the
 * configured Cardano Preprod endpoint and the transaction is confirmed. */
export type CardanoMetadataItem = {label:string;json_metadata?:unknown};
export function verifyBlockfrostAnchor(metadata:unknown, proof:InclusionProof, expectedCount?:number, expectedCommitment?:string):boolean {
 if(!Array.isArray(metadata))return false;
 const item=(metadata as CardanoMetadataItem[]).find(m=>m?.label==='1900');
 if(!item?.json_metadata || typeof item.json_metadata!=='object')return false;
 const body=item.json_metadata as Record<string,unknown>;
 return body.v===1 && body.alg==='LHC_SHA256_MERKLE_V1' &&
    typeof body.root==='string' && /^[0-9a-f]{64}$/i.test(body.root) &&
    Number.isSafeInteger(body.count) && (body.count as number)>0 &&
    (expectedCount===undefined || body.count===expectedCount) &&
    (expectedCommitment===undefined || proof.commitment.toLowerCase()===expectedCommitment.toLowerCase()) &&
    // Do not accept a valid Merkle proof for a different medical record.
    Number.isSafeInteger(proof.index) && proof.index>=0 && proof.index<(body.count as number) &&
    verifyMerkleProofWithCount(proof,body.root,body.count as number);
}
/** Read-only on-chain check, never signs or submits transactions. */
export async function checkPreprodAnchor(txHash:string, proof:InclusionProof,
  projectId:string, expectedCommitment:string, fetchImpl:typeof fetch=fetch):Promise<boolean> {
 if(!/^[0-9a-f]{64}$/i.test(txHash))throw new Error('Invalid Cardano transaction hash');
 if(!/^[a-zA-Z0-9]{15,200}$/.test(projectId))throw new Error('Invalid provider API key');
 if(!/^[a-f0-9]{64}$/i.test(expectedCommitment) || proof.commitment.toLowerCase()!==expectedCommitment.toLowerCase())
   return false;
 const endpoint=`https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}/metadata`;
 const response=await fetchImpl(endpoint,{headers:{project_id:projectId},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)return false;
 const data=await response.json();
 return verifyBlockfrostAnchor(data,proof,undefined,expectedCommitment);
}
