import { Controller,Get,Req,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { JwtGuard,AuthenticatedRequest } from '../security/jwt.guard';
import { requireRole } from '../security/roles';
import { CoreDbService } from '../database/db.service';
/** Deliberately exposes only aggregate operational counts: no clinical payloads. */
@ApiTags('administration') @ApiBearerAuth() @UseGuards(JwtGuard)
@Controller({path:'admin',version:'1'})
export class AdminController {
 constructor(private readonly data:CoreDbService){}
 @Get('summary')
 async summary(@Req() req:AuthenticatedRequest){
  requireRole(req.principal,'network_admin');
  const [hospitals,verifiedDoctors,patients,recordReferences,pendingConsents,pendingAnchors]=await Promise.all([
   this.data.db.hospital.count({where:{active:true}}),
   this.data.db.doctor.count({where:{verified:true,active:true}}),
   this.data.db.patient.count(),
   this.data.db.medicalRecordIndex.count(),
   this.data.db.accessRequest.count({where:{status:'PENDING'}}),
   this.data.db.medicalRecordIndex.count({where:{anchorStatus:'PENDING'}}),
  ]);
  return {hospitals,verifiedDoctors,patients,recordReferences,pendingConsents,pendingAnchors,
   clinicalDataExposed:false,consentMode:process.env.CONSENT_MODE==='local-demo'?'LOCAL_DEMO':'UNCONFIGURED'};
 }
}
