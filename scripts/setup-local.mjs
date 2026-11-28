#!/usr/bin/env node
// Initialize local demo configuration and reuse any existing credentials.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const target = new URL('../.env', import.meta.url);
const importFile = new URL('../private/keycloak-import/lankahealthchain-realm.json', import.meta.url);
const hasEnv = existsSync(target);

if (hasEnv) {
  console.log('Reusing existing .env.');
} else {
  let env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  const secrets = {
    CHANGE_BOOTSTRAP_DB_PASSWORD: randomBytes(24).toString('hex'),
    CHANGE_KEYCLOAK_ADMIN_PASSWORD: randomBytes(24).toString('hex'),
    CHANGE_CORE_DB_PASSWORD: randomBytes(24).toString('hex'),
    CHANGE_NORTHERN_DB_PASSWORD: randomBytes(24).toString('hex'),
    CHANGE_JAFFNA_DB_PASSWORD: randomBytes(24).toString('hex'),
    CHANGE_VENUS_DB_PASSWORD: randomBytes(24).toString('hex'),
    CHANGE_NORTHERN_SERVICE_SECRET_WITH_64_RANDOM_CHARACTERS: randomBytes(32).toString('hex'),
    CHANGE_JAFFNA_SERVICE_SECRET_WITH_64_RANDOM_CHARACTERS: randomBytes(32).toString('hex'),
    CHANGE_VENUS_SERVICE_SECRET_WITH_64_RANDOM_CHARACTERS: randomBytes(32).toString('hex'),
    CHANGE_DEMO_PATIENT_PASSWORD: randomBytes(20).toString('hex'),
    CHANGE_DEMO_DOCTOR_PASSWORD: randomBytes(20).toString('hex'),
    CHANGE_DEMO_ADMIN_PASSWORD: randomBytes(20).toString('hex'),
    CHANGE_DEMO_HOSPITAL_PASSWORD: randomBytes(20).toString('hex'),
    CHANGE_DEMO_AUDITOR_PASSWORD: randomBytes(20).toString('hex'),
    CHANGE_DEMO_RESEARCHER_PASSWORD: randomBytes(20).toString('hex'),
  };
  for (const [placeholder, value] of Object.entries(secrets)) {
    if (!env.includes(placeholder)) throw new Error(`Missing template value: ${placeholder}`);
    env = env.replaceAll(placeholder, value);
  }
  writeFileSync(target, env, { mode: 0o600, flag: 'wx' });
  console.log('Created .env with randomized local-only credentials.');
}

if (hasEnv && existsSync(importFile)) {
  console.log('Reusing existing Keycloak demo realm import.');
} else {
  const generator = fileURLToPath(new URL('generate-keycloak-realm.mjs', import.meta.url));
  const realm = spawnSync(process.execPath, [generator], { stdio: 'inherit' });
  if (realm.error) throw realm.error;
  if (realm.status !== 0) {
    console.error('Keycloak realm generation failed. Fix the error above and rerun local setup.');
    process.exitCode = 1;
  }
}
