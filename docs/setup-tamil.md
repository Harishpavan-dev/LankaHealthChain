# LankaHealthChain v0.11.0 – தமிழில் Local Setup Guide

**குறிப்பு:** இது Hackathon/Synthetic demo மட்டும். Real Hospital Data பயன்படுத்தாதீர்கள். Local consent என்பது Midnight Proof அல்ல.

## தேவையான Software

- Node.js **22.22.3+**, Corepack/pnpm 10.18.0
- Docker Desktop + Docker Compose, WSL2 (Windows பயன்படுத்தினால்)
- Git, Internet access (முதல் build-க்கு)

## 1. Project Config உருவாக்குதல்

```bash
cd LankaHealthChain
node scripts/setup-local.mjs
```

இந்த command `.env`-ல் unique database, service signing, demo login passwords உருவாக்கும். மேலும் `private/keycloak-import/lankahealthchain-realm.json` என்ற **Git-க்கு வெளியான** Keycloak config உருவாகும். `.env` மற்றும் `private/` GitHub-க்கு upload செய்யக்கூடாது.

**ஏற்கெனவே `.env` இருந்தால்:** script overwrite செய்யாது. புதிய settings சேர்த்து `node scripts/generate-keycloak-realm.mjs` இயக்குங்கள் அல்லது secrets backup செய்து புதிய local environment உருவாக்குங்கள். பழைய database volume-இல் passwords மாறினால் connection failure வரலாம்; data backup இல்லாமல் volume நீக்க வேண்டாம்.

### முக்கியமான Config Variables

| Variable | பயன்பாடு |
|---|---|
| `PORT` | Core API listener port |
| `CORS_ORIGINS` | Allowed six frontend origins |
| `VITE_API_URL` | Browser-இல் அணுகக்கூடிய `/api/v1` URL |
| `VITE_OIDC_URL` | Browser-இல் அணுகக்கூடிய Keycloak URL |
| `OIDC_ISSUER` | Expected signed token issuer |
| `OIDC_JWKS_INTERNAL_URL` | Docker internal Keycloak JWKS |
| `HOSPITAL_*_PORT` | Hospital server ports |
| `HOSPITAL_*_INTERNAL_URL` | Docker-internal Hospital endpoints |
| `HOSPITAL_*_URL` | Native host-side Hospital endpoints |
| `CARDANO_METADATA_API_BASE_URL` | Configurable Preprod read-only provider base URL |
| `BLOCKFROST_PREPROD_PROJECT_ID` | Optional provider API key (private `.env` only) |
| `LHC_DEMO_*_PASSWORD` | 6 synthetic login passwords (randomized) |

இந்த variables-ஐ மாற்றும்போது `VITE_*`, `CORS_ORIGINS` மற்றும் Keycloak Redirect URLs ஒன்றுக்கொன்று பொருந்த வேண்டும். Portal URLs மாறினால் `node scripts/generate-keycloak-realm.mjs` மறுபடியும் இயக்குங்கள்.

## 2. Containers Start

```bash
docker compose --env-file .env \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml up -d --build
```

இதில் PostgreSQL, Keycloak, Core API, 3 Hospital API services, Cardano offline preparation worker, 6 Frontend portals மற்றும் migration/seed job அடங்கும். Midnight Proof Server-க்கு optional `midnight` profile தனியாக உள்ளது; இதனால் ZK proof integration தானாக முடிந்துவிடாது.

```bash
docker compose --env-file .env \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml ps
```

## 3. உள்ளூர் URLs

Default `.env.example` ports அடிப்படையில்:

| Service | Local URL |
|---|---|
| Patient | http://localhost:5173 |
| Doctor | http://localhost:5174 |
| Network Admin | http://localhost:5175 |
| Hospital Admin | http://localhost:5176 |
| Security Auditor | http://localhost:5177 |
| Researcher | http://localhost:5178 |
| Core Swagger | http://localhost:3000/api/docs |

இவை `.env` மாற்றும்போது மாறும். Demo user names `infrastructure/keycloak/realm-config/lankahealthchain-realm.json` template-ல் உள்ளன; passwords `LHC_DEMO_*_PASSWORD` variables-ல் மட்டுமே கிடைக்கும். இந்த credentials-ஐ Public site-க்கு பயன்படுத்தாதீர்கள்.

## 4. Tests

```bash
node scripts/qa/config-audit.mjs
node --experimental-strip-types --test tests/unit/*.test.mjs
node --experimental-strip-types --test tests/integration/*.test.mjs
node scripts/qa/verify-openapi.mjs
```

Real stack startup பிறகு:

```bash
set -a; . ./.env; set +a
node scripts/qa/live-smoke.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-flow.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-governance.mjs
```

Synthetic E2E scripts real patient data இல்லாத local loopback environment-க்கு மட்டுமே. Live tests நமது coding environment-ல் execute செய்யப்படவில்லை.

## 5. Database Migration

`packages/database/prisma/migrations/` – **15 Core migration files**.
`packages/hospital-database/prisma/migrations/` – **3 reusable Hospital migration files**.

Compose-ன் `migrate-and-seed` process இதை apply செய்ய வடிவமைக்கப்பட்டுள்ளது. Running PostgreSQL-ல் history-ஐ உண்மையில் verify செய்யவும். பழைய schema-ஐ delete செய்யாமல் sequential migrations பயன்படுத்தவும். Database owner isolation: `pnpm db:verify-isolation` (dependencies + databases ready ஆனபின்).

## 6. Troubleshooting

- **API startup fails:** `.env`-ல் `PORT`, `CORS_ORIGINS`, OIDC variables, 3 hospital secrets இருக்கிறதா பார்க்கவும்.
- **Keycloak login/redirect mismatch:** Public origin + `CORS_ORIGINS` சரிபார்த்து, realm-ஐ regenerate செய்து development Keycloak import/restart செய்யுங்கள். Existing Keycloak realm imported once; fresh synthetic environment தேவைப்படலாம்.
- **Database migration fails:** `docker compose ... logs migrate-and-seed`, owner credentials, Postgres health, `_prisma_migrations` பார்க்கவும்.
- **Cardano unverified:** `BLOCKFROST_PREPROD_PROJECT_ID` இல்லாவிட்டாலும் app இயங்கலாம்; live Preprod TX இல்லாமல் confirmed என claim செய்ய வேண்டாம்.
- **Midnight:** `local-demo` approval மட்டுமே; real Compact contract/prover/testnet authorizations இன்னும் integrate செய்யப்படவில்லை.

**Submission முன்பு:** `[docs/testing/deployment-checklist.md](testing/deployment-checklist.md)` checklist-ஐ பயன்படுத்துங்கள். Production-ready என்று கூறாதீர்கள்.
