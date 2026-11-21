import {Body,Controller,Get,Param,ParseUUIDPipe,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {ThrottlerGuard} from '@nestjs/throttler';
import {JwtGuard,AuthenticatedRequest} from '../security/jwt.guard';
import {HospitalAdminService} from './hospital-admin.service';
import {DoctorStatusDto,EnrollDoctorDto} from './governance.dto';
@ApiTags('hospital-administration') @ApiBearerAuth() @UseGuards(JwtGuard,ThrottlerGuard)
@Controller({path:'hospital-admin',version:'1'})
export class HospitalAdminController {
 constructor(private readonly service:HospitalAdminService){}
 @Get('hospitals') hospitals(@Req() req:AuthenticatedRequest){return this.service.hospitals(req.principal);}
 @Get('hospitals/:code/overview') overview(@Req() req:AuthenticatedRequest,@Param('code') code:string){return this.service.overview(req.principal,code);}
 @Get('hospitals/:code/doctors/page') doctors(@Req() req:AuthenticatedRequest,@Param('code') code:string,
   @Query('limit') limit?:string,@Query('cursor') cursor?:string){return this.service.doctorsPage(req.principal,code,limit,cursor);}
 @Post('hospitals/:code/doctors') enrollDoctor(@Req() req:AuthenticatedRequest,@Param('code') code:string,
   @Body() dto:EnrollDoctorDto){return this.service.enrollDoctor(req.principal,code,dto);}
 @Patch('hospitals/:code/doctors/:id') updateDoctor(@Req() req:AuthenticatedRequest,@Param('code') code:string,
   @Param('id',ParseUUIDPipe) id:string,@Body() dto:DoctorStatusDto){return this.service.updateDoctor(req.principal,code,id,dto);}
 @Get('hospitals/:code/audit/page') audit(@Req() req:AuthenticatedRequest,@Param('code') code:string,
   @Query('limit') limit?:string,@Query('cursor') cursor?:string){return this.service.auditPage(req.principal,code,limit,cursor);}
}
