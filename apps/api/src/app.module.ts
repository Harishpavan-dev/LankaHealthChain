import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DbModule } from './database/db.module';
import { HealthController } from './health.controller';
import { DirectoryController } from './modules/directory.controller';
import { AccessController } from './modules/access.controller';
import { AccessService } from './modules/access.service';
import { RecordsController } from './modules/records.controller';
import { RecordsService } from './modules/records.service';
import { CreateRecordController } from './modules/create-record.controller';
import { CreateRecordService } from './modules/create-record.service';
import { AdminController } from './modules/admin.controller';
import { VerificationController } from './modules/verification.controller';

import {HospitalAdminController} from './modules/hospital-admin.controller';
import {HospitalAdminService} from './modules/hospital-admin.service';
import {SecurityAuditController} from './modules/security-audit.controller';
import {SecurityAuditService} from './modules/security-audit.service';
import {ResearchController} from './modules/research.controller';
import {ResearchService} from './modules/research.service';
@Module({
 imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]), DbModule],
 controllers: [HealthController, DirectoryController, AccessController, RecordsController, CreateRecordController,AdminController,VerificationController,HospitalAdminController,SecurityAuditController,ResearchController],
 providers: [AccessService, RecordsService, CreateRecordService,HospitalAdminService,SecurityAuditService,ResearchService],
})
export class AppModule {}
