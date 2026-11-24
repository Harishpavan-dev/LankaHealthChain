import { Controller, Get, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard, AuthenticatedRequest } from '../security/jwt.guard';
import { CoreDbService } from '../database/db.service';
import { requireRole } from '../security/roles';
@ApiTags('directory') @ApiBearerAuth() @UseGuards(JwtGuard)
@Controller({ path:'hospitals', version:'1' })
export class DirectoryController {
 constructor(private readonly data: CoreDbService) {}
 @Get()
 async hospitals() {
   return this.data.db.hospital.findMany({ where: { active: true }, select: { id:true, code:true, name:true }, orderBy: { code:'asc' } });
 }
}
