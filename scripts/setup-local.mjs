#!/usr/bin/env node
// Create unique development secrets WITHOUT ever overwriting an existing env file.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const target=new URL('../.env',import.meta.url);
if(existsSync(target)){console.error('.env already exists; refusing to overwrite secrets.');process.exit(1);}
let env=readFileSync(new URL('../.env.example',import.meta.url),'utf8');
const secrets={
 CHANGE_BOOTSTRAP_DB_PASSWORD:randomBytes(24).toString('hex'),
 CHANGE_KEYCLOAK_ADMIN_PASSWORD:randomBytes(24).toString('hex'),
 CHANGE_CORE_DB_PASSWORD:randomBytes(24).toString('hex'),
 CHANGE_NORTHERN_DB_PASSWORD:randomBytes(24).toString('hex'),
 CHANGE_JAFFNA_DB_PASSWORD:randomBytes(24).toString('hex'),
 CHANGE_VENUS_DB_PASSWORD:randomBytes(24).toString('hex'),
 CHANGE_NORTHERN_SERVICE_SECRET_WITH_64_RANDOM_CHARACTERS:randomBytes(32).toString('hex'),
 CHANGE_JAFFNA_SERVICE_SECRET_WITH_64_RANDOM_CHARACTERS:randomBytes(32).toString('hex'),
 CHANGE_VENUS_SERVICE_SECRET_WITH_64_RANDOM_CHARACTERS:randomBytes(32).toString('hex'),
 CHANGE_DEMO_PATIENT_PASSWORD:randomBytes(20).toString('hex'),
 CHANGE_DEMO_DOCTOR_PASSWORD:randomBytes(20).toString('hex'),
 CHANGE_DEMO_ADMIN_PASSWORD:randomBytes(20).toString('hex'),
 CHANGE_DEMO_HOSPITAL_PASSWORD:randomBytes(20).toString('hex'),
 CHANGE_DEMO_AUDITOR_PASSWORD:randomBytes(20).toString('hex'),
 CHANGE_DEMO_RESEARCHER_PASSWORD:randomBytes(20).toString('hex')
};
for(const [placeholder,value] of Object.entries(secrets)){
 if(!env.includes(placeholder))throw new Error(`Missing template value: ${placeholder}`);
 env=env.replaceAll(placeholder,value);
}
writeFileSync(target,env,{mode:0o600,flag:'wx'});
console.log('Created .env with randomized local-only credentials. Do not commit it or expose development services publicly.');

const realm=spawnSync(process.execPath,[new URL('generate-keycloak-realm.mjs',import.meta.url).pathname],{
 cwd:new URL('../',import.meta.url),encoding:'utf8'});
if(realm.status!==0){console.error('Realm generation failed:',realm.stderr);process.exitCode=1;}
else console.log('Created private Keycloak demo realm with environment-based redirect origins and random demo passwords.');
