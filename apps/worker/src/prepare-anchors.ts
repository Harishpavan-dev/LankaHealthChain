/** Run a single, safely repeatable offline preparation cycle. No chain signing. */
import 'dotenv/config';
import { resolve } from 'node:path';
import { createPrismaClient } from '../../../packages/database/src/client.js';
import { runAnchorPreparationCycle,recordWorkerHeartbeat } from './anchor-engine.js';
const url=process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required');
const database=createPrismaClient(url);
const directory=resolve(process.env.CARDANO_BATCH_DIR||'./private/cardano-batches');
async function main(){
 try {
  const count=await runAnchorPreparationCycle(database,directory);
  await recordWorkerHeartbeat(database,new Date(),'SUCCESS',count);
  console.log(`Prepared ${count} anchors offline. Sign/submit/confirm separately.`);
 }catch(e){
  try {await recordWorkerHeartbeat(database,new Date(),'BATCH_ERROR');}catch{/* original error retained */}
  throw e;
 }finally{await database.$disconnect();}
}
main().catch(e=>{console.error('Anchor preparation failed:',e);process.exitCode=1});
