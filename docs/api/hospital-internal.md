# Internal hospital API v1 (not Internet-facing)

**Trust boundary:** These are three independent simulated hospital services. Core API speaks to them over the private development network; doctors and patients must **never** call the internal routes directly. No real hospital integration has been performed.

## Service addresses

| Simulator | Port | Storage | API |
| --- | --- | --- | --- |
| Northern | 4101 | `hospital_northern` | `http://hospital-northern:4101` |
| Jaffna Teaching | 4102 | `hospital_jaffna` | `http://hospital-jaffna:4102` |
| Venus | 4103 | `hospital_venus` | `http://hospital-venus:4103` |

Each service receives only its own database URL and HMAC signing secret. The Core API receives no direct SQL access to hospital stores. External exposure must be disabled and production transport requires TLS/mTLS, service identity, rotating keys and independent tenant deployment.

## Read a record

`GET /internal/v1/records/{externalId}?version=1`

Requires `Authorization: Bearer <45-second signed internal token>` with exact issuer/audience, action `read`, `hospitalCode`, `externalRecordId`, `localPatientId`, `resourceType`, record `version`, `jti`, `iat` and `exp`. Source hospital checks every claim and stored FHIR patient reference, then atomically consumes `jti` in its separate PostgreSQL replay ledger. A second use returns 403. Response is a FHIR-shaped synthetic JSON resource only, with `Cache-Control: no-store`. Core re-verifies its private randomized commitment and authorization before releasing the result.

## Write a record

`POST /internal/v1/records`

The body is an object `{ "externalId": "...", "localPatientId": "...", "version": 1, "resourceType": "Observation", "fhir": { ... } }` and the token must have `action=write`. All identifiers and FHIR fields are checked against signed scope. Writes are idempotent by `(externalId, version)` for the same payload; inconsistent overwrites return HTTP 409. Do not retry a failed operation by inventing a new FHIR ID.

## Internal endpoint catalogue

| Method | Path | Purpose | Authentication |
| --- | --- | --- | --- |
| GET | `/health` | Simulator process health | Private network only |
| GET | `/internal/v1/records/{externalId}` | Read a scoped single FHIR resource | One-time HMAC token |
| POST | `/internal/v1/records` | Persist one scoped synthetic FHIR resource | One-time HMAC token |

These tokens are a development-only service authorization scheme, **not** end-user Keycloak bearer tokens. The current stack is not deployed or independently penetration-tested. The 256 KiB FHIR content validator is a demonstration subset, not full FHIR R4 certification.

### Readiness (v0.7)
`GET /health` = process liveness; `GET /health/ready` = checks this hospital's own PostgreSQL database; no shared cross-hospital database credentials. These are local-network-only, not a clinical data interface.
