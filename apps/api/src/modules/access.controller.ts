import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtGuard, AuthenticatedRequest } from '../security/jwt.guard';
import { AccessService } from './access.service';
import { CreateAccessRequestDto } from './access.dto';

@ApiTags('access') @ApiBearerAuth() @UseGuards(JwtGuard, ThrottlerGuard)
@Controller({ version:'1' })
export class AccessController {
 constructor(private readonly svc: AccessService) {}
 @Post('access-requests') @Throttle({default:{limit:10,ttl:60000}})
 create(@Req() req:AuthenticatedRequest, @Body() body:CreateAccessRequestDto) {return this.svc.create(req.principal,body);}
 @Get('access-requests/mine') mine(@Req() req:AuthenticatedRequest) {return this.svc.mine(req.principal);}
 @Get('patients/me/access-requests') pending(@Req() req:AuthenticatedRequest) {return this.svc.pending(req.principal);}
 @Get('patients/me/timeline') timeline(@Req() req:AuthenticatedRequest) {return this.svc.timeline(req.principal);}
 @Get('patients/me/timeline/page') timelinePage(@Req() req:AuthenticatedRequest,
   @Query('limit') limit?:string,@Query('cursor') cursor?:string){return this.svc.timelinePage(req.principal,limit,cursor);}
 @Get('patients/me/consents') consents(@Req() req:AuthenticatedRequest) {return this.svc.myConsents(req.principal);}
 @Get('audit/me') audit(@Req() req:AuthenticatedRequest) {return this.svc.myAudit(req.principal);}
 @Get('audit/me/page') auditPage(@Req() req:AuthenticatedRequest,
   @Query('limit') limit?:string,@Query('cursor') cursor?:string){return this.svc.auditPage(req.principal,limit,cursor);}
 @Post('access-requests/:id/approve') approve(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) {return this.svc.approve(req.principal,id);}
 @Post('access-requests/:id/reject') reject(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) {return this.svc.reject(req.principal,id);}
 @Post('consents/:id/revoke') revoke(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) {return this.svc.revoke(req.principal,id);}
}
