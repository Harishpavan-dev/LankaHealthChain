import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
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
  const origins=['http://localhost:6001'];
  const keys=['PATIENT','DOCTOR','ADMIN','HOSPITAL','AUDITOR','RESEARCHER'];
  writeFileSync(join(temp,'.env'),[
   `WEB_BASE_URL=${origins[0]}`,
   `CORS_ORIGINS=${origins.join(',')}`,
   ...keys.map(k=>`LHC_DEMO_${k}_PASSWORD=temporaryExampleSecret${k.padEnd(24,'X')}`),
  ].join('\n'));
  const ran=spawnSync(process.execPath,[scriptDest],{cwd:temp,encoding:'utf8'});
  assert.equal(ran.status,0,ran.stderr);
  const out=JSON.parse(readFileSync(join(temp,'private/keycloak-import/lankahealthchain-realm.json'),'utf8'));
  const browser=out.clients.find(c=>c.clientId==='lhc-web');
  assert.deepEqual(browser.webOrigins,origins);
  assert.deepEqual(browser.redirectUris,origins.map(o=>`${o}/*`));
  const patient=out.users.find(u=>u.username==='patient');
  assert.deepEqual(out.users.map(u=>u.username),['patient','doctor','admin','hospital','auditor','researcher']);
  for(const user of out.users) {
   assert.ok(user.firstName && user.lastName, `${user.username} needs a complete Keycloak profile`);
  }
  assert.match(patient.credentials[0].value,/temporaryExampleSecretPATIENT/);
  assert.doesNotMatch(patient.credentials[0].value,/DemoPatient123/);
  assert.ok(!readFileSync(templateSrc,'utf8').includes('http://localhost:'));
 } finally { rmSync(temp,{recursive:true,force:true}); }
});

test('local setup resumes Keycloak generation using the original credentials', () => {
  const temp = mkdtempSync(join(tmpdir(), 'lhc-setup-'));
  try {
    for (const file of ['scripts/setup-local.mjs', 'scripts/generate-keycloak-realm.mjs', '.env.example']) {
      const destination = join(temp, file);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(join(root, file), destination);
    }

    const setup = () => spawnSync(process.execPath, [join(temp, 'scripts/setup-local.mjs')], {
      cwd: temp, encoding: 'utf8',
    });
    const envPath = join(temp, '.env');
    const realmPath = join(temp, 'private/keycloak-import/lankahealthchain-realm.json');

    const failed = setup();
    assert.equal(failed.status, 1, failed.stderr);
    assert.match(failed.stderr, /rerun local setup/);
    assert.equal(existsSync(realmPath), false);
    const originalEnv = readFileSync(envPath);

    const template = 'infrastructure/keycloak/realm-config/lankahealthchain-realm.json';
    const templatePath = join(temp, template);
    mkdirSync(dirname(templatePath), { recursive: true });
    copyFileSync(join(root, template), templatePath);

    const resumed = setup();
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.ok(readFileSync(envPath).equals(originalEnv));
    const realm = JSON.parse(readFileSync(realmPath, 'utf8'));
    const password = originalEnv.toString('utf8').match(/^LHC_DEMO_PATIENT_PASSWORD=([a-f0-9]{40})\r?$/m)?.[1];
    assert.ok(password);
    assert.ok(realm.users.find(user => user.username === 'patient').credentials[0].value === password);

    const existingImport = readFileSync(realmPath);
    rmSync(templatePath);
    const repeated = setup();
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.ok(readFileSync(realmPath).equals(existingImport));
    assert.ok(readFileSync(envPath).equals(originalEnv));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
