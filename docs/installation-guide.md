# LankaHealthChain v0.13.0 — Installation Guide

> **Important:** This source is suitable for synthetic test data only. A functioning local demo is not equivalent to a deployed, audited clinical system. Midnight ZK consent and Cardano Preprod anchoring need separately configured/tested real network integrations.

## 1. Requirements

- Git, Node.js **22.22.3+**, Corepack/pnpm 10.18, Docker Engine or Docker Desktop with Compose v2.
- At least 8 GB of RAM is recommended for PostgreSQL + Keycloak + the Node.js API/worker + Next.js app.
- Free local ports 3000 (API), 3001 (Next.js), 8080 (Keycloak) and 5432 (PostgreSQL); change the matching values in `.env` to avoid conflicts.
- Initial internet access to download npm packages and container images.

## 2. Quick start (Linux, macOS, Windows WSL2)

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
node scripts/setup-local.mjs
# Generates a PRIVATE .env and private/keycloak-import/ with random synthetic demo passwords.
docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml up -d --build
```

Never commit `.env`, `private/`, private keys or real medical records. You can rerun setup to generate a missing Keycloak import with the credentials in your existing `.env`. If you change the frontend origin later, update `WEB_BASE_URL`, `CORS_ORIGINS`, and `NEXT_PUBLIC_*`, run `node scripts/generate-keycloak-realm.mjs`, and restart the affected services. See the [Next.js migration guide](operations/nextjs-migration.md).

## 3. Websites

| Component | Development URL |
|---|---|
| Next.js homepage | http://localhost:3001 |
| Patient | http://localhost:3001/patient |
| Doctor | http://localhost:3001/doctor |
| Network admin | http://localhost:3001/admin |
| Hospital admin | http://localhost:3001/hospital-admin |
| Security auditor | http://localhost:3001/auditor |
| Researcher | http://localhost:3001/researcher |
| NestJS API health | http://localhost:3000/api/v1/health |
| Swagger development UI | http://localhost:3000/api/docs |
| Keycloak admin | http://localhost:8080 |

These are loopback-only **development defaults**, not production deployment URLs. The API host/port and Next.js host/port may be changed through environment variables. Next.js browser URLs are public, never secret values.

## 4. Demo identity accounts

The local Keycloak realm is generated using the following usernames:

| Role | Username | Password in local `.env` |
|---|---|---|
| Patient | `patient` | `LHC_DEMO_PATIENT_PASSWORD` |
| Doctor | `doctor` | `LHC_DEMO_DOCTOR_PASSWORD` |
| Network admin | `admin` | `LHC_DEMO_ADMIN_PASSWORD` |
| Hospital admin | `hospital` | `LHC_DEMO_HOSPITAL_PASSWORD` |
| Security auditor | `auditor` | `LHC_DEMO_AUDITOR_PASSWORD` |
| Researcher | `researcher` | `LHC_DEMO_RESEARCHER_PASSWORD` |

These identities exist only for demonstration, and access to data is independently checked on the backend.

## 5. Run quality checks

```bash
pnpm install --frozen-lockfile
pnpm test:all
pnpm config:audit
pnpm check:syntax
# Export the browser-facing NEXT_PUBLIC_OIDC_URL, NEXT_PUBLIC_OIDC_REALM,
# NEXT_PUBLIC_OIDC_CLIENT_ID, and NEXT_PUBLIC_API_URL before building.
pnpm build
pnpm typecheck
```

Verify actual containers/migrations with:

```bash
docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml ps
docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml logs --tail=150 api frontend keycloak postgres
```

Database migrations and synthetic seeds are performed by the `migrate-and-seed` service. The three hospital databases have distinct PostgreSQL accounts and distinct service-token secrets. The Cardano preparation worker uses a separate process with minimal database-only credentials.

## 6. Browser permissions and API behavior

The Next.js app uses Keycloak authorization-code with PKCE. Role gates improve the UI, but **server-side role + resource checks** are the security boundary. The backend rejects unauthorized clinical reads. Cross-hospital record access requires a patient-approved, active, scoped consent, and Cardano proofs are only considered on-chain verified once the network confirms a matching anchor.

Local `.env` defaults `CONSENT_MODE=local-demo` for a synthetic-only workflow. Never enable this in production. The backend refuses local-demo consent in production and denies consent approval when real Midnight verification has not been implemented.

## 7. Common issues

- Redirect rejected: regenerate Keycloak realm with exact `WEB_BASE_URL`; reinitialize a fresh demo realm when appropriate.
- CORS error: ensure `CORS_ORIGINS` contains the Next.js origin.
- UI loads but displays authorization error: check Keycloak realm roles and backend bearer token validation.
- Empty dashboards: run synthetic migrations/seeds and inspect the API logs.
- Browser cannot call API: `NEXT_PUBLIC_API_URL` must be reachable **from the browser**, not a Docker-internal hostname.
- Next.js build fails to download dependencies: npm registry access is required; avoid claiming a successful build based on syntax tests alone.
- Midnight proof server is optional via the Docker `midnight` profile; starting it does not connect consent to real testnet.

## 8. Production-readiness gates

Do not use real patient records until a verified Midnight contract/consent lifecycle, confirmed Cardano submissions, full database migration tests, browser E2E, security threat modeling, backups, audit controls, availability monitoring, regulatory review and independent clinical/security acceptance are complete.
