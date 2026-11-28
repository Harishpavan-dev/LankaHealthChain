/** Crash-recoverable, PostgreSQL-serialized Cardano offline batch preparation.
 * This service NEVER holds a signing key, submits chain transactions or grants consent.
 */
import type { createPrismaClient } from '@lhc/database';
import { makeMerkleBatch } from '@lhc/shared/merkle';
import { persistAnchorArtifacts } from '@lhc/shared/anchor-artifacts';
import { ANCHOR_WORKER_ID, MAX_BATCH_SIZE } from '@lhc/shared/worker-policy';

export type AnchorDatabase = ReturnType<typeof createPrismaClient>;

export async function reconcileAnchorArtifacts(database:AnchorDatabase,directory:string):Promise<number>{
  // Keyset scan: a fixed first-1000-roots query would permanently starve newer
  // pending batches on a large deployment. Iterate in bounded pages instead.
  let afterRoot='';
  let recovered=0;
  for(;;){
    const roots=await database.$queryRaw<Array<{batchId:string}>>`
      SELECT DISTINCT "batchId" FROM "RecordAnchor"
       WHERE "status" = 'PENDING' AND "batchId" IS NOT NULL
         AND "batchId" > ${afterRoot}
       ORDER BY "batchId" ASC LIMIT 100`;
    if(!roots.length)break;
    for(const entry of roots){
      const anchors=await database.recordAnchor.findMany({
        where:{batchId:entry.batchId},
        include:{record:{select:{integrityCommitment:true}}},
      });
      const result=persistAnchorArtifacts(directory,entry.batchId,
        anchors.map(a=>({integrityCommitment:a.record.integrityCommitment,inclusionProof:a.inclusionProof})));
      recovered++;
      console.log(`Reconciled ${result.records} proofs for ${result.root}`);
    }
    afterRoot=roots[roots.length-1].batchId;
    if(roots.length<100)break;
  }
  return recovered;
}

/** All state transitions are atomic; cooperating replicas use the same advisory lock.
 * Bad outbox references are dead-lettered rather than starving other records.
 */
export async function prepareAnchorBatch(database:AnchorDatabase,now=new Date()):Promise<number>{
  return database.$transaction(async tx=>{
    const locks=await tx.$queryRaw<Array<{acquired:boolean}>>`SELECT pg_try_advisory_xact_lock(9182026) AS acquired`;
    if(!locks[0]?.acquired)return 0;
    const events=await tx.outboxEvent.findMany({where:{eventType:'RECORD_REGISTERED',
      publishedAt:null,deadLetteredAt:null,nextAttemptAt:{lte:now}},
      orderBy:[{createdAt:'asc'},{id:'asc'}],take:MAX_BATCH_SIZE});
    if(!events.length)return 0;
    const ready=[] as {eventId:string;recordId:string;integrityCommitment:string}[];
    for(const event of events){
      const record=await tx.medicalRecordIndex.findUnique({where:{id:event.aggregateId},select:{id:true,integrityCommitment:true}});
      if(!record){
        // Public operational error code only. No patient identifier in logs.
        await tx.outboxEvent.update({where:{id:event.id},data:{deadLetteredAt:now,
          lastErrorCode:'RECORD_REFERENCE_MISSING',attempts:{increment:1}}});
        continue;
      }
      ready.push({eventId:event.id,recordId:record.id,integrityCommitment:record.integrityCommitment});
    }
    if(!ready.length)return 0;
    const batch=makeMerkleBatch(ready.map(r=>r.integrityCommitment));
    for(const item of ready){
      const proof=batch.proofs.find(p=>p.commitment===item.integrityCommitment);
      if(!proof)throw new Error('Commitment missing from complete batch');
      await tx.recordAnchor.upsert({where:{recordIndexId_batchId:{recordIndexId:item.recordId,batchId:batch.root}},
        create:{recordIndexId:item.recordId,batchId:batch.root,inclusionProof:proof as any,status:'PENDING'},update:{}});
      await tx.outboxEvent.update({where:{id:item.eventId},data:{publishedAt:now,
        lastErrorCode:null,attempts:{increment:1}}});
    }
    return ready.length;
  },{timeout:120000});
}

/** Status contains no clinical data and can be safely shown to a network admin. */
export async function recordWorkerHeartbeat(database:AnchorDatabase,now:Date,
  outcome:'SUCCESS'|'BATCH_ERROR'|'STORAGE_ERROR',processed=0):Promise<void>{
  await database.workerHeartbeat.upsert({where:{id:ANCHOR_WORKER_ID},
    create:{id:ANCHOR_WORKER_ID,lastSeenAt:now,
      ...(outcome==='SUCCESS'?{lastSuccessAt:now}:{}),
      lastErrorCode:outcome==='SUCCESS'?null:outcome,preparedTotal:processed},
    update:{lastSeenAt:now,...(outcome==='SUCCESS'?{lastSuccessAt:now}:{}),
      lastErrorCode:outcome==='SUCCESS'?null:outcome,preparedTotal:{increment:processed}}});
}

export async function runAnchorPreparationCycle(database:AnchorDatabase,directory:string):Promise<number>{
  // Reconstruct filesystem artifacts after a previous DB commit / process crash.
  await reconcileAnchorArtifacts(database,directory);
  let total=0;
  for(let i=0;i<100;i++){
    const count=await prepareAnchorBatch(database);
    if(!count)break;
    total+=count;
    await reconcileAnchorArtifacts(database,directory);
  }
  return total;
}
