import { readJsonResponseBounded } from '@lhc/shared/bounded-json';
import { mapBounded } from '@lhc/shared/bounded-concurrency';
import { BadRequestException } from '@nestjs/common';
import { permittedHospitalUrl } from '@lhc/shared/hospital-endpoints';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CoreDbService } from '../database/db.service';
import { AccessService } from './access.service';
import { Principal } from '../security/jwt.guard';
import { isConsentValid } from '@lhc/shared/authorization';
import { isDoctorOperational } from '@lhc/shared/doctor-policy';
import { verifyCommitment } from '@lhc/shared/crypto';
import { issueRecordToken } from '@lhc/shared/internal-token';
import { isSupportedFhirResource,fhirPatientReference } from '@lhc/shared/fhir';

@Injectable()
export class RecordsService {
 constructor(private readonly data: CoreDbService, private readonly access: AccessService) {}
 async forAccessRequest(principal:Principal, requestId:string, page?:{limit:number;cursor?:string}) {
   const doctor = await this.access.registeredDoctor(principal);
   const request = await this.data.db.accessRequest.findUnique({where:{id:requestId},include:{consent:true}});
   if (!request || request.doctorId !== doctor.id) throw new NotFoundException('Request not found');
   if (request.status !== 'APPROVED' || !request.consent) throw new ForbiddenException('Consent not active');
   const consentId = request.consent.id;
   if (process.env.CONSENT_MODE !== 'local-demo')
     throw new ServiceUnavailableException('Midnight verifier is not configured; record access disabled');
   // Reject expired or revoked consent even when there are no indexed records.
   // Per-record checks below also protect long-running multi-hospital reads.
   const activeConsent = await this.data.db.consent.findUnique({where:{id:consentId}});
   const now = new Date();
   if (!activeConsent || activeConsent.status !== 'ACTIVE' || activeConsent.revokedAt ||
       activeConsent.patientId !== request.patientId || activeConsent.doctorId !== doctor.id ||
       activeConsent.hospitalId !== doctor.hospitalId || activeConsent.purpose !== request.purpose ||
       activeConsent.expiresAt <= now) throw new ForbiddenException('Consent revoked, expired, or out of scope');
   if(page?.cursor){
     const cursorRecord=await this.data.db.medicalRecordIndex.findFirst({
       where:{id:page.cursor,patientId:request.patientId,resourceType:{in:request.requestedTypes}},select:{id:true},
     });
     if(!cursorRecord)throw new BadRequestException('Invalid patient-scoped medical record cursor');
   }
   const fetched = await this.data.db.medicalRecordIndex.findMany({
     where:{patientId:request.patientId,resourceType:{in:request.requestedTypes}},
     include:{hospital:true},orderBy:[{createdAt:'desc'},{id:'desc'}],
     take:page?page.limit+1:101,
     ...(page?.cursor?{cursor:{id:page.cursor},skip:1}:{}),
   });
   if(!page && fetched.length>100)
     throw new BadRequestException('Too many records for unpaged retrieval; use /records/page');
   const records=page?fetched.slice(0,page.limit):fetched;
   const identities = await this.data.db.patientIdentityMap.findMany({where:{patientId:request.patientId}});
   const result = await mapBounded(records,4,async record => {
     // Re-read consent before each release: revocation blocks NEW reads (not prior downloads).
     const fresh = await this.data.db.consent.findUnique({where:{id:consentId}});
     if (!isConsentValid(fresh, {
       patientId:request.patientId, doctorId:doctor.id, hospitalId:doctor.hospitalId,
       purpose:request.purpose, resourceType:record.resourceType, now:new Date(),
     })) throw new ForbiddenException('Consent revoked, expired, or out of scope');
     const mapping = identities.find(i=>i.hospitalId===record.hospitalId);
     if (!mapping) throw new ConflictException('Missing hospital identity mapping');
     if (!record.hospital.active) throw new ServiceUnavailableException('Source hospital not active');
     const signedToken = issueRecordToken({
       hospitalCode:record.hospital.code, externalRecordId:record.remoteRecordId, localPatientId:mapping.localPatientRef,
       resourceType:record.resourceType,version:record.recordVersion,
     },process.env[`HOSPITAL_${record.hospital.code.toUpperCase()}_TOKEN_SECRET`] || '');
     const url = permittedHospitalUrl(record.hospital.code,record.hospital.baseUrl,`/internal/v1/records/${encodeURIComponent(record.remoteRecordId)}`);
     url.searchParams.set('version',String(record.recordVersion));
     // All URLs are enrolled by a network administrator (not user-provided) to mitigate SSRF.
     let resource: unknown;
     try {
       const response = await fetch(url, {headers:{authorization:`Bearer ${signedToken}`},redirect:'error',signal:AbortSignal.timeout(5000)});
       if (!response.ok) throw new Error(`Hospital returned ${response.status}`);
       resource = await readJsonResponseBounded(response);
     } catch {
       await this.audit(principal.sub,request.patientId,requestId,record.id,'SOURCE_UNAVAILABLE');
       throw new ServiceUnavailableException('Hospital record currently unavailable');
     }
     if (!isSupportedFhirResource(resource) || resource.resourceType!==record.resourceType ||
         !verifyCommitment(resource,record.nonceHex,record.integrityCommitment) ||
         resource.id!==record.remoteRecordId ||
         fhirPatientReference(resource)!==`Patient/${mapping.localPatientRef}`) {
       await this.audit(principal.sub,request.patientId,requestId,record.id,'INTEGRITY_MISMATCH');
       throw new ConflictException('Record integrity validation failed');
     }
     // Prevent record release if consent changed during outbound hospital call.
     const latest = await this.data.db.consent.findUnique({where:{id:consentId}});
     if (!isConsentValid(latest, {
       patientId:request.patientId,doctorId:doctor.id,hospitalId:doctor.hospitalId,
       purpose:request.purpose,resourceType:record.resourceType,now:new Date(),
     })) {
       await this.audit(principal.sub,request.patientId,requestId,record.id,'CONSENT_CHANGED');
       throw new ForbiddenException('Consent no longer active');
     }
     // IMPORTANT: local integrity check != Cardano confirmation.
     await this.audit(principal.sub,request.patientId,requestId,record.id,'LOCAL_INTEGRITY_VALID');
     return {recordId:record.id,sourceHospital:record.hospital.name,
       resource,integrity:{localHash:'MATCH',cardano:record.anchorStatus},
       consentVerification:'LOCAL_DEMO_NOT_MIDNIGHT'};
   });
   // Final gate after every asynchronous hospital response: do not emit a
   // partially authorized batch if a consent was revoked mid-flight OR if a
   // network administrator has disabled the doctor or treating hospital.
   const [finalDoctor,finalHospital,finalConsent]=await Promise.all([
     this.data.db.doctor.findUnique({where:{id:doctor.id},select:{id:true,hospitalId:true,active:true,verified:true}}),
     this.data.db.hospital.findUnique({where:{id:doctor.hospitalId},select:{id:true,active:true}}),
     this.data.db.consent.findUnique({where:{id:consentId}}),
   ]);
   if(!isDoctorOperational(finalDoctor,finalHospital))
     throw new ForbiddenException('Doctor or hospital authorization was withdrawn during retrieval');
   if(records.some(r=>!isConsentValid(finalConsent,{patientId:request.patientId,
       doctorId:doctor.id,hospitalId:doctor.hospitalId,purpose:request.purpose,
       resourceType:r.resourceType,now:new Date()})) ||
      !isConsentValid(finalConsent,{patientId:request.patientId,doctorId:doctor.id,
       hospitalId:doctor.hospitalId,purpose:request.purpose,
       resourceType:request.requestedTypes[0],now:new Date()}))
       throw new ForbiddenException('Consent changed before the batch could be returned');
   return page ? {items:result,nextCursor:fetched.length>page.limit?records.at(-1)?.id??null:null} : result;
 }
 private async audit(actorSub:string,patientId:string,requestId:string,recordIndexId:string,outcome:string) {
   await this.data.db.auditEvent.create({data:{actorSub,patientId,requestId,recordIndexId,action:'RECORD_ACCESS',outcome}});
 }
}
