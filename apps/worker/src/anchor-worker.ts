/** Long-running dedicated background process. Optional multiple replicas are
 * coordinated by PostgreSQL advisory locks; no HTTP request waits for a batch.
 */
import 'dotenv/config';
import { resolve } from 'node:path';
import { createPrismaClient } from '../../../packages/database/src/client.js';
import { runAnchorPreparationCycle, recordWorkerHeartbeat } from './anchor-engine.js';
import {parseWorkerPollMs,nextWorkerDelayMs} from '../../../packages/shared/src/worker-policy.js';

const url=process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required');
const pollMs=parseWorkerPollMs(process.env.WORKER_POLL_MS);
const directory=resolve(process.env.CARDANO_BATCH_DIR||'./private/cardano-batches');
const database=createPrismaClient(url);
let stopping=false;
let wake: (()=>void)|undefined;
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{
  stopping=true;wake?.();console.log(`${signal}: draining current worker cycle`);
});
async function sleep(ms:number){
 await new Promise<void>(resolve=>{
  const timeout=setTimeout(()=>{wake=undefined;resolve();},ms);
  wake=()=>{clearTimeout(timeout);wake=undefined;resolve();};
 });
}
async function main(){
 let failures=0;
 try{
  while(!stopping){
   try{
    const processed=await runAnchorPreparationCycle(database,directory);
    await recordWorkerHeartbeat(database,new Date(),'SUCCESS',processed);
    if(processed)console.log(`Offline anchor batch prepared: ${processed} records`);
    failures=0;
   }catch(error){
    failures++;
    console.error('Anchor preparation cycle failed; backing off; no blockchain submission performed.');
    try{await recordWorkerHeartbeat(database,new Date(),'BATCH_ERROR');}catch{/* database may be unavailable */}
   }
   if(!stopping)await sleep(nextWorkerDelayMs(pollMs,failures));
  }
 }finally{await database.$disconnect();}
}
main().catch(e=>{console.error('Background worker exited:',e);process.exitCode=1});
