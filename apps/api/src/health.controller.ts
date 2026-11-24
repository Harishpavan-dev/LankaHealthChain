import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('health') @Controller({ path:'health', version:'1' })
export class HealthController {
 @Get() status() { return { status: 'ok', service: 'lhc-api', version:'v1', clinicalUse: false }; }
}
