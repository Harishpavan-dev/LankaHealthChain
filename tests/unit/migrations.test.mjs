import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync,readdirSync } from 'node:fs';
const base = new URL('../../backend/packages/', import.meta.url);
const file = (path) => readFileSync(new URL(path,base),'utf8');
const coreSchema=file('database/prisma/schema.prisma');
const coreMigration=readdirSync(new URL('database/prisma/migrations/',base),{withFileTypes:true})
 .filter(f=>f.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))
 .map(f=>file(`database/prisma/migrations/${f.name}/migration.sql`)).join('\n');
const hospitalSchema=file('hospital-database/prisma/schema.prisma');
const hospitalMigration=file('hospital-database/prisma/migrations/202611220001_init/migration.sql') + file('hospital-database/prisma/migrations/202611220002_durable_replay/migration.sql');
function assertModelsPresent(schema,sql){
 const models=[...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
 assert.ok(models.length>0,'Prisma models defined');
 for(const [,table,definition] of models){
  assert.ok(sql.includes(`CREATE TABLE "${table}"`),`missing SQL table ${table}`);
  for(const field of definition.split('\n')){
   const m=field.trim().match(/^(\w+)\s+(String|DateTime|Int|Boolean|Json)(?:\[\])?\s/);
   if(m) assert.ok(sql.includes(`"${m[1]}"`),`missing column ${table}.${m[1]}`);
  }
 }
}
test('every core Prisma model and scalar column appears in versioned SQL migrations',()=>assertModelsPresent(coreSchema,coreMigration));
test('each hospital Prisma model and scalar column appears in initial SQL migration',()=>assertModelsPresent(hospitalSchema,hospitalMigration));
test('separate core and hospital migration histories exist',()=>{
 assert.ok(existsSync(new URL('database/prisma/migrations/migration_lock.toml',base)));
 assert.ok(existsSync(new URL('hospital-database/prisma/migrations/migration_lock.toml',base)));
 const script=readFileSync(new URL('../../scripts/migrate-hospitals.sh',import.meta.url),'utf8');
 assert.ok(script.includes('NORTHERN JAFFNA VENUS'));
});

test('hospital service-token ledger has an atomic primary-key and expiry index migration',()=>{
 const sql=file('hospital-database/prisma/migrations/202611220002_durable_replay/migration.sql');
 assert.ok(sql.includes('PRIMARY KEY ("jti")'));
 assert.ok(sql.includes('"UsedServiceToken_expiresAt_idx"'));
});
test('core append-only audit trigger and query indexes have committed migrations',()=>{
 const audit=file('database/prisma/migrations/202611220006_append_only_audit/migration.sql');
 const indexes=file('database/prisma/migrations/202611220007_query_indexes/migration.sql');
 assert.match(audit,/BEFORE UPDATE OR DELETE ON "AuditEvent"/);
 assert.ok(indexes.includes('"Consent_patientId_createdAt_idx"'));
});
