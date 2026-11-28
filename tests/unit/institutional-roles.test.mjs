import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('six Next.js routes have authenticating, recognized role gates',()=>{
 const workspaces=file('frontend/src/lib/workspaces.ts');
 for(const [folder,role,expected] of [
  ['patient','Patient','patient'],['doctor','Doctor','doctor'],['admin','Network Admin','network_admin'],
  ['hospital-admin','Hospital Admin','hospital_admin'],['auditor','Security Auditor','security_auditor'],
  ['researcher','Researcher','researcher']]){
  assert.match(file(`frontend/src/portal-pages/${folder}.tsx`),new RegExp(`role="${role}"`));
  assert.ok(workspaces.includes(`role: '${expected}'`),`missing ${expected} role gate`);
 }
});
test('hospital admin mutations are scoped to database hospital ID and audited transactionally',()=>{
 const service=file('backend/apps/api/src/modules/hospital-admin.service.ts');
 assert.match(service,/authSubject_hospitalId/);
 assert.match(service,/where:\{id:doctorId,hospitalId:hospital.id\}/);
 assert.match(service,/administrativeAuditEvent.create/);
 assert.doesNotMatch(service,/select:\{.*resource.*clinical/i);
});
test('research endpoints fail closed for production and missing approved grant',()=>{
 const code=file('backend/apps/api/src/modules/research.service.ts');
 assert.match(code,/NODE_ENV==='production'/);
 assert.match(code,/RESEARCH_MODE!=='synthetic-demo'/);
 assert.match(code,/hasActiveResearchGrant/);
 assert.match(code,/suppressSmallCells/);
 assert.doesNotMatch(code,/findMany\(\{where:\{patientId/);
});
test('hospital management and research grant tables use explicit relational DB constraints',()=>{
 const sql=file('backend/packages/database/prisma/migrations/202611220014_institutional_governance/migration.sql');
 const schema=file('backend/packages/database/prisma/schema.prisma');
 for(const tbl of ['HospitalOperator','ResearchGrant','AdministrativeAuditEvent']){
  assert.ok(sql.includes('CREATE TABLE "'+tbl+'"'));
  assert.ok(schema.includes('model '+tbl+' {'));
 }
 assert.match(sql,/HospitalOperator_authSubject_hospitalId_key/);
 assert.match(sql,/BEFORE UPDATE OR DELETE ON "AdministrativeAuditEvent"/);
});
test('one Next.js frontend container only receives public OIDC/API environment variables',()=>{
 const compose=file('infrastructure/docker/compose.app.yml');
 const part=compose.split('\n  frontend:\n')[1];
 assert.ok(part, 'frontend service missing');
 for(const v of ['NEXT_PUBLIC_API_URL','NEXT_PUBLIC_OIDC_URL','NEXT_PUBLIC_OIDC_CLIENT_ID']) assert.ok(part.includes(v));
 assert.doesNotMatch(part,/DATABASE_URL|TOKEN_SECRET|DB_PASSWORD|KEYCLOAK_ADMIN_PASSWORD/);
});
test('new clinician enrollment defaults to inactive, unverified and requires institutional membership',()=>{
 const code=file('backend/apps/api/src/modules/hospital-admin.service.ts');
 assert.match(code,/async enrollDoctor\(/);
 assert.match(code,/hospitalId:hospital.id,active:false,verified:false/);
 assert.match(code,/isActiveHospitalOperator\(fresh,principal.sub,hospital.id\)/);
 assert.match(code,/DOCTOR_ENROLLED_PENDING_VERIFICATION/);
});
