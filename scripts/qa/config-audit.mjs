#!/usr/bin/env node
/** Zero-dependency release gate: no hard-coded deployment coordinates in runtime files. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../../',import.meta.url);
const text=rel=>readFileSync(new URL(rel,root),'utf8');
const errors=[];
const assert=(ok,message)=>{if(!ok)errors.push(message);};
const envTemplate=text('.env.example');
const realm=JSON.parse(text('infrastructure/keycloak/realm-config/lankahealthchain-realm.json'));
const browser=realm.clients.find(c=>c.clientId==='lhc-web');
assert(browser&&browser.redirectUris.length===0&&browser.webOrigins.length===0,'Keycloak browser redirects must come from generated private config');
assert(realm.users.every(u=>(u.credentials||[]).every(c=>c.type!=='password'||String(c.value).startsWith('\${'))),'Keycloak demo passwords must not be hardcoded');
const declared=new Set([...envTemplate.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(m=>m[1]));
const compose=['infrastructure/docker/compose.yml','infrastructure/docker/compose.app.yml'];
for(const file of compose){
 for(const match of text(file).matchAll(/\$\{([A-Z][A-Z0-9_]*)(?::[-?][^}]*)?\}/g))
  assert(declared.has(match[1]),`${file}: undeclared environment variable ${match[1]}`);
}
const runtimeFiles=[
 'apps/api/src/main.ts','apps/hospital-simulator/src/main.ts',
 'packages/web/src/auth.ts','packages/shared/src/cardano-verification.ts',
];
for(const file of runtimeFiles){
 const code=text(file);
 assert(!/https?:\/\/(localhost|127\.0\.0\.1|cardano-preprod\.blockfrost\.io)/i.test(code),`${file}: hard-coded infrastructure URL`);
}
assert(/CORS_ORIGINS: \$\{CORS_ORIGINS:\?/.test(text('infrastructure/docker/compose.app.yml')),
 'App Docker Compose must provide explicit CORS_ORIGINS');
assert(/CARDANO_METADATA_API_BASE_URL: \$\{CARDANO_METADATA_API_BASE_URL:\?/.test(text('infrastructure/docker/compose.app.yml')),
 'Cardano provider URL must be configurable in Docker');
for(const portal of ['patient','doctor','admin','hospital-admin','security-auditor','researcher']){
 const block=text('infrastructure/docker/compose.app.yml').split(`  ${portal}-portal:\n`)[1];
 assert(!!block,`Missing ${portal} portal Docker service`);
 if(block){
  const section=block.split(/\n  [a-z][a-z0-9-]*:\n/)[0];
  for(const field of ['VITE_OIDC_URL','VITE_OIDC_REALM','VITE_OIDC_CLIENT_ID','VITE_API_URL'])
   assert(section.includes(`${field}: \${${field}:?`),`${portal} portal has a nonconfigurable ${field}`);
  assert(!/DATABASE_URL|DB_PASSWORD|TOKEN_SECRET/.test(section),`${portal} portal receives private secrets`);
 }
}
assert(/^\.env$/m.test(text('.gitignore')),'Repository must ignore private .env');
assert(/\/private\//.test(text('.gitignore')),'Repository must ignore generated Keycloak and Cardano secrets');
if(errors.length){for(const e of errors)console.error('FAIL:',e);process.exitCode=1;}
else console.log(`PASS: deployment config audit, ${declared.size} documented variables, 6 scoped portals, explicit runtime URLs`);
