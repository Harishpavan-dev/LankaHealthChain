import {Controller,Get,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {ThrottlerGuard} from '@nestjs/throttler';
import {JwtGuard,AuthenticatedRequest} from '../security/jwt.guard';
import {SecurityAuditService} from './security-audit.service';
@ApiTags('security-audit') @ApiBearerAuth() @UseGuards(JwtGuard,ThrottlerGuard)
@Controller({path:'security-audit',version:'1'})
export class SecurityAuditController {
 constructor(private readonly service:SecurityAuditService){}
 @Get('summary') summary(@Req() req:AuthenticatedRequest){return this.service.summary(req.principal);}
 @Get('events/page') events(@Req() req:AuthenticatedRequest,@Query('limit') limit?:string,@Query('cursor') cursor?:string){return this.service.eventsPage(req.principal,limit,cursor);}
 @Get('admin-events/page') adminEvents(@Req() req:AuthenticatedRequest,@Query('limit') limit?:string,@Query('cursor') cursor?:string){return this.service.adminEventsPage(req.principal,limit,cursor);}
}
