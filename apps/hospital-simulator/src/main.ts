import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Module, Controller, Get, Post, Body, Param, Query, Req, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException, BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createPrismaClient } from '@lhc/hospital-database';
import { verifyRecordToken } from '@lhc/shared/internal-token';
import { isSupportedFhirResource,fhirPatientReference,validateDemoClinicalWrite } from '@lhc/shared/fhir';
import { consumeServiceToken } from '@lhc/shared/consume-token';
import { canonicalJson } from '@lhc/shared/crypto';

const allowedCodes = { northern:4101, jaffna:4102, venus:4103 } as const;
type HospitalCode = keyof typeof allowedCodes;
@Injectable()
class HospitalDb implements OnModuleInit, OnModuleDestroy {
  readonly db = createPrismaClient(process.env.HOSPITAL_DATABASE_URL || '');
  private cleanupTimer?: ReturnType<typeof setInterval>;
  async onModuleInit(){
    await this.db.$connect();
    await this.removeExpiredTokens();
    // Bounded TTL ledger: cleanup is distributed-safe across service replicas.
    this.cleanupTimer=setInterval(()=>{void this.removeExpiredTokens().catch(e=>console.error('Replay cleanup failed',e));},60_000);
    this.cleanupTimer.unref();
  }
  private async removeExpiredTokens(){
    await this.db.usedServiceToken.deleteMany({where:{expiresAt:{lt:new Date()}}});
  }
  async onModuleDestroy(){
    if(this.cleanupTimer)clearInterval(this.cleanupTimer);
    await this.db.$disconnect();
  }
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
   if (!Number.isInteger(version)||version<1 || claims.action!=='read' || claims.hospitalCode!==process.env.HOSPITAL_CODE || claims.externalRecordId!==externalId || claims.version!==version)
     throw new ForbiddenException('Token scope mismatch');
   const record=await this.database.db.medicalRecord.findUnique({where:{externalId_version:{externalId,version}}});
   if (!record || record.localPatientId!==claims.localPatientId || record.resourceType!==claims.resourceType ||
       !isSupportedFhirResource(record.fhir) || record.fhir.id!==externalId ||
       fhirPatientReference(record.fhir)!==`Patient/${claims.localPatientId}`)
     throw new NotFoundException('Record outside granted scope');
   if (!await consumeServiceToken(this.database.db, claims)) throw new ForbiddenException('Replayed internal token');
   return record.fhir;
 }
 @Post('internal/v1/records')
 async createRecord(@Req() req:Request,@Body() body:unknown){
   const bearer=req.headers.authorization;
   if (!bearer?.startsWith('Bearer ')) throw new UnauthorizedException('Scoped internal token required');
   let claims;
   try {claims=verifyRecordToken(bearer.slice(7),process.env.HOSPITAL_TOKEN_SECRET || '');}
   catch {throw new UnauthorizedException('Invalid internal token');}
   if (claims.action!=='write' || claims.hospitalCode!==process.env.HOSPITAL_CODE) throw new ForbiddenException('Write scope required');
   if (!body || typeof body!=='object' || Array.isArray(body)) throw new BadRequestException('Invalid resource');
   const input=body as Record<string,unknown>;
   if (!validateDemoClinicalWrite(input.fhir) ||
       input.externalId!==claims.externalRecordId || input.localPatientId!==claims.localPatientId ||
       input.resourceType!==claims.resourceType || input.version!==claims.version ||
       input.fhir.id!==claims.externalRecordId || input.fhir.resourceType!==claims.resourceType ||
       fhirPatientReference(input.fhir)!==`Patient/${claims.localPatientId}`)
     throw new ForbiddenException('FHIR record outside signed write scope');
   if (!await consumeServiceToken(this.database.db, claims)) throw new ForbiddenException('Replayed internal token');
   const where={externalId_version:{externalId:claims.externalRecordId,version:claims.version}};
   const existing=await this.database.db.medicalRecord.findUnique({where});
   if (existing) {
     if (canonicalJson(existing.fhir)!==canonicalJson(input.fhir)) throw new ConflictException('Resource version already exists with different contents');
     return {externalId:existing.externalId,version:existing.version,created:false};
   }
   try {
     const created=await this.database.db.medicalRecord.create({data:{
       externalId:claims.externalRecordId,localPatientId:claims.localPatientId,
       resourceType:claims.resourceType,version:claims.version,fhir:input.fhir as any,
     }});
     return {externalId:created.externalId,version:created.version,created:true};
   } catch (err) {
     // Concurrent conflicts: caller retries idempotently with a fresh short-lived signed token.
     if (err instanceof ForbiddenException) throw err;
     throw new ConflictException('Unable to create hospital record; retry with same FHIR id');
   }
 }
}
@Module({controllers:[HospitalController], providers:[HospitalDb]})
class HospitalModule{}
async function bootstrap(){
 const code=process.env.HOSPITAL_CODE as HospitalCode;
 if (!Object.prototype.hasOwnProperty.call(allowedCodes,code)) throw new Error('Invalid HOSPITAL_CODE');
 if (!process.env.HOSPITAL_DATABASE_URL) throw new Error('HOSPITAL_DATABASE_URL is required');
 if ((process.env.HOSPITAL_TOKEN_SECRET||'').length<32) throw new Error('HOSPITAL_TOKEN_SECRET must have at least 32 characters');
 const app=await NestFactory.create<NestExpressApplication>(HospitalModule);
 app.useBodyParser('json',{limit:'300kb'});
 app.enableShutdownHooks();
 app.use((_req:Request,res:Response,next:NextFunction)=>{
   res.setHeader('Cache-Control','no-store');
   res.setHeader('X-Content-Type-Options','nosniff');
   next();
 });
 await app.listen(allowedCodes[code],process.env.HOST || '127.0.0.1');
}
bootstrap().catch(e=>{console.error(e.message);process.exitCode=1;});
