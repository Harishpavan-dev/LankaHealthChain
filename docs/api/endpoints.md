# HTTP API v1 – Implementation inventory

**Base:** `http://localhost:3000/api/v1` · **Auth:** `Authorization: Bearer <OIDC access token>`. Swagger in development: `/api/docs`.

| Verb | Endpoint | Required identity | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness (not DB readiness) |
| GET | `/hospitals` | Authenticated | Active hospital directory |
| POST | `/records` | Verified doctor | Create synthetic FHIR resource in doctor's hospital |
| GET | `/records/{id}/verification` | Owner patient or scoped doctor | Read status and optional Cardano Preprod confirmation |
| POST | `/access-requests` | Verified doctor | Request specified patient resources |
| GET | `/access-requests/mine` | Verified doctor | Own requests |
| GET | `/access-requests/{id}/records` | Verified doctor + active consent | Authorized FHIR response up to 100 records (explicit error if more) |
| GET | `/access-requests/{id}/records/page?limit=25&cursor={uuid}` | Verified doctor + active consent | Bounded, patient-scoped FHIR response with `items` and `nextCursor` |
| GET | `/patients/me/access-requests` | Patient | Pending requests |
| POST | `/access-requests/{id}/approve` | Patient | Local-demo consent grant; **not Midnight** |
| POST | `/access-requests/{id}/reject` | Patient | Reject pending |
| POST | `/consents/{id}/revoke` | Patient | Revoke all future access |
| GET | `/patients/me/consents` | Patient | Own approvals/revocations |
| GET | `/patients/me/timeline` | Patient | Pseudonymous index (no raw clinical payload) |
| GET | `/audit/me` | Patient | Own access history |
| GET | `/admin/summary` | Network admin | Aggregate counts only; no clinical payloads |
| GET | `/admin/dependencies` | Network admin | Check readiness of the three isolated hospital APIs, with no internal URLs or clinical payloads |

Demo `POST /records` body:

```json
{
  "patientId": "b1111111-1111-4111-8111-111111111111",
  "resource": {
    "resourceType": "Observation",
    "status": "final",
    "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6"}]},
    "valueQuantity": {"value": 120, "unit": "mmHg"}
  }
}
```

The server adds the source-hospital-local `Patient` reference and a unique resource id if absent. `GET /records/{id}/verification` reports `LOCAL_COMMITMENT_ONLY` until a separately confirmed public anchor has been imported. An arbitrary transaction hash is not verification evidence.

**Intentional nonfeatures:** no open registration, no real patient import, no emergency bypass, no research exports, no automated public chain submission, no full FHIR profile validation. Common protections are rate limits, DTO reject-unknown-field behavior, no-store API headers, signed short-lived internal tokens and RBAC/ABAC scope checks. The unpaged route rejects responses exceeding 100 records; the `/records/page` route uses bounded cursor pagination. Do not assume a missing page means missing clinical history.

### v0.4 pagination and verification

- `GET /api/v1/patients/me/timeline/page?limit=25&cursor=<uuid>` – requires patient token; returns `{items,nextCursor}` with a maximum page size of 100. `cursor` must belong to that patient.
- `GET /api/v1/audit/me/page?limit=25&cursor=<uuid>` – patient-scoped cursor pagination for audit events.
- `GET /api/v1/health/ready` – Core database readiness; HTTP 503 if DB not ready.
- `GET /api/v1/records/{id}/verification` – patient owner or doctor with active scoped consent; checks Cardano metadata proof only if a confirmed transaction and Blockfrost Preprod API key are configured. Otherwise explicitly unverified.

**Never interpret `LOCAL_COMMITMENT_ONLY` or `LOCAL_DEMO_NOT_MIDNIGHT` as completed public-blockchain proofs.**


### v0.5 consent and FHIR notes

Pending consent requests become unapprovable **24 hours** after creation; use `decisionDeadlineAt` in the returned request payload. Approved consent validity is separately constrained by `requestedDurationMinutes` (1 to 1440 minutes).

FHIR R4 `AllergyIntolerance` patient references use **`patient.reference`**, while `Observation`, `DiagnosticReport`, `MedicationRequest` and `Condition` use `subject.reference`. The API binds the hospital-local identity itself and does not trust caller-supplied patient references. New clinical records are subject to a **256 KiB serialized payload cap** and a minimal synthetic-content validator; this is not formal FHIR conformance.

All access requests require a verified doctor and every read must match the patient, doctor, requesting hospital, purpose, record type, current consent, and fresh source-hospital commitment.


## v0.9.0 Institutional governance API operations

Full typed contracts, errors, security schemes and pagination parameters are maintained in [`openapi.yaml`](openapi.yaml).

| Method | URL | Role / Scope |
|---|---|---|
| GET | `/hospital-admin/hospitals` | hospital_admin; active DB membership |
| GET | `/hospital-admin/hospitals/{code}/overview` | assigned hospital only |
| GET | `/hospital-admin/hospitals/{code}/doctors/page` | assigned hospital only |
| POST | `/hospital-admin/hospitals/{code}/doctors` | assigned hospital; creates inactive/unverified clinician |
| PATCH | `/hospital-admin/hospitals/{code}/doctors/{id}` | same hospital clinician; audit logged |
| GET | `/hospital-admin/hospitals/{code}/audit/page` | own hospital, nonclinical events |
| GET | `/security-audit/summary` | security_auditor; aggregate action/outcome |
| GET | `/security-audit/events/page` | security_auditor; redacted access metadata |
| GET | `/security-audit/admin-events/page` | security_auditor; redacted administration metadata |
| GET | `/research/me` | researcher role + active DB grant + synthetic-only |
| GET | `/research/aggregates` | researcher role + grant; groups >=10 only |
| GET, POST | `/admin/operators` | network_admin; role enrollment is external to Keycloak |
| PATCH | `/admin/operators/{id}/status` | network_admin; revoke/restore |
| GET, POST | `/admin/research-grants` | network_admin; synthetic-only |
| PATCH | `/admin/research-grants/{id}/status` | network_admin; revoke/restore |

These routes do **not** provide clinical data to administrators, auditors or researchers.
