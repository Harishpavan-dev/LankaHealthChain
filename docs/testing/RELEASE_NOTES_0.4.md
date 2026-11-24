# LankaHealthChain v0.4.0 – engineering release notes

**Release classification:** Source-code development preview; not clinically approved, not production-ready, not a proven Cardano + Midnight dual-chain deployment.

## Additional changes since v0.2

- Hospital access-token replay now uses `UsedServiceToken` with **atomic PostgreSQL unique-key insertion**. All replicas of a hospital API share the same replay ledger. Expired rows are pruned. A DB outage fails closed.
- New *Hospital database migration 002*, plus Core database migration 006 (append-only audit trigger) and 007 (pagination and pending-anchor indexes). Seven Core migrations and two reusable Hospital migrations are committed; actual DB apply is unverified here.
- Source-hospital JSON responses are consumed using a **streaming 1 MiB cap**, including unknown-length chunked bodies, to avoid loading unbounded data into Core memory.
- All shared-package imports are checked against the workspace export map.
- Hospital registry URL is compared against an operator-pinned service URL and rejected before calling an unapproved destination. Production requires HTTPS.
- Cardano API verification now binds inclusion proof commitment to the requested indexed record; proof index is checked against on-chain metadata `count`.
- `GET /api/v1/health/ready` checks Core PostgreSQL, separate from liveness.
- `GET /api/v1/patients/me/timeline/page?limit=25&cursor=<uuid>` and `GET /api/v1/audit/me/page` supply bounded, owner-validated cursor pagination.
- Patient portal includes a Cardano verification action, explicitly distinguishing unverified/pending proof from on-chain verification.
- Midnight source draft updated with domain separation (`kernel.self().bytes`), guard assertions and a `verifyConsent` circuit proposal. `contracts/midnight/scripts/compile.sh` pins Compact 0.36.1; `midnight-proof-server:9.0.2` is an optional Compose profile. None of this constitutes an implemented Midnight backend integration.
- New `scripts/qa/preflight.mjs` reports missing local prerequisites without showing secrets.
- `scripts/qa/live-flow.mjs` is a **synthetic write/read end-to-end script** for running inside a real local stack. `lhc-test-cli` is a local-only OIDC password-flow test client. A CI workflow invokes Docker Compose, migrations, Keycloak, the API and hospital services, then runs the script.

## Verification completed in this authoring environment

- 62/62 Node unit and in-memory HTTP protocol tests passed; zero failures.
- 49 TS/TSX files passed syntax/transpilation checks. This is NOT full TypeScript typechecking.
- YAML + JSON + shell static validation passed.
- Offline 100-commitment Cardano batch verification passed at indices 13 and 99; no chain submission.
- Preflight correctly reports missing Docker, pnpm, Compact, newer Node and private .env.

## Build and real-stack integration commands (to execute on a developer machine)

```bash
node scripts/qa/preflight.mjs
node scripts/setup-local.mjs           # only if .env does not exist
docker compose --env-file .env \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml up -d --build
LHC_HEALTH_ATTEMPTS=60 node scripts/qa/live-smoke.mjs
LHC_ACCEPT_SYNTHETIC_WRITE=YES node scripts/qa/live-flow.mjs
```

When starting from an **existing** demo DB, the new `lhc-test-cli` client may not exist because realm import is one-time. Create it manually or reset **only disposable** local Keycloak/demo volumes. Never reset a real database.

## Security caveats

1. JWT/OIDC validation and healthcare role checks are present, but Keycloak browser E2E still needs execution.
2. DB-backed token replay is durable per hospital, but not a complete mTLS setup.
3. PostgreSQL append-only trigger blocks app-level accidental audit changes; a DB superuser can still change or disable it.
4. FHIR handling is still a basic envelope allowlist rather than an independently certified R4 profile validator.
5. Local-demo consent is off-chain and purposely disabled in production mode; **Midnight proof verification is not implemented**.
6. Cardano metadata anchoring/preprod registration is operator-run; offline proof checks are not live chain confirmations.
7. No PHI, patient ID, nonce or patient consent details should enter any public chain; sample data are synthetic.
8. Reliable deployment requires running PostgreSQL migrations, Docker app startup, real OIDC, browser and backend tests, Cardano transaction confirmation, Midnight contract compilation/deployment, security review and performance benchmarks.
