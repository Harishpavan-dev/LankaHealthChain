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
| GET | `/access-requests/{id}/records` | Verified doctor + active consent | Authorized FHIR response |
| GET | `/patients/me/access-requests` | Patient | Pending requests |
| POST | `/access-requests/{id}/approve` | Patient | Local-demo consent grant; **not Midnight** |
| POST | `/access-requests/{id}/reject` | Patient | Reject pending |
| POST | `/consents/{id}/revoke` | Patient | Revoke all future access |
| GET | `/patients/me/consents` | Patient | Own approvals/revocations |
| GET | `/patients/me/timeline` | Patient | Pseudonymous index (no raw clinical payload) |
| GET | `/audit/me` | Patient | Own access history |
| GET | `/admin/summary` | Network admin | Aggregate counts only; no clinical payloads |

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

**Intentional nonfeatures:** no open registration, no real patient import, no emergency bypass, no research exports, no automated public chain submission, no full FHIR profile validation. Common protections are rate limits, DTO reject-unknown-field behavior, no-store API headers, signed short-lived internal tokens and RBAC/ABAC scope checks. API responses with many records are capped at 100 in this demo; production pagination is pending.

### v0.4 pagination and verification

- `GET /api/v1/patients/me/timeline/page?limit=25&cursor=<uuid>` – requires patient token; returns `{items,nextCursor}` with a maximum page size of 100. `cursor` must belong to that patient.
- `GET /api/v1/audit/me/page?limit=25&cursor=<uuid>` – patient-scoped cursor pagination for audit events.
- `GET /api/v1/health/ready` – Core database readiness; HTTP 503 if DB not ready.
- `GET /api/v1/records/{id}/verification` – patient owner or doctor with active scoped consent; checks Cardano metadata proof only if a confirmed transaction and Blockfrost Preprod API key are configured. Otherwise explicitly unverified.

**Never interpret `LOCAL_COMMITMENT_ONLY` or `LOCAL_DEMO_NOT_MIDNIGHT` as completed public-blockchain proofs.**
