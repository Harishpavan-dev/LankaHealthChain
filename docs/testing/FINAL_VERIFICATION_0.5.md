# LankaHealthChain v0.5.0 — Reproducible Verification Record

## What executed in this environment

- **89 / 89** dependency-free Node.js unit and HTTP-protocol-double tests passed (see `v0.5-offline-test.log`). These are **not** tests of a real NestJS HTTP server, actual database, blockchain or Keycloak.
- **52** TypeScript/TSX sources passed a **syntax/transpilation** check, with **0 diagnostics**. This does not constitute a dependency-aware TypeScript typecheck.
- **5** YAML and **25** JSON source documents parsed successfully with the available parsers. Bash scripts passed `bash -n`.
- Cardano synthetic batch CLI: 100 distinct commitments processed in a real child process, valid inclusion proof accepted; tampered metadata rejected. **No Preprod transaction was submitted.**
- Core database: **9** versioned migration SQL files and Prisma schema source prepared. Hospital database: **2** migration SQL files designed to apply separately to each of three databases. **They have NOT been applied to PostgreSQL here.**

## Critical changes since v0.4.0

- Expiring 24-hour access approval requests, with versioned migration.
- Verified-patient-scoped keyset pagination for clinical timeline, audit and doctor record retrieval; avoids silent truncation.
- Correct FHIR R4 `AllergyIntolerance.patient` relationship and bounded synthetic-write validation.
- Maximum four concurrent hospital reads; consent checked again before returning a batch.
- Strict public Cardano metadata/manifest verification, plus CLI-process regression tests.
- Removed universal `.env` injection from application and portal Docker services: least-privilege database/token environment variables.
- Executable real-PostgreSQL isolation test source and CI workflow, but execution pending.
- NestJS development launcher changed to `ts-node` to preserve legacy decorator metadata used for dependency injection.

## Work that is still not verified / not finished

1. `pnpm install` and full dependency-aware `pnpm typecheck` / `pnpm build`, due to npm registry DNS access failure in this container.
2. Docker Compose deployment, PostgreSQL migrations/seed and per-role database isolation runtime test, due to unavailable Docker and PostgreSQL.
3. Real Keycloak authentication, portal browser E2E and multi-container integration tests.
4. Cardano **Preprod** transaction signing, broadcasting, confirmation and live proof verification; requires wallet/test ADA, provider and network.
5. Midnight Compact contract compilation, ZK proof generation, SDK wiring, on-chain consent and revocation verification; **Midnight is a draft only, not an integrated production verifier**.
6. Independent security evaluation, privacy/legal assessment and operational/clinical acceptance. **Never use real patient information in this release**.

## Repeatable local developer commands

```bash
node --experimental-strip-types --test tests/unit/*.test.mjs tests/integration/*.test.mjs
node scripts/qa/syntax-check.cjs
node scripts/qa/preflight.mjs
node scripts/setup-local.mjs

docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml up -d --build
LHC_HEALTH_ATTEMPTS=60 node scripts/qa/live-smoke.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-flow.mjs
```

**Bottom line:** source foundation and offline tests are complete for v0.5.0. The full healthcare MVP and dual-blockchain integration are **not** complete or validated.
