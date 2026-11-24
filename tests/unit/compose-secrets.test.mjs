import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../../infrastructure/docker/compose.app.yml',import.meta.url),'utf8');
function block(name){
 const from=text.indexOf(`  ${name}:\n`);assert.ok(from>=0,`missing ${name}`);
 const rest=text.slice(from);
 const next=rest.search(/\n  [a-z][a-z0-9-]*:\n/);
 return rest.slice(0,next>=0?next:undefined);
}
test('shared app image no longer injects every database password into every portal',()=>{
 assert.doesNotMatch(text,/^\s+env_file:/m);
 for(const name of ['patient-portal','doctor-portal','admin-portal']){
  const v=block(name);
  assert.match(v,/VITE_OIDC_URL/);
  assert.doesNotMatch(v,/DATABASE_URL|TOKEN_SECRET|DB_PASSWORD|KEYCLOAK_ADMIN_PASSWORD/);
 }
});
test('each hospital is passed only its own database URL and service secret',()=>{
 for(const current of ['northern','jaffna','venus']){
  const value=block(`hospital-${current}`);
  assert.match(value,new RegExp(`LHC_${current.toUpperCase()}_DB_PASSWORD`));
  assert.match(value,new RegExp(`HOSPITAL_${current.toUpperCase()}_TOKEN_SECRET`));
  for(const other of ['northern','jaffna','venus'].filter(x=>x!==current)){
   assert.ok(!value.includes(`LHC_${other.toUpperCase()}_DB_PASSWORD`));
   assert.ok(!value.includes(`HOSPITAL_${other.toUpperCase()}_TOKEN_SECRET`));
  }
 }
});
test('core API receives three signing secrets but no raw hospital DB credentials',()=>{
 const api=block('api');
 for(const code of ['NORTHERN','JAFFNA','VENUS']) assert.ok(api.includes(`HOSPITAL_${code}_TOKEN_SECRET`));
 assert.doesNotMatch(api,/LHC_(NORTHERN|JAFFNA|VENUS)_DB_PASSWORD/);
 assert.match(api,/OIDC_AUDIENCE/);
});
