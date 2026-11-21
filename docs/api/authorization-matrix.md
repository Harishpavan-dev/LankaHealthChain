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
| `GET /admin/summary`, `/admin/dependencies` | — | — | ✓ | — |

`✓` means a valid OIDC access token with the required role, plus the listed DB/consent constraints. Role is not the sole check. Hospital API internal routes are **not** user-facing; they use one-time signed internal service tokens.

**Non-goals:** no open self-registration, broad admin access to medical records, emergency break-glass access, patient file downloads, FHIR-wide import, or true blockchain consent authorization yet.

## v0.9.0 – additional governance roles

| Endpoint group | Hospital admin | Security auditor | Researcher | Network admin |
|---|---:|---:|---:|---:|
| `GET /hospital-admin/hospitals` | Own active hospital assignment only | — | — | — |
| `/hospital-admin/hospitals/{code}/overview` | Own hospital only | — | — | — |
| `GET/POST /hospital-admin/hospitals/{code}/doctors[/page]` | Own hospital only (enrollment defaults inactive, unverified) | — | — | — |
| `PATCH /hospital-admin/hospitals/{code}/doctors/{id}` | Only doctor employed by own hospital | — | — | — |
| `/hospital-admin/hospitals/{code}/audit/page` | Own nonclinical changes | — | — | — |
| `/security-audit/summary`, `/events/page`, `/admin-events/page` | — | Metadata only, no patient IDs or clinical records | — | — |
| `/research/me`, `/research/aggregates` | — | — | Active DB grant, synthetic mode only, cells >=10 | — |
| `POST/GET/PATCH /admin/operators`, `/admin/research-grants` | — | — | — | ✓, privileges logged |

Roles are not substitutable: an operator cannot use a `network_admin` token to obtain patient records, and a `security_auditor` cannot view doctor details or patient identities. `hospital_admin` requires both a valid Keycloak role AND an active `HospitalOperator` DB mapping.

**Synthetic demo only:** Real research requires independent authorization and ethics review. None of these routes represents a production-compliant personal-health-data workflow.
