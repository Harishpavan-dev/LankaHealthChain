# HTTP API v1 – Developer documentation

**This documentation covers all currently implemented endpoints in the synthetic-data-only LankaHealthChain prototype.** It is not a production FHIR R4 conformance statement. The machine-readable **canonical API contract** is [`openapi.json`](openapi.json), with [`openapi.yaml`](openapi.yaml) as a readable copy.

## Base URL, health and Swagger

- Demo base URL: `http://localhost:3000/api/v1` (loopback-only)
- Swagger UI (development): `http://localhost:3000/api/docs` (serves this version-controlled contract, not a separately drifting auto-generated description)
- Liveness: `GET /health` (process only; not DB availability)
- Readiness: `GET /health/ready` (Core PostgreSQL query; 503 if unavailable)
- Versioning: URI version `/api/v1`; future breaking changes use `/api/v2`.
- All endpoints except `/health` and `/health/ready` require `Authorization: Bearer <OIDC access token>`.

## Authentication / authorization

- Local Keycloak realm: `lankahealthchain`; audience: `lhc-api`; signature verified with Keycloak JWKS.
- Role enforcement: `patient`, `doctor` or `network_admin`; verified doctor status is checked in Core PostgreSQL.
- Doctor accesses require patient-approved *local-demo* consent scoped to doctor, hospital, patient, purpose, resource type and expiry.
- `LOCAL_DEMO_NOT_MIDNIGHT` is **not** a zero-knowledge proof. Real Midnight verification has not been integrated.
- Patient identifiers in request paths, returned on-chain metadata and logs must never reveal actual identities. Use only synthetic data here.

## API conventions

- `Content-Type: application/json` for POST bodies. Optional `Idempotency-Key: <8-128 char key>` on `POST /access-requests`, unique for each doctor's intended request; a retry with the same key and same body returns the same request. A changed body with that key returns 409.
- 201: successful POST; 200: successful GET; 400: invalid inputs; 401: unauthenticated; 403: unauthorized/consent; 404: not found; 409: state/integrity conflict; 429: rate limit; 503: unavailable dependency.
- Every Core response has a fresh `X-Request-ID` header; error bodies include `requestId`.
- API responses include `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- List compatibility endpoints without `/page` return at most 100 entries; `/page` endpoints return `{ "items": [...], "nextCursor": null | "uuid" }` with `limit` default 25, max 100. Cursor must belong to the authorized patient.
- HTTP errors never expose SQL credentials or stack traces.
- Use `POST /records` with the **same explicit FHIR resource `id` and content** when retrying a timed-out create. A conflicting retry is rejected; a missing Core index after a Hospital success requires operator reconciliation.

## Main workflow

1. Verified doctor creates `POST /access-requests` (pending, 24-hour approval deadline).
2. Patient reads `GET /patients/me/access-requests` and approves `POST /access-requests/{id}/approve`.
3. Doctor fetches `GET /access-requests/{id}/records/page?limit=25`; Core verifies current consent, retrieves FHIR data from the owning Hospital API and checks the saved local commitment.
4. Patient revokes `POST /consents/{id}/revoke`. Subsequent doctor access is denied; already downloaded files cannot be recalled.
5. Patient verifies `GET /records/{id}/verification`. **A local matching hash does not establish a Cardano transaction; onchainVerified remains false until testnet evidence is confirmed.**

Read the [authorization matrix](authorization-matrix.md), [copyable request examples](examples.md), [architecture overview](../architecture/system-design.md) and [internal hospital API](hospital-internal.md) and [migrations guide](../database/migrations.md).

## Scope and guarantees

The three hospitals are simulated integrations, not real healthcare institution deployments. The minimal FHIR subset is not a certified validator. Do not upload real medical data, do not expose the Docker demo publicly, and do not treat this implementation as clinically validated.

Run `node scripts/qa/verify-openapi.mjs` to check every implemented NestJS endpoint has a matching operation and that OpenAPI references and security requirements are valid. This is **static contract QA**, not a live HTTP test.

Swagger UI development route `/api/docs` now serves the version-controlled `openapi.json`. It is not enabled for production mode.
