# LankaHealthChain v0.11.0 — Release Verification

**Date:** 22 November 2026. **Release type:** submission-hardening source preview, synthetic-data only.

## Verified in the authoring environment

| Verification | Measured result | Scope |
|---|---:|---|
| Dependency-free unit tests (`node --experimental-strip-types --test tests/unit/*.test.mjs`) | **139 passed / 0 failed** | Authorization, Merkle/provenance, FHIR, replay, config, Keycloak generation, API contracts |
| HTTP protocol-double integration tests | **3 passed / 0 failed** | Scoped internal read/write simulation; not running NestJS/Postgres |
| OpenAPI route consistency (`node scripts/qa/verify-openapi.mjs`) | **40/40 operations passed** | Controller/declarative contract match, schema references, auth metadata |
| Configuration audit (`node scripts/qa/config-audit.mjs`) | **PASS** | 57 `.env.example` values, six portal public configs, no runtime hard-coded local/provider URLs |
| TypeScript/TSX transpile/syntax check | **81 files / 0 diagnostics** | No dependency-aware complete compilation |
| Shared TS package `tsc --noEmit` with available preinstalled Node types | **PASS** | `packages/shared` only |
| Docker/CI YAML and API/realm JSON parsing | **PASS** | Static syntax validation only |
| Keycloak private realm generation with alternate local ports | **PASS** | Generates six correct redirects and randomized-credential placeholders in test |
| Setup-local random secret and private realm generation | **PASS** | Executed on throwaway configuration; private outputs deleted before packaging |
| Markdown relative-link audit | **PASS** | Source docs after current status report |

## v0.11.0 changes

- Removed application-level `localhost` defaults for public OIDC/API, CORS and Cardano metadata provider; added validated required configuration values.
- Hospital service ports and Docker internal URL/host URL distinction are configuration driven.
- Configurable Cardano metadata provider base URL; invalid external HTTP and malformed transaction identifiers rejected.
- Removed hard-coded demo user passwords and browser redirect addresses from Keycloak template. Generate a private realm from `.env`; CI uses generated demo credentials.
- Introduced static config audit and regression tests; kept six portal applications and outbox worker isolated from database secrets.
- Rewrote current README, Tamil setup, migration guide and implementation plan; removed duplicate historical result files from latest source. Prior Git tags preserve history.
- Retained **15 Core migration files, 3 Hospital migration files**, all six user portals, 40 API endpoints and the background worker.

## Not verified / cannot be claimed complete

- Full pnpm dependency install and NestJS/Prisma/React build: **not run successfully**; npm registry DNS unavailable and requested Node toolchain version unavailable.
- Docker image build, PostgreSQL migrations, Keycloak full login journey, browser E2E and load testing: **not run**; Docker/PostgreSQL unavailable in this authoring runtime.
- Cardano Preprod live signed submission/confirmation: **not run**; requires wallet/keys, faucet tokens and a reachable node/provider.
- Midnight Compact contract compilation/deployment, real ZK proof and state-dependent revocation: **not run**; compatible compiler, proof server, wallet and network unavailable. `local-demo` consent is not a ZK proof.
- External security review, hospital integration and Sri Lankan clinical/privacy/regulatory approval: **not done**. Never use real patient data.

## Operational release gate

The ZIP may be submitted as **synthetic-source prototype** with these explicit limitations. It is **not** a verified 100% working dual-blockchain hospital platform, production-ready healthcare platform, or clinically safe deployment. For live demo, use the local setup guide and record actual independent test evidence. Do not claim network proof without a block explorer and verified transaction IDs.
