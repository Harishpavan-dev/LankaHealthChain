/** PostgreSQL-serialized batch preparation worker, no wallet or chain submission.
 * Output is private; a privileged operator must sign/submit the PUBLIC metadata.
 */
import 'dotenv/config';
import { createPrismaClient } from '../../../packages/database/src/client';
import { makeMerkleBatch } from '../../../packages/shared/src/merkle';
import { persistAnchorArtifacts } from '../../../packages/shared/src/anchor-artifacts';
import { resolve } from 'node:path';
const url=process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required');
const directory=resolve(process.env.CARDANO_BATCH_DIR || './private/cardano-batches');
const database=createPrismaClient(url);
async function prepareBatch():Promise<number>{
   return database.$transaction(async tx=>{
     // An xact advisory lock prevents two cooperating workers from selecting the same pending records.
     const lock=await tx.$queryRaw<Array<{acquired:boolean}>>`SELECT pg_try_advisory_xact_lock(9182026) AS acquired`;
     if(!lock[0]?.acquired){console.log('Another batch preparer owns the lock.');return 0;}
     const events=await tx.outboxEvent.findMany({where:{eventType:'RECORD_REGISTERED',publishedAt:null},
       orderBy:{createdAt:'asc'},take:100});
     if(!events.length)return 0;
     const records=[];
     for(const event of events){
       const record=await tx.medicalRecordIndex.findUnique({where:{id:event.aggregateId}});
       if(!record)throw new Error(`Missing record for outbox event ${event.id}`);
       records.push(record);
     }
     const batch=makeMerkleBatch(records.map(r=>r.integrityCommitment));
     // Only persist DB changes inside the transaction. File I/O follows the
     // commit and can be replayed safely after a crash.
     for(const [i,record] of records.entries()){
       const proof=batch.proofs.find(p=>p.commitment===record.integrityCommitment);
       if(!proof)throw new Error('Commitment missing from batch');
       await tx.recordAnchor.upsert({where:{recordIndexId_batchId:{recordIndexId:record.id,batchId:batch.root}},
         create:{recordIndexId:record.id,batchId:batch.root,inclusionProof:proof as any,status:'PENDING'},update:{}});
       await tx.outboxEvent.update({where:{id:events[i].id},data:{publishedAt:new Date(),attempts:{increment:1}}});
     }
     console.log(`Prepared batch ${batch.root}; ${records.length} records; chain submission still PENDING.`);
     return records.length;
   },{timeout:120000});
}
/** Reconcile pending, already-committed batches with local private artifacts.
 * This is replayable after any process crash between DB commit and file output.
 */
async function recoverPendingFiles():Promise<number>{
 const roots=await database.recordAnchor.findMany({
   where:{batchId:{not:null},status:'PENDING'},select:{batchId:true},
   distinct:['batchId'],take:1000,
 });
 for(const entry of roots){
   if(!entry.batchId)continue;
   const anchors=await database.recordAnchor.findMany({
     where:{batchId:entry.batchId},
     include:{record:{select:{integrityCommitment:true}}},
   });
   const output=persistAnchorArtifacts(directory,entry.batchId,
     anchors.map(a=>({integrityCommitment:a.record.integrityCommitment,inclusionProof:a.inclusionProof})));
   console.log(`Reconciled ${output.records} private proofs for batch ${output.root}`);
 }
 if(roots.length===1000)console.warn('Pending batch scan reached 1000 roots; rerun worker for more.');
 return roots.length;
}
async function main(){
  let total=0;
  let batches=0;
  try {
    // Restore files for committed batches that may have been interrupted.
    await recoverPendingFiles();
    // Drain all current events in bounded 100-record batches.
    // A subsequent invocation safely picks up newly added events.
    while (batches<1000){
      const processed=await prepareBatch();
      if(processed===0)break;
      total+=processed;
      batches++;
      await recoverPendingFiles();
    }
    console.log(`Prepared ${total} records in ${batches} batch(es); ON-CHAIN submission still requires a signing operator.`);
  }finally{await database.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1});
