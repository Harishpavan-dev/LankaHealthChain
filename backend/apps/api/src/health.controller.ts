import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoreDbService } from './database/db.service';
@ApiTags('health') @Controller({ path:'health', version:'1' })
export class HealthController {
 constructor(private readonly database:CoreDbService){}
 // Liveness: process is responding, does not imply DB connectivity.
 @Get() status() { return { status: 'ok', service: 'lhc-api', version:'v1', clinicalUse: false }; }
 // Readiness: reject traffic if core PostgreSQL has become unavailable.
 @Get('ready') async ready() {
   try { await this.database.db.$queryRaw`SELECT 1 AS ready`; }
   catch { throw new ServiceUnavailableException('Core database not ready'); }
   return {status:'ready',service:'lhc-api',version:'v1',clinicalUse:false};
 }
}
