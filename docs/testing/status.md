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
| PostgreSQL migrations actually applied | NOT RUN | No PostgreSQL/Docker here |
| Prisma generated client + NestJS typecheck | NOT RUN | npm registry unavailable |
| Browser E2E and auth round-trip | NOT RUN | Requires Keycloak, DB, dependencies |
| Cardano Preprod anchor transaction | NOT IMPLEMENTED | No wallet or network integration |
| Midnight proof/Compact contract | NOT IMPLEMENTED | No contract or network integration |
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
