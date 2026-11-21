import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('Keycloak realm is generated from private env, not static URLs or demo passwords',()=>{
 const temp=mkdtempSync(join(tmpdir(),'lhc-config-'));
 try {
  const scriptSrc=join(root,'scripts/generate-keycloak-realm.mjs');
  const scriptDest=join(temp,'scripts/generate-keycloak-realm.mjs');
  const templateSrc=join(root,'infrastructure/keycloak/realm-config/lankahealthchain-realm.json');
  const templateDest=join(temp,'infrastructure/keycloak/realm-config/lankahealthchain-realm.json');
  for(const x of [scriptDest,templateDest])mkdirSync(dirname(x),{recursive:true});
  copyFileSync(scriptSrc,scriptDest);copyFileSync(templateSrc,templateDest);
  const origins=Array.from({length:6},(_,i)=>`http://localhost:${6001+i}`);
  const keys=['PATIENT','DOCTOR','ADMIN','HOSPITAL','AUDITOR','RESEARCHER'];
  writeFileSync(join(temp,'.env'),[
   `CORS_ORIGINS=${origins.join(',')}`,
   ...keys.map(k=>`LHC_DEMO_${k}_PASSWORD=temporaryExampleSecret${k.padEnd(24,'X')}`),
  ].join('\n'));
  const ran=spawnSync(process.execPath,[scriptDest],{cwd:temp,encoding:'utf8'});
  assert.equal(ran.status,0,ran.stderr);
  const out=JSON.parse(readFileSync(join(temp,'private/keycloak-import/lankahealthchain-realm.json'),'utf8'));
  const browser=out.clients.find(c=>c.clientId==='lhc-web');
  assert.deepEqual(browser.webOrigins,origins);
  assert.deepEqual(browser.redirectUris,origins.map(o=>`${o}/*`));
  const patient=out.users.find(u=>u.username==='patient.arun');
  assert.match(patient.credentials[0].value,/temporaryExampleSecretPATIENT/);
  assert.doesNotMatch(patient.credentials[0].value,/DemoPatient123/);
  assert.ok(!readFileSync(templateSrc,'utf8').includes('http://localhost:'));
 } finally { rmSync(temp,{recursive:true,force:true}); }
});
