import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPrismaClient } from '../src/client';
import { createCommitment } from '../../shared/src/crypto';

const hospitalIds = {
 northern:'a1111111-1111-4111-8111-111111111111',
 jaffna:'a2222222-2222-4222-8222-222222222222',
 venus:'a3333333-3333-4333-8333-333333333333',
} as const;
const patientId='b1111111-1111-4111-8111-111111111111';
const doctorId='c1111111-1111-4111-8111-111111111111';
const localRef={ northern:'arun-n-0001',jaffna:'arun-j-0099',venus:'arun-v-0088' } as const;
const records = JSON.parse(readFileSync(resolve(__dirname,'../../../demo/fixtures/records.json'),'utf8'));
const population = JSON.parse(readFileSync(resolve(__dirname,'../../../demo/fixtures/population.json'),'utf8'));
async function main(){
 const db=createPrismaClient(process.env.DATABASE_URL || '');
 try{
   for(const code of Object.keys(hospitalIds) as Array<keyof typeof hospitalIds>) {
     const url=process.env[`HOSPITAL_${code.toUpperCase()}_URL`];
     if(!url) throw new Error(`Missing HOSPITAL_${code.toUpperCase()}_URL`);
     await db.hospital.upsert({where:{id:hospitalIds[code]},update:{baseUrl:url},
       create:{id:hospitalIds[code],code,name:({northern:'Northern Hospital (Demo)',jaffna:'Jaffna Teaching Hospital (Demo)',venus:'Venus Hospital (Demo)'})[code],baseUrl:url}});
   }
   await db.patient.upsert({where:{id:patientId},update:{},
     create:{id:patientId,authSubject:'11111111-1111-4111-8111-111111111111',displayName:'Arun (Synthetic Patient)'}});
   await db.doctor.upsert({where:{id:doctorId},update:{},
     create:{id:doctorId,authSubject:'22222222-2222-4222-8222-222222222222',displayName:'Demo Doctor 02',hospitalId:hospitalIds.venus,active:true,verified:true}});
   for(const code of Object.keys(hospitalIds) as Array<keyof typeof hospitalIds>) {
     await db.patientIdentityMap.upsert({where:{patientId_hospitalId:{patientId,hospitalId:hospitalIds[code]}},
       update:{},create:{patientId,hospitalId:hospitalIds[code],localPatientRef:localRef[code]}});
     for(const r of records[code]){
       const unique={hospitalId:hospitalIds[code],remoteRecordId:r.externalId,recordVersion:r.version};
       const proof=createCommitment(r.fhir);
       const index=await db.medicalRecordIndex.upsert({where:{hospitalId_remoteRecordId_recordVersion:unique}, update:{},
         create:{patientId,hospitalId:hospitalIds[code],remoteRecordId:r.externalId,
           resourceType:r.resourceType,recordVersion:r.version,integrityCommitment:proof.commitment,
           nonceHex:proof.nonceHex,anchorStatus:'PENDING'}});
       await db.outboxEvent.upsert({
         where:{eventType_aggregateId:{eventType:'RECORD_REGISTERED',aggregateId:index.id}},
         create:{eventType:'RECORD_REGISTERED',aggregateId:index.id,payload:{recordIndexId:index.id}},
         update:{},
       });
     }
   }
   for (const person of population.patients){
     await db.patient.upsert({where:{id:person.id},update:{},
       create:{id:person.id,authSubject:person.authSubject,displayName:person.displayName}});
     for(const code of Object.keys(hospitalIds) as Array<keyof typeof hospitalIds>){
       await db.patientIdentityMap.upsert({where:{patientId_hospitalId:{patientId:person.id,hospitalId:hospitalIds[code]}},
         update:{},create:{patientId:person.id,hospitalId:hospitalIds[code],localPatientRef:person.localRef[code]}});
     }
   }
   for(const code of Object.keys(hospitalIds) as Array<keyof typeof hospitalIds>){
     for(const r of population.records[code]){
       const idx=Number(r.localPatientId.split('-').at(-1));
       const person=population.patients[idx-1];
       if(!person || r.localPatientId!==person.localRef[code])throw new Error('Synthetic patient mapping mismatch');
       const proof=createCommitment(r.fhir);
       const index=await db.medicalRecordIndex.upsert({
         where:{hospitalId_remoteRecordId_recordVersion:{hospitalId:hospitalIds[code],remoteRecordId:r.externalId,recordVersion:r.version}},
         update:{},create:{patientId:person.id,hospitalId:hospitalIds[code],remoteRecordId:r.externalId,
           resourceType:r.resourceType,recordVersion:r.version,integrityCommitment:proof.commitment,
           nonceHex:proof.nonceHex,anchorStatus:'PENDING'},
       });
       await db.outboxEvent.upsert({
         where:{eventType_aggregateId:{eventType:'RECORD_REGISTERED',aggregateId:index.id}},
         update:{},create:{eventType:'RECORD_REGISTERED',aggregateId:index.id,payload:{recordIndexId:index.id}},
       });
     }
   }
   console.log('Seeded 101 synthetic patients and 504 total medical record references (NOT Cardano-anchored)');
 } finally {await db.$disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
