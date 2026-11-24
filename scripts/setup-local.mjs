#!/usr/bin/env node
// Create unique development secrets WITHOUT ever overwriting an existing env file.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
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
 CHANGE_VENUS_SERVICE_SECRET_WITH_64_RANDOM_CHARACTERS:randomBytes(32).toString('hex')
};
for(const [placeholder,value] of Object.entries(secrets)){
 if(!env.includes(placeholder))throw new Error(`Missing template value: ${placeholder}`);
 env=env.replaceAll(placeholder,value);
}
writeFileSync(target,env,{mode:0o600,flag:'wx'});
console.log('Created .env with randomized local-only credentials. Do not commit it or expose development services publicly.');
