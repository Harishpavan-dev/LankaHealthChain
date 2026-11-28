import { Controller,Get,Param,ParseUUIDPipe,Req,UseGuards,NotFoundException,ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard,Throttle } from '@nestjs/throttler';
import { JwtGuard,AuthenticatedRequest } from '../security/jwt.guard';
import { CoreDbService } from '../database/db.service';
import { AccessService } from './access.service';
import { checkPreprodAnchor } from '@lhc/shared/cardano-verification';
import type { InclusionProof } from '@lhc/shared/merkle';
@ApiTags('verification') @ApiBearerAuth() @UseGuards(JwtGuard,ThrottlerGuard)
@Controller({path:'records',version:'1'})
export class VerificationController {
 constructor(private readonly data:CoreDbService,private readonly access:AccessService){}
 @Get(':id/verification') @Throttle({default:{limit:10,ttl:60000}})
 async status(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string){
  const record=await this.data.db.medicalRecordIndex.findUnique({where:{id},
    include:{anchors:{orderBy:{createdAt:'desc'},take:1}}});
  if(!record)throw new NotFoundException('Record reference not found');
  if(req.principal.roles.includes('patient')){
    const owner=await this.data.db.patient.findUnique({where:{authSubject:req.principal.sub}});
    if(!owner || owner.id!==record.patientId)throw new NotFoundException('Record reference not found');
  }else{
    const doctor=await this.access.registeredDoctor(req.principal);
    const valid=await this.data.db.consent.findFirst({where:{patientId:record.patientId,doctorId:doctor.id,
      hospitalId:doctor.hospitalId,status:'ACTIVE',revokedAt:null,expiresAt:{gt:new Date()},
      allowedTypes:{has:record.resourceType}}});
    if(!valid)throw new ForbiddenException('Active scoped consent required');
  }
  const anchor=record.anchors[0];
  if(!anchor || anchor.status!=='CONFIRMED' || !anchor.cardanoTxHash || !anchor.inclusionProof)
    return {recordId:id,integrity:'LOCAL_COMMITMENT_ONLY',cardanoStatus:record.anchorStatus,onchainVerified:false};
  const projectId=process.env.BLOCKFROST_PREPROD_PROJECT_ID;
  if(!projectId || !process.env.CARDANO_METADATA_API_BASE_URL)return {recordId:id,cardanoStatus:'UNVERIFIED',onchainVerified:false,reason:'Preprod verification provider not configured'};
  try {
    const verified=await checkPreprodAnchor(anchor.cardanoTxHash,anchor.inclusionProof as unknown as InclusionProof,projectId,record.integrityCommitment);
    return {recordId:id,cardanoStatus:verified?'CONFIRMED':'VERIFICATION_FAILED',
      onchainVerified:verified,txHash:anchor.cardanoTxHash};
  } catch {
    return {recordId:id,cardanoStatus:'UNVERIFIED',onchainVerified:false,reason:'Preprod verification request unavailable'};
  }
 }
}
