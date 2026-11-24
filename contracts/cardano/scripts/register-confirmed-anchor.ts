/** Operator-only import AFTER Cardano Preprod confirmation.
 * Usage (workspace root): pnpm exec tsx contracts/cardano/scripts/register-confirmed-anchor.ts \
 *   /private/batch/private-inclusion-proofs.json TX_HASH
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createPrismaClient } from '../../../packages/database/src/client';
import { verifyBlockfrostAnchor } from '../../../packages/shared/src/cardano-verification';
import { validateCompleteMerkleManifest, type InclusionProof } from '../../../packages/shared/src/merkle';
const [manifestFile,txHash]=process.argv.slice(2);
const key=process.env.BLOCKFROST_PREPROD_PROJECT_ID;
if (!manifestFile || !/^[a-f0-9]{64}$/i.test(txHash||'') || !key)
 throw new Error('Usage: register-confirmed-anchor.ts <private-batch-manifest.json> <confirmed-preprod-tx-hash> and set BLOCKFROST_PREPROD_PROJECT_ID');
const manifest=JSON.parse(readFileSync(manifestFile,'utf8')) as {root:string;proofs:InclusionProof[]};
if(!validateCompleteMerkleManifest(manifest)) throw new Error('Incomplete, mismatched or duplicate private batch manifest');
async function onchain(path:string){
 const r=await fetch(`https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}${path}`,{
  headers:{project_id:key!},signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!r.ok)throw new Error(`Preprod transaction not confirmed or Blockfrost unavailable: HTTP ${r.status}`);
 return r.json();
}
async function run(){
 // Transaction metadata only available after inclusion; never trust unconfirmed tx hashes.
 await onchain('');
 const metadata=await onchain('/metadata');
 for(const p of manifest.proofs){
  if(p.root!==manifest.root || !verifyBlockfrostAnchor(metadata,p,manifest.proofs.length))
    throw new Error('On-chain metadata root or private inclusion proof mismatched');
 }
 const db=createPrismaClient(process.env.DATABASE_URL||'');
 try {
  const updated=await db.$transaction(async tx=>{
   let count=0;
   for(const p of manifest.proofs){
    const record=await tx.medicalRecordIndex.findUnique({where:{integrityCommitment:p.commitment}});
    if(!record)throw new Error('No internal record matches a commitment');
    const existing=await tx.recordAnchor.findFirst({where:{recordIndexId:record.id,batchId:manifest.root}});
    if(existing && existing.cardanoTxHash && existing.cardanoTxHash!==txHash)
      throw new Error('This record batch is already bound to a different Cardano transaction');
    if(existing)await tx.recordAnchor.update({where:{id:existing.id},data:{cardanoTxHash:txHash,inclusionProof:p as any,status:'CONFIRMED'}});
    else await tx.recordAnchor.create({data:{recordIndexId:record.id,batchId:manifest.root,cardanoTxHash:txHash,inclusionProof:p as any,status:'CONFIRMED'}});
    await tx.medicalRecordIndex.update({where:{id:record.id},data:{anchorStatus:'CONFIRMED'}});
    count++;
   }
   return count;
  },{timeout:120000});
  console.log(`Recorded ${updated} confirmed Cardano Preprod anchors for tx ${txHash}`);
 }finally{await db.$disconnect();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
