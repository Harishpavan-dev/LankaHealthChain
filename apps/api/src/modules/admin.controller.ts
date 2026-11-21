import { ThrottlerGuard } from '@nestjs/throttler';
import { BadRequestException,Body,Controller,Get,Post,Patch,Param,ParseUUIDPipe,Req,UseGuards,NotFoundException } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { JwtGuard,AuthenticatedRequest } from '../security/jwt.guard';
import { requireRole } from '../security/roles';
import { CoreDbService } from '../database/db.service';
import {EnrollOperatorDto,CreateResearchGrantDto,ResourceStatusDto} from './governance.dto';
import { probeHospitalReadiness } from '@lhc/shared/hospital-readiness';
/** Deliberately exposes only aggregate operational counts: no clinical payloads. */
@ApiTags('administration') @ApiBearerAuth() @UseGuards(JwtGuard,ThrottlerGuard)
@Controller({path:'admin',version:'1'})
export class AdminController {
 constructor(private readonly data:CoreDbService){}
 /** Administration-only operational dependency view. No internal hostnames or
  * clinical data are returned to the browser. */
 @Get('dependencies')
 async dependencies(@Req() req:AuthenticatedRequest){
  requireRole(req.principal,'network_admin');
  const codes=['northern','jaffna','venus'] as const;
  const checks=await Promise.all(codes.map(async code=>{
   const hospital=await this.data.db.hospital.findUnique({where:{code},select:{code:true,baseUrl:true,active:true}});
   return probeHospitalReadiness(hospital,code);
  }));
  return {status:checks.every(c=>c.status==='ready')?'ready':'degraded',hospitals:checks,
   clinicalDataExposed:false};
 }

 /** Enrollment is explicitly network-admin-controlled, and does not provision an IdP identity. */
 @Post('operators')
 async enrollOperator(@Req() req:AuthenticatedRequest,@Body() dto:EnrollOperatorDto){
   requireRole(req.principal,'network_admin');
   const hospital=await this.data.db.hospital.findUnique({where:{code:dto.hospitalCode}});
   if(!hospital?.active)throw new NotFoundException('Active hospital not found');
   return this.data.db.$transaction(async tx=>{
     const operator=await tx.hospitalOperator.upsert({where:{authSubject_hospitalId:{authSubject:dto.authSubject,hospitalId:hospital.id}},
       create:{authSubject:dto.authSubject,hospitalId:hospital.id,active:true},update:{active:true}});
     await tx.administrativeAuditEvent.create({data:{actorSub:req.principal.sub,hospitalId:hospital.id,
       action:'HOSPITAL_OPERATOR_ASSIGNED',targetKind:'OPERATOR',targetId:operator.id,outcome:'SUCCESS'}});
     return {id:operator.id,hospitalCode:hospital.code,active:operator.active,
       note:'Identity must separately hold hospital_admin role in Keycloak'};
   });
 }
 @Post('research-grants')
 async createResearchGrant(@Req() req:AuthenticatedRequest,@Body() dto:CreateResearchGrantDto){
   requireRole(req.principal,'network_admin');
   if(process.env.NODE_ENV==='production' || process.env.RESEARCH_MODE!=='synthetic-demo')
     throw new BadRequestException('Research enrollment only supports synthetic demo data');
   const expiresAt=new Date(dto.expiresAt);
   if(!Number.isFinite(expiresAt.getTime()) || expiresAt<=new Date() || expiresAt.getTime()>Date.now()+366*86400000)
     throw new BadRequestException('Expiry must be in the next 366 days');
   return this.data.db.$transaction(async tx=>{
     const grant=await tx.researchGrant.upsert({where:{authSubject:dto.authSubject},
       create:{authSubject:dto.authSubject,projectName:dto.projectName,purpose:dto.purpose,expiresAt,active:true},
       update:{projectName:dto.projectName,purpose:dto.purpose,expiresAt,active:true}});
     await tx.administrativeAuditEvent.create({data:{actorSub:req.principal.sub,action:'SYNTHETIC_RESEARCH_GRANT_ASSIGNED',
       targetKind:'RESEARCH_GRANT',targetId:grant.id,outcome:'SUCCESS'}});
     return {id:grant.id,projectName:grant.projectName,expiresAt:grant.expiresAt,mode:'SYNTHETIC_DEMO'};
   });
 }

