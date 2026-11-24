> v0.5 source verification is summarized in [RELEASE_NOTES_0.5.md](RELEASE_NOTES_0.5.md). The older counts below are historical.

> Latest source-release update: see **`RELEASE_NOTES_0.5.md`**. Historical check counts below refer to v0.2. New files and tests have been added but PostgreSQL, Docker and blockchain live integration are still unverified.

# Test status and acceptance criteria

**Environment limitation:** This authoring container has Node 22.16.0 and can run
Node's experimental TS type stripping; it has **no Docker**, **no PostgreSQL**,
**no installed project npm dependencies**, and its npm registry lookup failed (EAI_AGAIN).
Prisma 7's documented Node requirement is >=22.22.3.

| Test area | Status | Evidence |
| --- | --- | --- |
| Consent scope/expiry/revocation policy | Unit-tested | `tests/unit/authorization.test.mjs` |
| Random nonce commitments, tamper detection | Unit-tested | `tests/unit/crypto.test.mjs` |
| Hospital scoped service token signature/expiry | Unit-tested | `tests/unit/internal-token.test.mjs` |
| FHIR envelope basic allowlist | Unit-tested | `tests/unit/fhir.test.mjs` |
| Database schema/migration static consistency | Static unit-tested | `tests/unit/migrations.test.mjs` |
| Merkle batch proofs + public metadata | Unit-tested | `tests/unit/merkle.test.mjs` |
| Blockfrost metadata verifier | Unit-tested with mocked network | `tests/unit/cardano-verification.test.mjs` |
| Hospital token replay and FHIR subject guards | Unit-tested | `tests/unit/replay.test.mjs` and `fhir-binding.test.mjs` |
| Actual HTTP protocol on 3 synthetic hospital doubles | 2 tests passed | `tests/integration/*.test.mjs`; no Nest/Prisma involved |
| PostgreSQL migrations actually applied | NOT RUN | No PostgreSQL/Docker here |
| Prisma generated client + NestJS typecheck | NOT RUN | npm registry unavailable |
| Browser E2E and auth round-trip | NOT RUN | Requires Keycloak, DB, dependencies |
| Cardano Preprod anchor transaction | NOT EXECUTED | Batch worker, CLI signing/submission, on-chain metadata verification and DB-import source supplied; no wallet/node/API credentials here |
| Midnight proof/Compact contract | SOURCE DRAFT ONLY | Ledger 9 `.compact` draft is UNCOMPILED/UNDEPLOYED; no wallet/client verifier yet |
| Performance testing | NOT RUN | Needs validated local deployment |

**Passing unit tests do not establish healthcare readiness.**

After setup, run disposable integration scenarios and preserve logs:
1. Apply migrations and seed each of four databases.
2. Verify doctor cannot read prior to consent.
3. Approve once; concurrent duplicate approval fails safely.
4. Read valid synthetic records; verify nonce commitment matches.
5. Tamper record; verify denial and audit.
6. Revoke; verify all new reads blocked.
7. Wrong patient, doctor, hospital, purpose and resource type fail.
8. Rotate and verify service tokens; check internal network isolation.
9. Only then attempt testnet proof and anchor integrations.

**Observed checks in this workspace:** 40 unit tests PASS, 2 isolated HTTP protocol tests PASS; 45 TS/TSX files syntax-transpiled without errors; two Docker Compose YAML files parsed; 100-record Cardano offline batch/proof round-trip passed. Neither proves complete runtime compatibility with NestJS, Prisma, Keycloak, or public blockchain networks.
