import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtGuard, AuthenticatedRequest } from '../security/jwt.guard';
import { RecordsService } from './records.service';
@ApiTags('records') @ApiBearerAuth() @UseGuards(JwtGuard,ThrottlerGuard)
@Controller({path:'access-requests',version:'1'})
export class RecordsController {
 constructor(private readonly records:RecordsService) {}
 @Get(':id/records') recordsForAccess(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) {
   return this.records.forAccessRequest(req.principal,id);
 }
}
