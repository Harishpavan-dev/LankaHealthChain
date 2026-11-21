# LankaHealthChain v0.8.0 – Backend Resilience Release

**Date:** 2026-11-22 · **Audience:** UniHack 2026 synthetic-only MVP development

## Work genuinely delivered

1. **Crash-recoverable offline Cardano preparation.** The outbox worker persists
   Merkle proofs and batch rows in the database transaction first. On startup
   or following a batch commit, it reconstructs missing private manifest and
   public metadata files deterministically from pending anchors. It rejects
   missing, duplicate, incomplete, tampered or foreign proofs and refuses to
   overwrite mismatched existing artifacts. No real Cardano submission occurs.
2. **Database constraints.** New Core migrations 12 & 13 and Hospital migration
   3 enforce demo-specific FHIR locator/envelope checks and index pending
   Merkle batches. The three hospital databases still apply their migrations
   independently; this is not a single shared clinical database.
3. **Authorization hardening.** A verified doctor now must belong to an
   active hospital, and record release rechecks doctor + hospital status as
   well as patient consent after asynchronous cross-hospital retrieval.
4. **Admin-only operational readiness.** `GET /api/v1/admin/dependencies`
   performs bounded, endpoint-pinned readiness probes of Northern, Jaffna and
   Venus simulated hospital databases. It returns coarse states only; no
   internal URL, secret or clinical content.
5. **Minimal light-theme Admin UI.** Fixed Admin portal's mismatched role
   (`Admin` -> `Network Admin`), so the frontend role gate now maps to
   `network_admin`; added a restrained readiness status section.
6. **Docs and tests.** The canonical OpenAPI JSON and readable YAML document
   **22 API operations**, as does the regenerated Postman collection.
   Local-stack E2E script now tests the readiness API and patient-role denial.
   Added recovery, policy, readiness, role-gate, and migration index tests.

## What was executed and observed

- `node --experimental-strip-types --test tests/unit/*.test.mjs tests/integration/*.test.mjs`:
  **118 passed, 0 failed**, including offline Cardano CLI process tests and
  two synthetic HTTP protocol tests. Does **not** exercise NestJS+PostgreSQL.
- `node scripts/qa/syntax-check.cjs`: **60 TS/TSX files**, 0 syntax diagnostics.
- `tsc -p packages/shared/tsconfig.json --typeRoots /usr/local/slides_js/node_modules/@types`:
  **passed** with locally installed TypeScript 5.8.3. This is a *shared-library
  typecheck only*, not the required full TypeScript workspace build with 5.9.
- `node scripts/qa/verify-openapi.mjs`: **22/22 operations** mapped to real
  controller annotations with security roles and valid schema references.
- `node scripts/qa/generate-postman.mjs`: deterministic collection for 22
  operations, no populated credentials.
- Python JSON/YAML parser checks: all present source documents parsed; OpenAPI
  JSON and YAML contents are equivalent.
- `bash -n` migration/Compact/Cardano shell scripts: passed syntax only.

## Current blockers – not claimed complete

- Local Node is **22.16.0** (minimum declared 22.22.3); **pnpm, Docker,
  PostgreSQL and Compact compiler are not present**. npm registry DNS could
  not be resolved. Therefore no full NestJS build, Prisma migrations against
  a real database, Docker Compose startup, Keycloak login, browser E2E,
  production performance benchmark, or full workspace typecheck happened.
- **Midnight Compact contract remains an uncompiled draft.** No true ZK proof,
  patient-controlled wallet integration, contract deployment, or revocation
  proof verification has been performed. Backend fails closed outside
  `CONSENT_MODE=local-demo`, which is prohibited in production.
- **Cardano has offline proof tests only.** No Preprod transaction was signed,
  funded, submitted or confirmed; a transaction hash may not be invented.
- Real hospital systems, real personal health records, identity proofing,
  institutional consent, clinical validation, independent penetration test,
  data-protection impact assessment and production reliability remain outside
  this synthetic hackathon source release.

## Required final acceptance (real environment)

1. Install Node >=22.22.3, pnpm 10.18.0, Docker Engine and dependencies.
2. Run `node scripts/setup-local.mjs` in a **fresh checkout**, review `.env`,
   then use `docker compose --env-file .env -f infrastructure/docker/compose.yml
   -f infrastructure/docker/compose.app.yml up -d --build`.
3. Run migrations, database isolation verification and synthetic seeding.
4. Run `pnpm build`, `pnpm typecheck`, `pnpm test:all`, `pnpm test:live-smoke`,
   and opt-in `pnpm test:live-flow`. Inspect all failures before claiming success.
5. Compile the version-pinned Midnight Ledger 9 contract and run wallet/prover
   tests with actual current-state revocation checks. Replace local-demo
   consent with validated chain verification only after these pass.
6. Submit randomized Cardano Merkle metadata on **Preprod**, verify with an
   independent provider, import confirmed anchor, and rerun verification API.
7. Run browser E2E, bounded performance measurements, vulnerability review
   and security/privacy acceptance on synthetic data only.

**This is not 100% completion or clinical production readiness.** Percentages
in product updates are planning estimates, not a test coverage or compliance
score. All downloaded source is for local synthetic demonstrations only.
