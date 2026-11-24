# LankaHealthChain v0.5.0 – Security + interoperability + scalability hardening

**Release type:** synthetic-data development source, **not** a clinically usable or fully deployed Cardano/Midnight MVP.

## Changes made in this increment

1. Added Core migration `202611220008_request_expiration`: patient approval requests now have a 24-hour decision window; pending listing, approve/reject predicates and admin counts use the deadline.
2. Added Core migration `202611220009_stable_pagination_indexes`: stable timestamp + UUID cursor ordering for patient history and audit. Fixed missing `AccessService.timelinePage()` and `AccessService.auditPage()` implementations (a real v0.4 build blocker).
3. Corrected FHIR R4 AllergyIntolerance to use the required **`patient`** reference, not `subject`; strict server-side identity binding and minimum clinical-write validation with a 256 KiB serialized cap.
4. Added bounded asynchronous hospital fetches (max 4 in-flight) and a final post-fetch consent validity check to reject a batch if authorization changes before return.
5. Added `/api/v1/access-requests/:id/records/page`, including patient-scoped cursor checking and doctor portal Load More support. Legacy unpaged endpoint now fails clearly if its 100-record limit would truncate data.
6. Hardened Cardano public metadata validation, batch manifest all-leaf uniqueness and proof shape verification. Public-chain signing still requires real operator credentials, transaction submission and confirmation.
7. Removed shared `.env` injection from all Docker application services: each simulated hospital receives its own database URL and shared-token key only. Browser service containers receive only public Vite configuration.
8. Added executable real-PostgreSQL 4-role/12-cross-DB isolation test and integrated it into local-demo GitHub Actions CI. This check requires Docker/PostgreSQL and has not run here.
9. Replaced `tsx watch` with `ts-node/register/transpile-only` for the NestJS development servers. `tsx` does not produce the legacy `emitDecoratorMetadata` required by constructor injection; `ts-node` honors `tsconfig` for dependency injection metadata. This launcher change requires a real dependency-install/boot check.
10. Aligned Prisma schema with the new request-deadline database index so future migrations do not try to remove a manually-created index.
11. Extended offline domain/security and Compose secret-isolation tests.

## Evidence / limitations

- Node dependency-free domain + in-memory HTTP protocol tests execute in this environment; counts recorded in `v0.5-offline-test.log` (not live NestJS/Prisma tests).
- TS/TSX syntax-transpilation uses a global TypeScript compiler; this is not a full project typecheck.
- Docker Compose, PostgreSQL migrations, Keycloak browser login, Cardano Preprod signing/submission and Midnight Compact contract compilation/deployment **could not be executed in this environment**. The project npm registry lookup fails with `EAI_AGAIN` and Docker/Compact are unavailable.
- The current application consent mode is explicitly `LOCAL_DEMO_NOT_MIDNIGHT`. Production startup refuses it; without a genuine ZK verifier this remains a blocked real-world workflow.
- FHIR checking is an intentionally small demo subset, not formal HL7 R4 profile validation.
- No real patient data may be used; named hospitals are simulated and have not endorsed or connected to the project.

## Repeat the tests

```bash
node --experimental-strip-types --test tests/unit/*.test.mjs tests/integration/*.test.mjs
node scripts/qa/syntax-check.cjs
node scripts/qa/preflight.mjs
```

After setting up a disposable Docker stack and compatible dependencies, run:

```bash
node scripts/setup-local.mjs       # fresh checkout only, will not overwrite .env
docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml up -d --build
LHC_HEALTH_ATTEMPTS=60 node scripts/qa/live-smoke.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-flow.mjs
docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml run --rm --no-deps migrate-and-seed pnpm db:verify-isolation
```

**Release acceptance is blocked** until these real-stack checks and the two separate live blockchain proofs pass. Do not interpret an offline test pass or a drafted smart contract as a deployed healthcare service.
