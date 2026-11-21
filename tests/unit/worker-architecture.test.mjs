import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('dedicated backend worker performs only offline preparation, not live signing',()=>{
 const worker=read('apps/worker/src/anchor-worker.ts');
 const engine=read('apps/worker/src/anchor-engine.ts');
 assert.match(worker,/runAnchorPreparationCycle/);
 assert.match(engine,/pg_try_advisory_xact_lock/);
 assert.match(engine,/deadLetteredAt/);
 assert.match(worker,/SIGTERM/);
 assert.doesNotMatch(worker+engine,/CARDANO_PREPROD_SIGNING_KEY_FILE|LHC_SUBMIT_PREPROD|midnightSecret/);
});
test('worker runs separately from frontend, with least privilege environment',()=>{
 const compose=read('infrastructure/docker/compose.app.yml');
 const section=compose.split('  anchor-worker:')[1]?.split('  patient-portal:')[0];
 assert.ok(section,'dedicated Docker process exists');
 assert.match(section,/restart: unless-stopped/);
 assert.match(section,/WORKER_POLL_MS/);
 assert.doesNotMatch(section,/HOSPITAL_NORTHERN_TOKEN_SECRET|OIDC_AUDIENCE|BLOCKFROST_PREPROD_PROJECT_ID/);
 assert.match(compose,/hospital-northern:/);
});
test('worker schema and migration provide separate nonclinical heartbeat and dead-letter tracking',()=>{
 const schema=read('packages/database/prisma/schema.prisma');
 const migration=read('packages/database/prisma/migrations/202611220015_background_worker_monitoring/migration.sql');
 assert.match(schema,/model WorkerHeartbeat/);
 assert.match(schema,/deadLetteredAt/);
 assert.match(migration,/CREATE TABLE "WorkerHeartbeat"/);
 assert.match(migration,/ALTER TABLE "OutboxEvent" ADD COLUMN "deadLetteredAt"/);
});
