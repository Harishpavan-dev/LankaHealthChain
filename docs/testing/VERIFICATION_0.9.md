# LankaHealthChain v0.9.0 – Verification & Release Report

**Release date:** 2026-11-22 | **Type:** development source release | **Data:** synthetic only

## Implemented in source

- Six separate role-gated React frontends: patient, doctor, network administrator, hospital administrator, security auditor, researcher. Responsive minimal light-theme shared CSS.
- Hospital administrator: server-side `hospital_admin` realm role **plus** active per-hospital `HospitalOperator` DB mapping, doctor onboarding (starts inactive and unverified), scoped doctor status changes, own audit metadata.
- Network administrator: managed operator enrollment/revocation and **synthetic-only** research grant enrollment/revocation; administrative changes audited.
- Security auditor: aggregated and paginated event metadata with explicit projections excluding patient IDs, actor subject IDs, record IDs, FHIR payloads and free-text metadata.
- Researcher: approved, non-expired DB grant, only synthetic resource-type counts, groups of fewer than 10 suppressed. Disabled when `NODE_ENV=production`.
- Keycloak dev realm: six roles; new identity templates; Vite client redirect origins for ports 5176-5178.
- New Core Prisma models and SQL migration: `HospitalOperator`, `ResearchGrant`, `AdministrativeAuditEvent` (append-only trigger).
- API v1 OpenAPI 3.1 documents **39 backend routes**, with role requirements and request bodies. Generated Postman collection mirrors all routes.
- Docker Compose adds three new frontend services. CI adds a *not yet run here* real-stack governance integration script.

## Successfully executed in this environment

| Check | Evidence |
|---|---|
| Unit tests | **125 / 125 passed** using Node's built-in test runner |
| Protocol tests | **3 / 3 passed** (simulated localhost HTTP flows; not NestJS+PostgreSQL E2E) |
| API/OpenAPI parity | **39 / 39** controller route operations documented |
| TypeScript/TSX syntax checks | **77** source files, zero syntax diagnostics |
| New pure governance TS typecheck | Passed using global TypeScript (`--strict`) |
| JSON syntax | 33 files parsed |
| YAML syntax | 6 files parsed |
| Shell script syntax | 4 files checked |
| Six Keycloak roles and app redirect URIs | Configuration parsed; role users present |
| PostgreSQL governance table/migration structure | Source checked; actual database execution not performed |

These do **not** constitute a full dependency-aware NestJS or browser build.

## Why a truthful 100% claim is not possible

The runtime has **Node.js 22.16.0**, while the project's requested engine is 22.22.3+. `pnpm`, Docker, PostgreSQL, Midnight Compact compiler and deployment credentials are unavailable. npm registry requests fail with DNS `EAI_AGAIN`, so dependencies could not be installed.

Consequently, the following work remains **NOT VERIFIED / INCOMPLETE**:

1. Entire pnpm monorepo dependency installation, lockfile generation, strict typecheck and production builds.
2. Apply 14 Core and 3 Hospital migrations to actual PostgreSQL; test upgrade/rollback and cross-database isolation.
3. Run NestJS, Keycloak, Hospital APIs and all six portals; execute `scripts/qa/live-flow.mjs` and `scripts/qa/live-governance.mjs`.
4. Browser E2E, load/performance benchmarks, observability operations and penetration/security audit.
5. Submit and verify a real Cardano Preprod transaction. Existing Merkle path remains offline only.
6. Compile, deploy and verify Midnight Compact contract and ZK proof. Current consent flow is **LOCAL_DEMO_NOT_MIDNIGHT** and fails closed in production.
7. Production privacy/legal approvals, institutional identities, signed hospital integrations, deployment infrastructure, security reviews, availability SLAs and clinical validation.

## Next reproducible checks on developer machine

```bash
node scripts/setup-local.mjs
# Requires compatible Node/pnpm and access to Docker image registries
docker compose --env-file .env -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml up -d --build
pnpm test
pnpm docs:check
LHC_HEALTH_ATTEMPTS=60 node scripts/qa/live-smoke.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-flow.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-governance.mjs
```

The last two scripts mutate **synthetic demonstration data only** and are deliberately restricted to loopback addresses. Do not use real patient records or public endpoints.

**Release classification: development prototype, not production-grade healthcare software.**
