import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('six frontend roles have authenticating, recognized gates and independent apps',()=>{
 const gate=file('packages/web/src/components.tsx');
 for(const [folder,role,expected] of [
  ['patient-portal','Patient','patient'],['doctor-portal','Doctor','doctor'],['admin-portal','Network Admin','network_admin'],
  ['hospital-admin-portal','Hospital Admin','hospital_admin'],['security-auditor-portal','Security Auditor','security_auditor'],
  ['researcher-portal','Researcher','researcher']]){
  assert.match(file(`apps/${folder}/src/App.tsx`),new RegExp(`role="${role}"`));
  assert.ok(gate.includes(`'${expected}'`),`missing ${expected} role gate`);
 }
});
test('hospital admin mutations are scoped to database hospital ID and audited transactionally',()=>{
 const service=file('apps/api/src/modules/hospital-admin.service.ts');
 assert.match(service,/authSubject_hospitalId/);
 assert.match(service,/where:\{id:doctorId,hospitalId:hospital.id\}/);
 assert.match(service,/administrativeAuditEvent.create/);
 assert.doesNotMatch(service,/select:\{.*resource.*clinical/i);
});
test('research endpoints fail closed for production and missing approved grant',()=>{
 const code=file('apps/api/src/modules/research.service.ts');
 assert.match(code,/NODE_ENV==='production'/);
 assert.match(code,/RESEARCH_MODE!=='synthetic-demo'/);
 assert.match(code,/hasActiveResearchGrant/);
 assert.match(code,/suppressSmallCells/);
 assert.doesNotMatch(code,/findMany\(\{where:\{patientId/);
});
test('hospital management and research grant tables use explicit relational DB constraints',()=>{
 const sql=file('packages/database/prisma/migrations/202611220014_institutional_governance/migration.sql');
 const schema=file('packages/database/prisma/schema.prisma');
 for(const tbl of ['HospitalOperator','ResearchGrant','AdministrativeAuditEvent']){
  assert.ok(sql.includes('CREATE TABLE "'+tbl+'"'));
  assert.ok(schema.includes('model '+tbl+' {'));
 }
 assert.match(sql,/HospitalOperator_authSubject_hospitalId_key/);
 assert.match(sql,/BEFORE UPDATE OR DELETE ON "AdministrativeAuditEvent"/);
});
test('new frontend containers receive only public OIDC/API environment variables',()=>{
 const compose=file('infrastructure/docker/compose.app.yml');
 for(const name of ['hospital-admin-portal','security-auditor-portal','researcher-portal']){
  const part=compose.split('\n  '+name+':\n')[1].split(/\n  [a-z][a-z0-9-]*:\n/)[0];
  assert.ok(part.includes('VITE_API_URL'));
  assert.doesNotMatch(part,/DATABASE_URL|TOKEN_SECRET|DB_PASSWORD|KEYCLOAK_ADMIN_PASSWORD/);
 }
});
test('new clinician enrollment defaults to inactive, unverified and requires institutional membership',()=>{
 const code=file('apps/api/src/modules/hospital-admin.service.ts');
 assert.match(code,/async enrollDoctor\(/);
 assert.match(code,/hospitalId:hospital.id,active:false,verified:false/);
 assert.match(code,/isActiveHospitalOperator\(fresh,principal.sub,hospital.id\)/);
 assert.match(code,/DOCTOR_ENROLLED_PENDING_VERIFICATION/);
});
