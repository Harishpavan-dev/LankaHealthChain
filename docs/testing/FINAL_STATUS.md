> Superseded by **`RELEASE_NOTES_0.4.md`** and final test logs for the current v0.4.0 package. v0.2 counts below are retained as historical evidence.

# LankaHealthChain – verification status (2026-11-22)

## Delivered source
- React Vite portals for patient, doctor and admin; NestJS `/api/v1` application; three hospital API simulators.
- Separate core and hospital PostgreSQL Prisma schemas, repeatable versioned migrations and synthetic demo seeds.
- Access request, scoped local-demo consent approval/rejection/revocation, source-hospital FHIR-like record write/retrieval, local hash integrity checks and audit history.
- Offline Cardano Merkle preparation and verification scripts. Midnight Compact source is a **draft**.
- Local Docker Compose, Keycloak dev realm configuration, CI source checks and setup documentation.

## Executed here
- `node --experimental-strip-types --test tests/unit/*.test.mjs tests/integration/*.test.mjs`: **42 passed, 0 failed**. Includes two localhost protocol tests against in-memory doubles; not the real NestJS/PostgreSQL stack.
- `node scripts/qa/syntax-check.cjs`: **45 TS/TSX source files, 0 transpilation diagnostics**. Does not substitute for `tsc --noEmit`.
- `node --check scripts/qa/live-smoke.mjs`: **passed**.

## Not verified / not finished
- `pnpm install`, complete TypeScript typecheck and browser builds: npm registry unreachable in this execution environment; its Node version is 22.16.0, below pinned project requirement of >=22.22.3.
- PostgreSQL migrations and seeds applied to a running server, Keycloak browser sign-in and actual app HTTP E2E: Docker and PostgreSQL are not available in this environment.
- Cardano live Preprod transaction signed/broadcast/confirmed: no suitable wallet/funded test ADA/provider credentials.
- Midnight contract compilation, prover operation, private on-chain authorization, and revocation verification: **not implemented**. In non-demo modes backend refuses record access.
- Full production hardening, data-protection review, real hospital interoperability and performance benchmarking: incomplete. **Synthetic data only**.

## Reproduce locally
1. Install Node >=22.22.3, pnpm 10.18.0 and Docker Desktop with Linux containers.
2. `node scripts/setup-local.mjs` and inspect `.env` (keep secret values private).
3. `docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml up --build -d`.
4. `pnpm test && pnpm test:protocol && pnpm check:syntax && pnpm typecheck && pnpm build && pnpm test:live-smoke`.
5. Follow `docs/testing/deployment-checklist.md`. Verify actual DB migrations, data-isolation, login, write/retrieve, consent/revocation manually. Record exact outcomes.
6. Before claiming a real dual-chain MVP, compile & deploy compatible Midnight contracts and verify Cardano Preprod transaction with public network evidence, then add contract-to-backend integration and live tests.

**Overall status: substantial development preview; NOT a fully tested or deployed production product.**
