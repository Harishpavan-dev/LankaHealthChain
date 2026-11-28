#!/usr/bin/env node
/** Only checks health endpoints of an already running local deployment.
 * No patient data or keys are sent, and it does not claim E2E verification.
 */
import { setTimeout as delay } from 'node:timers/promises';
const apiBase=process.env.VITE_API_URL||(()=>{throw Error('VITE_API_URL missing; source private .env')})();
const keycloakBase=process.env.VITE_OIDC_URL||(()=>{throw Error('VITE_OIDC_URL missing; source private .env')})();
const checks = [
  ['Core API', process.env.LHC_API_HEALTH_URL || `${apiBase}/health`],
  ['Core readiness', process.env.LHC_API_READY_URL || `${apiBase}/health/ready`],
  ['Keycloak', process.env.LHC_KEYCLOAK_HEALTH_URL || `${keycloakBase}/realms/${process.env.VITE_OIDC_REALM||'lankahealthchain'}/.well-known/openid-configuration`],
];
const tries = Math.min(60, Math.max(1, Number.parseInt(process.env.LHC_HEALTH_ATTEMPTS || '3',10) || 3));
let failures = 0;
for (const [label, endpoint] of checks) {
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Expected HTTP(S) URL');
  let ok = false;
  let reason = '';
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || typeof payload !== 'object') throw new Error('Unexpected JSON');
      if (label === 'Core API' && payload.status !== 'ok') throw new Error('API status not ok');
      if (label === 'Core readiness' && payload.status !== 'ready') throw new Error('API database not ready');
      if (label === 'Keycloak' && typeof payload.issuer !== 'string') throw new Error('OIDC discovery missing issuer');
      ok = true;
      break;
    } catch (error) { reason = error.message; if (attempt < tries-1) await delay(1000); }
  }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${url.origin}${url.pathname}${ok ? '' : ` — ${reason}`}`);
  if (!ok) failures++;
}
console.log('Health checks only. This does NOT validate migrations, user login, consent flow, or blockchain.');
if (failures) process.exitCode = 1;