 @Get('operators')
 async listOperators(@Req() req:AuthenticatedRequest){
   requireRole(req.principal,'network_admin');
   return this.data.db.hospitalOperator.findMany({select:{id:true,authSubject:true,active:true,
      hospital:{select:{code:true,name:true}}},orderBy:{createdAt:'desc'},take:100});
 }
 @Patch('operators/:id/status')
 async operatorStatus(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() dto:ResourceStatusDto){
   requireRole(req.principal,'network_admin');
   return this.data.db.$transaction(async tx=>{
     const operator=await tx.hospitalOperator.findUnique({where:{id}});
     if(!operator)throw new NotFoundException('Operator not found');
     const updated=await tx.hospitalOperator.update({where:{id},data:{active:dto.active}});
     await tx.administrativeAuditEvent.create({data:{hospitalId:operator.hospitalId,actorSub:req.principal.sub,
       action:dto.active?'HOSPITAL_OPERATOR_ACTIVATED':'HOSPITAL_OPERATOR_REVOKED',targetKind:'OPERATOR',targetId:id,outcome:'SUCCESS'}});
     return {id:updated.id,active:updated.active};
   });
 }
 @Get('research-grants')
 async listResearchGrants(@Req() req:AuthenticatedRequest){
   requireRole(req.principal,'network_admin');
   return this.data.db.researchGrant.findMany({select:{id:true,authSubject:true,projectName:true,active:true,expiresAt:true},
     orderBy:{approvedAt:'desc'},take:100});
 }
 @Patch('research-grants/:id/status')
 async researchGrantStatus(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() dto:ResourceStatusDto){
   requireRole(req.principal,'network_admin');
   return this.data.db.$transaction(async tx=>{
     const grant=await tx.researchGrant.findUnique({where:{id}});
     if(!grant)throw new NotFoundException('Research grant not found');
     if(dto.active && grant.expiresAt<=new Date())throw new BadRequestException('Cannot activate expired research grant');
     const updated=await tx.researchGrant.update({where:{id},data:{active:dto.active}});
     await tx.administrativeAuditEvent.create({data:{actorSub:req.principal.sub,
       action:dto.active?'SYNTHETIC_RESEARCH_GRANT_ACTIVATED':'SYNTHETIC_RESEARCH_GRANT_REVOKED',
       targetKind:'RESEARCH_GRANT',targetId:id,outcome:'SUCCESS'}});
     return {id:updated.id,active:updated.active};
   });
 }
 @Get('summary')
 async summary(@Req() req:AuthenticatedRequest){
  requireRole(req.principal,'network_admin');
  const [hospitals,verifiedDoctors,patients,recordReferences,pendingConsents,pendingAnchors]=await Promise.all([
   this.data.db.hospital.count({where:{active:true}}),
   this.data.db.doctor.count({where:{verified:true,active:true}}),
   this.data.db.patient.count(),
   this.data.db.medicalRecordIndex.count(),
   this.data.db.accessRequest.count({where:{status:'PENDING',decisionDeadlineAt:{gt:new Date()}}}),
   this.data.db.medicalRecordIndex.count({where:{anchorStatus:'PENDING'}}),
  ]);
  return {hospitals,verifiedDoctors,patients,recordReferences,pendingConsents,pendingAnchors,
   clinicalDataExposed:false,consentMode:process.env.CONSENT_MODE==='local-demo'?'LOCAL_DEMO':'UNCONFIGURED'};
 }
}
