import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CoreDbService } from '../database/db.service';
import { Principal } from '../security/jwt.guard';
import { requireRole } from '../security/roles';
import { CreateAccessRequestDto } from './access.dto';

@Injectable()
export class AccessService {
 constructor(private readonly data: CoreDbService) {}
 private async patient(sub: string) {
   const p = await this.data.db.patient.findUnique({ where: { authSubject: sub } });
   if (!p) throw new NotFoundException('Patient profile not enrolled');
   return p;
 }
 async registeredDoctor(principal: Principal) {
   requireRole(principal, 'doctor');
   const doc = await this.data.db.doctor.findUnique({ where: { authSubject: principal.sub } });
   if (!doc?.active || !doc.verified) throw new ForbiddenException('Doctor verification required');
   return doc;
 }
 async create(principal: Principal, body: CreateAccessRequestDto) {
   const doctor = await this.registeredDoctor(principal);
   const patient = await this.data.db.patient.findUnique({ where: { id: body.patientId } });
   if (!patient) throw new NotFoundException('Patient not enrolled');
   const identityCount = await this.data.db.patientIdentityMap.count({ where: { patientId: patient.id } });
   if (!identityCount) throw new BadRequestException('Patient has no enrolled hospital identity');
   return this.data.db.$transaction(async tx => {
     const request = await tx.accessRequest.create({ data: {
       patientId: patient.id, doctorId: doctor.id, purpose: body.purpose,
       requestedTypes: body.requestedTypes, requestedDurationMinutes: body.requestedDurationMinutes,
     }});
     await tx.auditEvent.create({ data: {
       patientId: patient.id, actorSub: principal.sub, action: 'ACCESS_REQUEST_CREATED',
       requestId: request.id, outcome: 'PENDING',
     }});
     return request;
   });
 }
 async mine(principal: Principal) {
   const doctor = await this.registeredDoctor(principal);
   return this.data.db.accessRequest.findMany({ where: { doctorId: doctor.id }, orderBy: { createdAt:'desc' }, take:100 });
 }
 async pending(principal: Principal) {
   requireRole(principal, 'patient');
   const patient = await this.patient(principal.sub);
   return this.data.db.accessRequest.findMany({ where: { patientId: patient.id, status:'PENDING' },
     include: { doctor: { select: { displayName:true, hospital: { select: {name:true} } } } },
     orderBy: { createdAt:'desc' }, take: 100 });
 }
 async approve(principal: Principal, requestId: string) {
   requireRole(principal, 'patient');
   const patient = await this.patient(principal.sub);
   if (process.env.CONSENT_MODE !== 'local-demo')
     throw new ServiceUnavailableException('Midnight consent integration is not implemented. Fail closed.');
   return this.data.db.$transaction(async tx => {
     const request = await tx.accessRequest.findUnique({ where:{ id:requestId }, include: {doctor:true} });
     if (!request || request.patientId !== patient.id) throw new NotFoundException('Request not found');
     if (!request.doctor.active || !request.doctor.verified) throw new ForbiddenException('Doctor no longer verified');
     const changed = await tx.accessRequest.updateMany({ where: { id: requestId, status:'PENDING' }, data: { status:'APPROVED' } });
     if (changed.count !== 1) throw new ConflictException('Request already decided');
     const expiresAt = new Date(Date.now() + request.requestedDurationMinutes * 60000);
     const consent = await tx.consent.create({ data: {
       requestId, patientId: patient.id, doctorId: request.doctorId,
       hospitalId: request.doctor.hospitalId, purpose: request.purpose,
       allowedTypes: request.requestedTypes, status:'ACTIVE', expiresAt,
     }});
     await tx.auditEvent.create({ data: {
       patientId: patient.id, actorSub: principal.sub, requestId, action:'CONSENT_APPROVED_LOCAL_DEMO', outcome:'ACTIVE',
     }});
     return { ...consent, verificationMode:'LOCAL_DEMO_NOT_MIDNIGHT' };
   });
 }
 async reject(principal: Principal, requestId: string) {
   requireRole(principal,'patient');
   const patient = await this.patient(principal.sub);
   return this.data.db.$transaction(async tx => {
     const updated = await tx.accessRequest.updateMany({ where:{ id:requestId, patientId:patient.id, status:'PENDING' }, data:{status:'REJECTED'} });
     if (!updated.count) throw new ConflictException('Pending request not found');
     await tx.auditEvent.create({ data:{patientId:patient.id,actorSub:principal.sub,requestId,action:'ACCESS_REQUEST_REJECTED',outcome:'DENIED'} });
     return { status:'REJECTED' };
   });
 }
 async revoke(principal: Principal, consentId: string) {
   requireRole(principal,'patient');
   const patient = await this.patient(principal.sub);
   return this.data.db.$transaction(async tx => {
     const consent = await tx.consent.findUnique({ where:{id:consentId} });
     if (!consent || consent.patientId !== patient.id) throw new NotFoundException('Consent not found');
     const updated = await tx.consent.updateMany({ where:{id:consentId,status:'ACTIVE'}, data:{status:'REVOKED',revokedAt:new Date()} });
     if (!updated.count) throw new ConflictException('Consent already revoked');
     await tx.accessRequest.update({where:{id:consent.requestId},data:{status:'REVOKED'}});
     await tx.auditEvent.create({ data:{patientId:patient.id,actorSub:principal.sub,requestId:consent.requestId,action:'CONSENT_REVOKED_LOCAL_DEMO',outcome:'REVOKED'} });
     return { status:'REVOKED', verificationMode:'LOCAL_DEMO_NOT_MIDNIGHT' };
   });
 }
 async timeline(principal: Principal) {
   requireRole(principal,'patient');
   const patient = await this.patient(principal.sub);
   return this.data.db.medicalRecordIndex.findMany({ where:{ patientId:patient.id },
     select: {id:true,resourceType:true,recordVersion:true,anchorStatus:true,createdAt:true,hospital:{select:{name:true}}},
     orderBy:{createdAt:'desc'},take:100 });
 }
 async myConsents(principal: Principal) {
   requireRole(principal,'patient');
   const patient = await this.patient(principal.sub);
   return this.data.db.consent.findMany({ where:{patientId:patient.id}, orderBy:{createdAt:'desc'},take:100 });
 }
 async myAudit(principal: Principal) {
   requireRole(principal,'patient');
   const patient = await this.patient(principal.sub);
   return this.data.db.auditEvent.findMany({ where:{patientId:patient.id},orderBy:{createdAt:'desc'},take:100 });
 }
}
