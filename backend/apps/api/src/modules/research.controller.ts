import {Controller,Get,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {ThrottlerGuard} from '@nestjs/throttler';
import {JwtGuard,AuthenticatedRequest} from '../security/jwt.guard';
import {ResearchService} from './research.service';
@ApiTags('research') @ApiBearerAuth() @UseGuards(JwtGuard,ThrottlerGuard)
@Controller({path:'research',version:'1'})
export class ResearchController {
 constructor(private readonly service:ResearchService){}
 @Get('me') me(@Req() req:AuthenticatedRequest){return this.service.me(req.principal);}
 @Get('aggregates') aggregates(@Req() req:AuthenticatedRequest){return this.service.aggregates(req.principal);}
}
