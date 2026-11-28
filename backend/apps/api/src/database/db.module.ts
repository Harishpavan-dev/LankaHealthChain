import { Global, Module } from '@nestjs/common';
import { CoreDbService } from './db.service';
@Global() @Module({ providers: [CoreDbService], exports: [CoreDbService] })
export class DbModule {}
