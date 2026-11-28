import {ForbiddenException,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {CoreDbService} from '../database/db.service';
import type {Principal} from '../security/jwt.guard';
import {requireRole} from '../security/roles';
import {hasActiveResearchGrant,RESEARCH_MIN_CELL,suppressSmallCells} from '@lhc/shared/governance';
@Injectable()
export class ResearchService {
 constructor(private readonly data:CoreDbService){}
 async authorizedGrant(principal:Principal){
   requireRole(principal,'researcher');
   // Only synthetic demonstration records, never live clinical deployment. Deny by default.
   if(process.env.NODE_ENV==='production' || process.env.RESEARCH_MODE!=='synthetic-demo')
     throw new ServiceUnavailableException('Research access requires an approved synthetic-demo environment');
   const grant=await this.data.db.researchGrant.findUnique({where:{authSubject:principal.sub}});
   if(!hasActiveResearchGrant(grant,principal.sub,new Date()))throw new ForbiddenException('No current research authorization');
   return grant!;
 }
 async me(principal:Principal){
   const g=await this.authorizedGrant(principal);
   return {projectName:g.projectName,purpose:g.purpose,expiresAt:g.expiresAt,mode:'SYNTHETIC_AGGREGATES_ONLY',clinicalDataExposed:false};
 }
 async aggregates(principal:Principal){
   await this.authorizedGrant(principal);
   const grouped=await this.data.db.medicalRecordIndex.groupBy({by:['resourceType'],_count:{id:true}});
   const approved=suppressSmallCells(grouped.map(g=>({resourceType:g.resourceType,count:g._count.id})),RESEARCH_MIN_CELL);
   // Do not return suppressed values, exact small counts, patient IDs or patient-level rows.
   return {resourceCounts:approved,minimumCellSize:RESEARCH_MIN_CELL,
     suppressedSmallCells:true,mode:'SYNTHETIC_AGGREGATES_ONLY',clinicalDataExposed:false};
 }
}
