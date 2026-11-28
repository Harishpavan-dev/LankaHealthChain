import { Body,Controller,Post,Req,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard,Throttle } from '@nestjs/throttler';
import { JwtGuard,AuthenticatedRequest } from '../security/jwt.guard';
import { CreateMedicalRecordDto } from './create-record.dto';
import { CreateRecordService } from './create-record.service';
@ApiTags('records') @ApiBearerAuth() @UseGuards(JwtGuard,ThrottlerGuard)
@Controller({path:'records',version:'1'})
export class CreateRecordController {
 constructor(private readonly service:CreateRecordService){}
 @Post() @Throttle({default:{limit:10,ttl:60000}})
 create(@Req() req:AuthenticatedRequest,@Body() dto:CreateMedicalRecordDto){return this.service.create(req.principal,dto);}
}
