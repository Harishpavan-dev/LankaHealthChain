import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DbModule } from './database/db.module';
import { HealthController } from './health.controller';
import { DirectoryController } from './modules/directory.controller';
import { AccessController } from './modules/access.controller';
import { AccessService } from './modules/access.service';
import { RecordsController } from './modules/records.controller';
import { RecordsService } from './modules/records.service';

@Module({
 imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]), DbModule],
 controllers: [HealthController, DirectoryController, AccessController, RecordsController],
 providers: [AccessService, RecordsService],
})
export class AppModule {}
