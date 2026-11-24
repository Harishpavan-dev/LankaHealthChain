# LankaHealthChain v0.2.0 – Implementation and Verification Report

**Date:** 22 November 2026 | **Classification:** Local development preview / synthetic clinical simulation

## Engineering baseline delivered

- pnpm + TypeScript workspace; NestJS URI-versioned `/api/v1` Core API, DTO validation, OIDC JWT/JWKS verification, RBAC, basic throttling, audit events.
- React + Vite Patient, Doctor, Network Admin portals; common Keycloak/OIDC login library.
- Three independent hospital API instances and separately-owned PostgreSQL databases; the Core cannot use hospital DB credentials.
- Core PostgreSQL registry, patient mappings, scoped consent, medical record index, audit, outbox and Cardano anchor index.
- Five committed Core SQL migrations and one reusable Hospital migration (independently deployed against each of three hospital databases).
- Doctor writes a synthetic FHIR resource to their own hospital via a short-lived HMAC-scoped internal token, then registers a randomized commitment in Core.
- Access request → patient local-demo approval → patient-bound source-hospital retrieval → integrity verification → revocation → subsequent access denial.
- FHIR R4 **basic envelope guard only**, not a full FHIR profile or clinical terminology validator.
- Merkle batches of up to 100 randomized commitments, inclusion proofs, public Cardano metadata; operator-only Preprod submit/verification/import scripts. No completed live TX.
- Midnight Ledger 9 Compact **source draft only**. Not compiled or integrated into live authorization; local-demo consent intentionally fails closed in production.
- Synthetic Arun dataset + 100 additional fictional patients / 500 extra fake records (101 patients, 504 record references total). Only Arun has demo OIDC identity.
- Local-only Docker Compose services, deterministic seed, environment secret generator, docs and CI starter.

## Tests actually executed in this authoring environment

| Verification | Result | Scope |
|---|---|---|
| Standalone Node unit tests | **40/40 PASS** | Authorization, tamper, scoped token, canonical JWT signature, FHIR envelope, mappings, migrations statics, Merkle, offline chain-verifier mocks, dataset |
| Isolated localhost HTTP tests | **2/2 PASS** | Real Node HTTP protocol with **in-memory** hospital doubles; not NestJS/Postgres |
| TS/TSX syntax transpilation | **45 files / zero syntax diagnostics** | Not a full TypeScript typecheck |
| Docker Compose YAML parse | **2 files PASS** | YAML structural syntax only; Docker not run |
| Shell scripts | **PASS** | Bash and POSIX sh static syntax |
| Cardano CLI offline round-trip | **PASS** | 100 fictional commitments; inclusion proof indices 13 and 99. No on-chain TX |
| Synthetic population | **PASS** | 100 fabricated patients, 500 FHIR-style resource envelopes validated |

Full logs: `docs/testing/latest-unit-test-output.txt` and `docs/testing/latest-protocol-test-output.txt`.

## What is NOT completed or validated

1. **Full install/build/typecheck:** this authoring environment has Node 22.16.0, below Prisma 7's Node requirement, and cannot access npm registry to fetch dependencies.
2. **Actual SQL migration and Docker Compose boot:** no Docker Engine or PostgreSQL server available here; migrations exist but have **not been applied** to a real database.
3. **Keycloak browser login, API+Prisma true E2E, k6 performance tests:** not run. Scalable design is a goal, **not a measured scale claim**.
4. **Cardano Preprod:** no authorized wallet, funded testnet UTXO, Cardano node or API key; scripts are templates and transaction confirmation has not been performed.
5. **Midnight:** Compact contract is uncompiled, untested, undeployed and not called by live API. There are **no real ZK proof results**.
6. **Production controls:** clinical validation, independent security audit, encryption at rest with managed keys, HA, backup/recovery, real hospital/legal approvals and consent policy review are necessary before using patient data.

## Local reproducible validation plan

1. Install Node >=22.22.3, Docker Desktop/WSL2 and enable network access to package registries.
2. `node scripts/setup-local.mjs` to generate uncommitted `.env` secrets.
3. Start Compose: `docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml up -d --build`.
4. Verify four databases and distinct roles (`docs/testing/deployment-checklist.md`), then migrations in `_prisma_migrations` and seed record counts.
5. Run `pnpm test`, `pnpm test:protocol`, `pnpm check:syntax`, `pnpm typecheck`, `pnpm build`. Preserve failing output; do **not** promote the app until fixed.
6. Test full OIDC browser flow, role isolation, source-hospital write/read, patient consent, tamper, expiry and revocation against actual persisted data.
7. Prepare Cardano batches offline. Testnet sign/submit ONLY with a test wallet and explicit operator approval; verify confirmed on-chain metadata with Blockfrost.
8. Compile, test and deploy Midnight via the exact compatible toolchain; integrate client-side proof and fail-closed server verification *before* claiming privacy-preserving authorization.
9. Perform k6 bounded load tests on **owned local infrastructure** with synthetic data, compare P50/P95 and error rates, then review security and privacy requirements.

**Release judgement:** functional source-code preview with partial offline verification, **not a finished production system, not a proven live dual-chain MVP**.
