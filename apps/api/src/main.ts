import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { randomUUID } from 'node:crypto';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import type { Request, Response, NextFunction } from 'express';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
  if (process.env.NODE_ENV === 'production' && process.env.CONSENT_MODE === 'local-demo')
    throw new Error('local-demo consent mode prohibited in production');
  if (!process.env.OIDC_ISSUER) throw new Error('OIDC_ISSUER not configured');
  if (!process.env.OIDC_AUDIENCE) throw new Error('OIDC_AUDIENCE not configured');
  for (const code of ['NORTHERN','JAFFNA','VENUS']) {
    const key = process.env[`HOSPITAL_${code}_TOKEN_SECRET`];
    if (!key || key.length < 32) throw new Error(`HOSPITAL_${code}_TOKEN_SECRET must be at least 32 characters`);
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // JSON parser must accept the 256 KiB synthetic FHIR validator cap, but no larger uploads.
  app.useBodyParser('json', { limit: '300kb' });
  app.enableShutdownHooks();
  app.use((_req:Request,res:Response,next:NextFunction)=>{
    res.setHeader('X-Request-ID',randomUUID());
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    next();
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178').split(',');
  app.enableCors({ origin: origins, methods: ['GET','POST','PATCH','OPTIONS'], allowedHeaders: ['Authorization','Content-Type','Idempotency-Key'], credentials: false });
  // Swagger UI displays the same version-controlled contract validated in CI.
  if (process.env.NODE_ENV !== 'production') {
    const contractPath = resolve(__dirname, '../../../docs/api/openapi.json');
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as OpenAPIObject;
    SwaggerModule.setup('/api/docs', app, contract);
  }
  await app.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1');
}
main().catch(e => { console.error('Startup failed:', e.message); process.exitCode = 1; });
