# API v1 – Authorization matrix

| Endpoint group | Patient | Verified doctor | Network admin | Public |
|---|---:|---:|---:|---:|
| `GET /health`, `/health/ready` | ✓ | ✓ | ✓ | ✓ |
| `GET /hospitals` | ✓ | ✓ | ✓ | — |
| `POST /access-requests`, `GET /access-requests/mine` | — | ✓ | — | — |
| `GET /access-requests/{id}/records[/page]` | — | Scoped active consent only | — | — |
| `POST /records` | — | Own hospital and enrolled patient only | — | — |
| `GET /patients/me/...` (approvals, timeline, consents) | Own records only | — | — | — |
| `GET /audit/me[/page]` | Own audit only | — | — | — |
| `POST /access-requests/{id}/approve`, `/reject` | Owner only | — | — | — |
| `POST /consents/{id}/revoke` | Owner only | — | — | — |
| `GET /records/{id}/verification` | Record owner | Active matching consent | — | — |
| `GET /admin/summary` | — | — | ✓ | — |

`✓` means a valid OIDC access token with the required role, plus the listed DB/consent constraints. Role is not the sole check. Hospital API internal routes are **not** user-facing; they use one-time signed internal service tokens.

**Non-goals:** no open self-registration, broad admin access to medical records, emergency break-glass access, patient file downloads, FHIR-wide import, or true blockchain consent authorization yet.
