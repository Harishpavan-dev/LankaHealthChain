#!/usr/bin/env node
/** Generate disposable local-only Keycloak realm from .env. Never commit output. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const input=readFileSync(join(root,'.env'),'utf8');
const env={};
for(const line of input.split(/\r?\n/)){
 const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
 if(match)env[match[1]]=match[2].trim();
}
function required(name){
 const v=env[name];
 if(!v||v.startsWith('CHANGE_'))throw Error(`Configure ${name} in private .env`);
 return v;
}
const origins=required('CORS_ORIGINS').split(',').map(v=>v.trim());
if(origins.length!==6||new Set(origins).size!==6)throw Error('Require exactly six unique browser portal origins');
for(const origin of origins){
 const u=new URL(origin);
 if(u.origin!==origin||!['http:','https:'].includes(u.protocol)||u.username||u.password)
  throw Error('CORS origin invalid for local Keycloak realm');
 if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname))
  throw Error('Disposable demo accounts may only be configured for loopback origins');
}
const realm=JSON.parse(readFileSync(join(root,'infrastructure/keycloak/realm-config/lankahealthchain-realm.json'),'utf8'));
const browser=realm.clients.find(c=>c.clientId==='lhc-web');
if(!browser)throw Error('Missing lhc-web client');
browser.redirectUris=origins.map(origin=>`${origin}/*`);
browser.webOrigins=origins;
const accountVars={
 'patient.arun':'LHC_DEMO_PATIENT_PASSWORD',
 'doctor.venus':'LHC_DEMO_DOCTOR_PASSWORD',
 'admin.network':'LHC_DEMO_ADMIN_PASSWORD',
 'hospital.venus':'LHC_DEMO_HOSPITAL_PASSWORD',
 'auditor.demo':'LHC_DEMO_AUDITOR_PASSWORD',
 'researcher.demo':'LHC_DEMO_RESEARCHER_PASSWORD',
};
for(const user of realm.users){
 const key=accountVars[user.username];if(!key)continue;
 const password=required(key);
 if(password.length<24)throw Error(`${key} is too short`);
 for(const credential of user.credentials||[]){
  if(credential.type==='password')credential.value=password;
 }
}
const target=join(root,'private','keycloak-import');
mkdirSync(target,{recursive:true,mode:0o700});
writeFileSync(join(target,'lankahealthchain-realm.json'),JSON.stringify(realm,null,2)+'\n',{mode:0o600});
console.log('Private synthetic Keycloak realm generated for six loopback portals.');
