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
import { configuredHttpBase, parseCorsOrigins, parseListenPort, requiredConfig } from '@lhc/shared/runtime-config';

async function main() {
  requiredConfig('DATABASE_URL');
  const production = process.env.NODE_ENV === 'production';
  if (production && process.env.CONSENT_MODE === 'local-demo')
    throw new Error('local-demo consent mode prohibited in production');
  configuredHttpBase(requiredConfig('OIDC_ISSUER'), 'OIDC_ISSUER', production, true);
  if (process.env.OIDC_JWKS_URL) configuredHttpBase(requiredConfig('OIDC_JWKS_URL'), 'OIDC_JWKS_URL', production, true);
  requiredConfig('OIDC_AUDIENCE');
  for (const code of ['NORTHERN','JAFFNA','VENUS']) {
    const key = requiredConfig(`HOSPITAL_${code}_TOKEN_SECRET`);
    if (Buffer.byteLength(key, 'utf8') < 32) throw new Error(`HOSPITAL_${code}_TOKEN_SECRET must be at least 32 characters`);
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  app.use((_req:Request,res:Response,next:NextFunction)=>{
    res.setHeader('X-Request-ID',randomUUID());
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    next();
  });
  const origins = parseCorsOrigins(process.env.CORS_ORIGINS, production);
  app.enableCors({
    origin: origins, methods: ['GET','POST','PATCH','OPTIONS'],
    allowedHeaders: ['Authorization','Content-Type','Idempotency-Key'],
    exposedHeaders: ['X-Request-ID'], credentials: false,
  });
  // Register after request headers and CORS so parser errors get the same headers as route errors.
  // The parser limit leaves room for the 256 KiB FHIR resource and its enclosing payload.
  app.useBodyParser('json', { limit: '300kb' });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  // Swagger UI displays the same version-controlled contract validated in CI.
  if (!production) {
    const contractPath = resolve(__dirname, '../../../../docs/api/openapi.json');
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as OpenAPIObject;
    SwaggerModule.setup('/api/docs', app, contract);
  }
  await app.listen(parseListenPort(process.env.PORT), process.env.HOST || '127.0.0.1');
}
main().catch(e => { console.error('Startup failed:', e.message); process.exitCode = 1; });
