import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {CoreDbService} from '../database/db.service';
import type {Principal} from '../security/jwt.guard';
import {requireRole} from '../security/roles';
import {isActiveHospitalOperator} from '@lhc/shared/governance';
import {parsePageCursor,parsePageLimit,pageResult} from '@lhc/shared/pagination';
import type {DoctorStatusDto,EnrollDoctorDto} from './governance.dto';

const doctorStatusFilters = {
  active: {active:true,verified:true},
  inactive: {active:false,verified:true},
  unverified: {verified:false},
} as const;

@Injectable()
export class HospitalAdminService {
 constructor(private readonly data:CoreDbService){}
 async hospitals(principal:Principal){
   requireRole(principal,'hospital_admin');
   return this.data.db.hospitalOperator.findMany({where:{authSubject:principal.sub,active:true,hospital:{active:true}},
     select:{hospital:{select:{code:true,name:true,id:true}}},orderBy:{createdAt:'asc'},take:100});
 }
 private async scope(principal:Principal,code:string){
   requireRole(principal,'hospital_admin');
   // Membership comes from an authoritative DB mapping, not a mutable browser/JWT hospital claim.
   const hospital=await this.data.db.hospital.findUnique({where:{code},select:{id:true,code:true,name:true,active:true}});
   if(!hospital?.active)throw new ForbiddenException('No active hospital administrator assignment');
   const operator=await this.data.db.hospitalOperator.findUnique({where:{authSubject_hospitalId:{
     authSubject:principal.sub,hospitalId:hospital.id,
   }}});
   if(!isActiveHospitalOperator(operator,principal.sub,hospital.id))
     throw new ForbiddenException('No active hospital administrator assignment');
   return hospital;
 }
 async overview(principal:Principal,code:string){
   const hospital=await this.scope(principal,code);
   const [doctors,verifiedDoctors,unverifiedDoctors,localRecordReferences,pendingRequests]=await Promise.all([
     this.data.db.doctor.count({where:{hospitalId:hospital.id}}),
     this.data.db.doctor.count({where:{hospitalId:hospital.id,active:true,verified:true}}),
     this.data.db.doctor.count({where:{hospitalId:hospital.id,verified:false}}),
     this.data.db.medicalRecordIndex.count({where:{hospitalId:hospital.id}}),
     this.data.db.accessRequest.count({where:{doctor:{hospitalId:hospital.id},status:'PENDING',decisionDeadlineAt:{gt:new Date()}}}),
   ]);
   return {hospital:{code:hospital.code,name:hospital.name},doctors,verifiedDoctors,unverifiedDoctors,localRecordReferences,pendingRequests,
     clinicalDataExposed:false};
 }
 async doctorsPage(principal:Principal,code:string,filters:{limit?:unknown;cursor?:unknown;query?:unknown;status?:unknown}){
   const hospital=await this.scope(principal,code);
   let limit:number,cursor:string|undefined;
   try {
     if((filters.limit!==undefined && typeof filters.limit!=='string') ||
       (filters.cursor!==undefined && typeof filters.cursor!=='string')) throw new Error('Invalid pagination');
     limit=parsePageLimit(filters.limit);cursor=parsePageCursor(filters.cursor);
   }catch{throw new BadRequestException('Invalid pagination');}
   if(filters.query!==undefined && (typeof filters.query!=='string' || filters.query.length>80 || /[\u0000-\u001f\u007f]/.test(filters.query)))
     throw new BadRequestException('Doctor search must be plain text up to 80 characters');
   const status=filters.status;
   if(status!==undefined && (typeof status!=='string' || !Object.hasOwn(doctorStatusFilters,status)))
     throw new BadRequestException('Doctor status must be active, inactive or unverified');
   const literalQuery=filters.query?.trim().replace(/[\\%_]/g,'\\$&');
   const where={hospitalId:hospital.id,
     ...(status!==undefined?doctorStatusFilters[status as keyof typeof doctorStatusFilters]:{}),
     ...(literalQuery?{displayName:{contains:literalQuery,mode:'insensitive' as const}}:{}),
   };
   if(cursor){
     const scoped=await this.data.db.doctor.findFirst({where:{...where,id:cursor},select:{id:true}});
     if(!scoped)throw new BadRequestException('Doctor list changed or the cursor does not match these filters. Run the search again.');
   }
   const items=await this.data.db.doctor.findMany({where,
     select:{id:true,displayName:true,verified:true,active:true},
     orderBy:[{displayName:'asc'},{id:'asc'}],take:limit+1,
     ...(cursor?{cursor:{id:cursor},skip:1}:{}),
   });
   return pageResult(items,limit);
 }
 async enrollDoctor(principal:Principal,code:string,dto:EnrollDoctorDto){
   const hospital=await this.scope(principal,code);
   try{return await this.data.db.$transaction(async tx=>{
     // DB re-check reduces the revocation race between initial authorization and write.
     const fresh=await tx.hospitalOperator.findUnique({where:{authSubject_hospitalId:{
       authSubject:principal.sub,hospitalId:hospital.id}}});
     if(!isActiveHospitalOperator(fresh,principal.sub,hospital.id))
       throw new ForbiddenException('Hospital administrator assignment was revoked');
     const doctor=await tx.doctor.create({data:{authSubject:dto.authSubject,displayName:dto.displayName,
       hospitalId:hospital.id,active:false,verified:false},
       select:{id:true,displayName:true,active:true,verified:true}});
     await tx.administrativeAuditEvent.create({data:{hospitalId:hospital.id,actorSub:principal.sub,
       action:'DOCTOR_ENROLLED_PENDING_VERIFICATION',targetKind:'DOCTOR',targetId:doctor.id,outcome:'SUCCESS'}});
     return {...doctor,note:'Keycloak doctor role must be provisioned separately; clinician starts inactive and unverified'};
   });}catch(error){
     if(error && typeof error==='object' && (error as {code?:string}).code==='P2002')
       throw new ConflictException('Doctor subject already registered in the network');
     throw error;
   }
 }
 async updateDoctor(principal:Principal,code:string,doctorId:string,dto:DoctorStatusDto){
   const hospital=await this.scope(principal,code);
   const statusChanged=dto.active!==undefined || dto.verified!==undefined;
   const profileChanged=dto.displayName!==undefined;
   if(!statusChanged && !profileChanged)
     throw new BadRequestException('Specify a display name, active status or verification status');
   return this.data.db.$transaction(async tx=>{
     const fresh=await tx.hospitalOperator.findUnique({where:{authSubject_hospitalId:{
       authSubject:principal.sub,hospitalId:hospital.id}}});
     if(!isActiveHospitalOperator(fresh,principal.sub,hospital.id))
       throw new ForbiddenException('Hospital administrator assignment was revoked');
     // Conditional write is the authorization boundary: other hospitals are never modified.
     const changed=await tx.doctor.updateMany({where:{id:doctorId,hospitalId:hospital.id},data:{
       ...(dto.active!==undefined?{active:dto.active}:{}),
       ...(dto.verified!==undefined?{verified:dto.verified}:{}),
       ...(profileChanged?{displayName:dto.displayName}:{}),
     }});
     if(changed.count!==1)throw new NotFoundException('Doctor not registered at your hospital');
     const doctor=await tx.doctor.findUniqueOrThrow({where:{id:doctorId},
       select:{id:true,displayName:true,active:true,verified:true}});
     if(statusChanged) await tx.administrativeAuditEvent.create({data:{hospitalId:hospital.id,actorSub:principal.sub,
       action:'DOCTOR_STATUS_CHANGED',targetKind:'DOCTOR',targetId:doctor.id,outcome:'SUCCESS'}});
     if(profileChanged) await tx.administrativeAuditEvent.create({data:{hospitalId:hospital.id,actorSub:principal.sub,
       action:'DOCTOR_PROFILE_UPDATED',targetKind:'DOCTOR',targetId:doctor.id,outcome:'SUCCESS'}});
     return doctor;
   });
 }
 async auditPage(principal:Principal,code:string,rawLimit?:string,rawCursor?:string){
   const hospital=await this.scope(principal,code);
   let limit:number,cursor:string|undefined;
   try {limit=parsePageLimit(rawLimit);cursor=parsePageCursor(rawCursor);}catch{throw new BadRequestException('Invalid pagination');}
   if(cursor){
     const own=await this.data.db.administrativeAuditEvent.findFirst({where:{id:cursor,hospitalId:hospital.id},select:{id:true}});
     if(!own)throw new BadRequestException('Invalid hospital-scoped audit cursor');
   }
   const items=await this.data.db.administrativeAuditEvent.findMany({where:{hospitalId:hospital.id},
     select:{id:true,action:true,outcome:true,targetKind:true,createdAt:true},
     orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit+1,
     ...(cursor?{cursor:{id:cursor},skip:1}:{}),
   });
   return pageResult(items,limit);
 }
}
