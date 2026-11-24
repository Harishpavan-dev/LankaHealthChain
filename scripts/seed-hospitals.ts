import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPrismaClient } from '../packages/hospital-database/src/client';

const records = JSON.parse(readFileSync(resolve(__dirname, '../demo/fixtures/records.json'), 'utf8'));
const population = JSON.parse(readFileSync(resolve(__dirname, '../demo/fixtures/population.json'), 'utf8'));
async function main() {
 for (const code of ['northern','jaffna','venus'] as const) {
   const url=process.env[`HOSPITAL_${code.toUpperCase()}_DATABASE_URL`];
   if (!url) throw new Error(`Missing HOSPITAL_${code.toUpperCase()}_DATABASE_URL`);
   const db=createPrismaClient(url);
   try {
     for(const r of records[code]) {
       await db.medicalRecord.upsert({where:{externalId_version:{externalId:r.externalId,version:r.version}},
         update:{},create:r});
     }
     for(const r of population.records[code]){
       await db.medicalRecord.upsert({where:{externalId_version:{externalId:r.externalId,version:r.version}},
         update:{},create:r});
     }
     console.log(`Seeded synthetic hospital: ${code}, ${records[code].length + population.records[code].length} records`);
   } finally { await db.$disconnect(); }
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
