import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const load=name=>readFileSync(new URL(name,root),'utf8');
const service=load('backend/apps/api/src/modules/access.service.ts');
const routes=load('backend/apps/api/src/modules/access.controller.ts');
const doc=JSON.parse(load('docs/api/openapi.json'));
test('new history routes are actually delegated to scoped service functions',()=>{
 assert.match(routes,/@Get\('access-requests\/mine\/page'\)/);
 assert.match(routes,/@Get\('patients\/me\/consents\/page'\)/);
 assert.match(routes,/this\.svc\.minePage\(req\.principal,limit,cursor\)/);
 assert.match(routes,/this\.svc\.myConsentsPage\(req\.principal,limit,cursor\)/);
});
test('both cursors require owner authorization before collection query',()=>{
 for(const [fn,ownership] of [['minePage','doctorId:doctor.id'],['myConsentsPage','patientId:patient.id']]){
  const block=service.slice(service.indexOf('async '+fn+'('),service.indexOf('return pageResult(items,limit);',service.indexOf('async '+fn+'(')));
  assert.ok(block.includes(ownership),`${fn} missing ownership`);
  assert.match(block,/findFirst\(/);
  assert.match(block,/orderBy:\[\{createdAt:'desc'\},\{id:'desc'\}\]/);
  assert.match(block,/take:limit\+1/);
 }
});
test('OpenAPI adds true versioned cursor parameters and paged schemas',()=>{
 for(const [path,schema] of [['/access-requests/mine/page','AccessRequestPage'],['/patients/me/consents/page','ConsentPage']]){
  const op=doc.paths[path].get;
  assert.deepEqual(op.parameters.map(p=>p.name),['limit','cursor']);
  assert.deepEqual(op.responses['200'].content['application/json'].schema,{$ref:'#/components/schemas/'+schema});
  assert.equal(doc.components.schemas[schema].required.includes('nextCursor'),true);
 }
});
test('migration indexes match new schema definitions',()=>{
 const sql=load('backend/packages/database/prisma/migrations/202611220011_history_pagination_indexes/migration.sql');
 assert.match(sql,/CREATE INDEX "AccessRequest_doctorId_createdAt_id_idx"/);
 assert.match(sql,/CREATE INDEX "Consent_patientId_createdAt_id_idx"/);
 const schema=load('backend/packages/database/prisma/schema.prisma');
 assert.match(schema,/@@index\(\[doctorId, createdAt\(sort: Desc\), id\(sort: Desc\)\]\)/);
});
test('hospital readiness checks PostgreSQL rather than returning unconditional alive',()=>{
 const hospital=load('backend/apps/hospital-simulator/src/main.ts');
 assert.match(hospital,/@Get\('health\/ready'\)/);
 assert.match(hospital,/this\.database\.db\.\$queryRaw/);
 assert.match(hospital,/ServiceUnavailableException/);
});
