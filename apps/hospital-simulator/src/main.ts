import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get, Param, Query, Req, UnauthorizedException, ForbiddenException, NotFoundException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Request } from 'express';
import { createPrismaClient } from '@lhc/hospital-database';
import { verifyRecordToken } from '@lhc/shared/internal-token';

const allowedCodes = { northern:4101, jaffna:4102, venus:4103 } as const;
type HospitalCode = keyof typeof allowedCodes;
@Injectable()
class HospitalDb implements OnModuleInit, OnModuleDestroy {
  readonly db = createPrismaClient(process.env.HOSPITAL_DATABASE_URL || '');
  async onModuleInit(){ await this.db.$connect(); }
  async onModuleDestroy(){ await this.db.$disconnect(); }
}
@Controller()
class HospitalController {
 constructor(private readonly database:HospitalDb) {}
 @Get('health') health(){ return {status:'ok', hospital:process.env.HOSPITAL_CODE, clinicalUse:false}; }
 @Get('internal/v1/records/:externalId')
 async getRecord(@Req() req:Request,@Param('externalId') externalId:string,@Query('version') versionText:string){
   const bearer=req.headers.authorization;
   if (!bearer?.startsWith('Bearer ')) throw new UnauthorizedException('Scoped internal token required');
   let claims;
   try { claims=verifyRecordToken(bearer.slice(7),process.env.HOSPITAL_TOKEN_SECRET || ''); }
   catch { throw new UnauthorizedException('Invalid scoped internal token'); }
   const version=Number(versionText);
   if (!Number.isInteger(version)||version<1 || claims.hospitalCode!==process.env.HOSPITAL_CODE || claims.externalRecordId!==externalId || claims.version!==version)
     throw new ForbiddenException('Token scope mismatch');
   const record=await this.database.db.medicalRecord.findUnique({where:{externalId_version:{externalId,version}}});
   if (!record || record.localPatientId!==claims.localPatientId || record.resourceType!==claims.resourceType)
     throw new NotFoundException('Record outside granted scope');
   return record.fhir;
 }
}
@Module({controllers:[HospitalController], providers:[HospitalDb]})
class HospitalModule{}
async function bootstrap(){
 const code=process.env.HOSPITAL_CODE as HospitalCode;
 if (!Object.prototype.hasOwnProperty.call(allowedCodes,code)) throw new Error('Invalid HOSPITAL_CODE');
 if (!process.env.HOSPITAL_DATABASE_URL) throw new Error('HOSPITAL_DATABASE_URL is required');
 if ((process.env.HOSPITAL_TOKEN_SECRET||'').length<32) throw new Error('HOSPITAL_TOKEN_SECRET must have at least 32 characters');
 const app=await NestFactory.create(HospitalModule);
 app.enableShutdownHooks();
 await app.listen(allowedCodes[code],'127.0.0.1');
}
bootstrap().catch(e=>{console.error(e.message);process.exitCode=1;});
