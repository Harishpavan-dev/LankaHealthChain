import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { parsePageLimit,parsePageCursor } from '@lhc/shared/pagination';
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
 @Get(':id/records/page') recordsPage(@Req() req:AuthenticatedRequest,
   @Param('id',ParseUUIDPipe) id:string,@Query('limit') limit?:string,@Query('cursor') cursor?:string) {
   try{return this.records.forAccessRequest(req.principal,id,{
     limit:parsePageLimit(limit),cursor:parsePageCursor(cursor),
   });}
   catch(error){if(error instanceof Error)throw new BadRequestException('Invalid pagination input');throw error;}
 }
}
