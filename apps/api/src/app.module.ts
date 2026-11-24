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

@Module({
 imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]), DbModule],
 controllers: [HealthController, DirectoryController, AccessController, RecordsController, CreateRecordController,AdminController,VerificationController],
 providers: [AccessService, RecordsService, CreateRecordService],
})
export class AppModule {}
