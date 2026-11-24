import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient } from '@lhc/database';
@Injectable()
export class CoreDbService implements OnModuleInit, OnModuleDestroy {
  readonly db = createPrismaClient(process.env.DATABASE_URL || '');
  async onModuleInit() { await this.db.$connect(); }
  async onModuleDestroy() { await this.db.$disconnect(); }
}
