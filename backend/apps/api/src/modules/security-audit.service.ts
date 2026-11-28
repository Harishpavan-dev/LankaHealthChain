import {BadRequestException,Injectable} from '@nestjs/common';
import {CoreDbService} from '../database/db.service';
import type {Principal} from '../security/jwt.guard';
import {requireRole} from '../security/roles';
import {maskAuditEvent} from '@lhc/shared/governance';
import {parsePageCursor,parsePageLimit,pageResult} from '@lhc/shared/pagination';
@Injectable()
export class SecurityAuditService {
 constructor(private readonly data:CoreDbService){}
 async summary(principal:Principal){
   requireRole(principal,'security_auditor');
   const [access,administrative]=await Promise.all([
     this.data.db.auditEvent.groupBy({by:['action','outcome'],_count:{id:true}}),
     this.data.db.administrativeAuditEvent.groupBy({by:['action','outcome'],_count:{id:true}}),
   ]);
   return {access:access.map(r=>({action:r.action,outcome:r.outcome,count:r._count.id})),
      administrative:administrative.map(r=>({action:r.action,outcome:r.outcome,count:r._count.id})),
      clinicalDataExposed:false,identifiersExposed:false};
 }
 async eventsPage(principal:Principal,rawLimit?:string,rawCursor?:string){
   requireRole(principal,'security_auditor');
   let limit:number,cursor:string|undefined;
   try {limit=parsePageLimit(rawLimit);cursor=parsePageCursor(rawCursor);}catch{throw new BadRequestException('Invalid pagination');}
   if(cursor){
     const own=await this.data.db.auditEvent.findUnique({where:{id:cursor},select:{id:true}});
     if(!own)throw new BadRequestException('Invalid audit cursor');
   }
   // Explicit select makes it impossible to accidentally serialize patientId, actorSub, metadata or record IDs.
   const items=await this.data.db.auditEvent.findMany({
     select:{id:true,action:true,outcome:true,createdAt:true},
     orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit+1,
     ...(cursor?{cursor:{id:cursor},skip:1}:{}),
   });
   const paged=pageResult(items,limit);
   return {...paged,items:paged.items.map(maskAuditEvent)};
 }
 async adminEventsPage(principal:Principal,rawLimit?:string,rawCursor?:string){
   requireRole(principal,'security_auditor');
   let limit:number,cursor:string|undefined;
   try {limit=parsePageLimit(rawLimit);cursor=parsePageCursor(rawCursor);}catch{throw new BadRequestException('Invalid pagination');}
   if(cursor){
     const own=await this.data.db.administrativeAuditEvent.findUnique({where:{id:cursor},select:{id:true}});
     if(!own)throw new BadRequestException('Invalid audit cursor');
   }
   const items=await this.data.db.administrativeAuditEvent.findMany({
     select:{id:true,action:true,outcome:true,targetKind:true,createdAt:true},
     orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit+1,
     ...(cursor?{cursor:{id:cursor},skip:1}:{}),
   });
   return pageResult(items,limit);
 }
}
