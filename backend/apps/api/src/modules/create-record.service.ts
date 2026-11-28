import { permittedHospitalUrl } from '@lhc/shared/hospital-endpoints';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CoreDbService } from '../database/db.service';
import { AccessService } from './access.service';
import { Principal } from '../security/jwt.guard';
import { CreateMedicalRecordDto } from './create-record.dto';
import { bindFhirPatient,isFhirRecordId,validateDemoClinicalWrite } from '@lhc/shared/fhir';
import { createCommitment } from '@lhc/shared/crypto';
import { issueRecordToken } from '@lhc/shared/internal-token';
import { matchesExistingRecord } from '@lhc/shared/record-consistency';

/** Write is made to the owning hospital only. Core holds an integrity commitment
 * and locator, never the clinical payload. Retries are idempotent by record id.
 */
@Injectable()
export class CreateRecordService {
 constructor(private readonly data:CoreDbService,private readonly access:AccessService) {}
 async create(principal:Principal, dto:CreateMedicalRecordDto){
   const doctor=await this.access.registeredDoctor(principal);
   const hospital=await this.data.db.hospital.findUnique({where:{id:doctor.hospitalId}});
   if (!hospital?.active) throw new ForbiddenException('Hospital is not active');
   const map=await this.data.db.patientIdentityMap.findUnique({where:{patientId_hospitalId:{patientId:dto.patientId,hospitalId:doctor.hospitalId}}});
   if(!map) throw new NotFoundException('Patient is not enrolled at the treating hospital');
   const id = dto.resource.id === undefined ? randomUUID() : dto.resource.id;
   if (!isFhirRecordId(id)) throw new BadRequestException('Invalid FHIR resource id');
   const resource=bindFhirPatient({...dto.resource,id},map.localPatientRef);
   if (!validateDemoClinicalWrite(resource)) throw new BadRequestException('Invalid or oversized synthetic FHIR R4 clinical resource');
   const secret=process.env[`HOSPITAL_${hospital.code.toUpperCase()}_TOKEN_SECRET`] || '';
   const token=issueRecordToken({action:'write',hospitalCode:hospital.code,
     externalRecordId:id,localPatientId:map.localPatientRef,resourceType:resource.resourceType as string,version:1},secret);
   const url=permittedHospitalUrl(hospital.code,hospital.baseUrl,'/internal/v1/records');
   let response:Response;
   try {
     response=await fetch(url,{method:'POST',redirect:'error',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
       body:JSON.stringify({externalId:id,localPatientId:map.localPatientRef,version:1,
         resourceType:resource.resourceType,fhir:resource}),signal:AbortSignal.timeout(5000)});
   }catch{throw new ServiceUnavailableException('Source hospital is unavailable');}
   if(response.status===409)throw new ConflictException('A different hospital record already exists with this id');
   if(!response.ok)throw new ServiceUnavailableException('Hospital did not confirm record storage');
   const proof=createCommitment(resource);
   const index=await this.data.db.$transaction(async tx=>{
     const inserted=await tx.medicalRecordIndex.createMany({
       data:{patientId:dto.patientId,hospitalId:hospital.id,remoteRecordId:id,
         resourceType:resource.resourceType as string,recordVersion:1,
         integrityCommitment:proof.commitment,nonceHex:proof.nonceHex,anchorStatus:'PENDING'},
       skipDuplicates:true,
     });
     const entry=await tx.medicalRecordIndex.findUniqueOrThrow({
       where:{hospitalId_remoteRecordId_recordVersion:{hospitalId:hospital.id,remoteRecordId:id,recordVersion:1}},
     });
     if(!matchesExistingRecord(entry,dto.patientId,resource.resourceType as string,resource))
       throw new ConflictException('Existing record content or patient does not match source');
     if (inserted.count===1) {
       await tx.outboxEvent.create({data:{eventType:'RECORD_REGISTERED',aggregateId:entry.id,payload:{recordIndexId:entry.id}}});
       await tx.auditEvent.create({data:{patientId:dto.patientId,actorSub:principal.sub,
         recordIndexId:entry.id,action:'MEDICAL_RECORD_REGISTERED',outcome:'PENDING_CARDANO'}});
     }
     return entry;
   });
   return {id:index.id,resourceType:index.resourceType,recordVersion:index.recordVersion,
     sourceHospital:hospital.name,anchorStatus:index.anchorStatus,
     integrityVerification:'LOCAL_COMMITMENT_ONLY'};
 }
}
