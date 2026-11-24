import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

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
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',');
  app.enableCors({ origin: origins, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Authorization','Content-Type'], credentials: false });
  const spec = new DocumentBuilder().setTitle('LankaHealthChain API').setVersion('v1')
    .addBearerAuth().build();
  SwaggerModule.setup('/api/docs', app, SwaggerModule.createDocument(app, spec));
  await app.listen(Number(process.env.PORT || 3000), '127.0.0.1');
}
main().catch(e => { console.error('Startup failed:', e.message); process.exitCode = 1; });
