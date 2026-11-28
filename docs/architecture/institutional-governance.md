# Institutional governance – v0.9.0 (synthetic-data demo)

This document describes the implemented source interfaces, **not a production clinical deployment**.

## Separation of duties

| Role | UI | API | Effective authority |
|---|---|---|---|
| Patient | /patient | `/api/v1/patients/me/*`, approve/revoke | Own synthetic records and consents |
| Verified Doctor | /doctor | `/api/v1/access-requests`, `/records` | Own hospital records, cross-hospital reads with active scoped patient consent |
| Network Administrator | /admin | `/api/v1/admin/*` | Manage enrolled hospital operator assignments and synthetic research grants, view nonclinical operational metrics |
| Hospital Administrator | /hospital-admin | `/api/v1/hospital-admin/*` | Only assigned active hospital; enroll inactive clinicians; verify/activate its registered clinicians, own administrative audit |
| Security Auditor | /auditor | `/api/v1/security-audit/*` | Read-only de-identified access and administrative audit events, no patient IDs or FHIR payloads |
| Researcher | /researcher | `/api/v1/research/*` | DB-approved, not-expired synthetic grant; aggregate resource counts with cell sizes >= 10 only |

Research access is **disabled in production** until a legally and ethically approved governance design exists. `RESEARCH_MODE=synthetic-demo` is intentionally not available when `NODE_ENV=production`.

## Two-factor server-side scope

1. `JwtGuard` verifies the OIDC token issuer, signature, audience and RS256 algorithm. Role is read from `realm_access.roles`.
2. `hospital_admin` also requires an active `HospitalOperator` mapping in Core PostgreSQL (user subject + actual enrolled hospital UUID). Browser-supplied hospital code is never trusted as an authority. Doctors cannot be changed outside the mapped hospital.
3. `researcher` also requires an active `ResearchGrant` (subject, approved purpose, expiry) and synthetic demo environment.
4. `security_auditor` responses explicitly select safe audit fields. `AuditEvent.patientId`, `AuditEvent.actorSub`, record identifiers and free-text metadata are never returned.
5. `network_admin` manages assignments but cannot read synthetic clinical resources based on that role alone.
6. Hospital FHIR reads require a verified doctor and scoped patient consent and hospital internal service tokens.

Network administrator assignment cannot itself grant an OIDC realm role. Keycloak enrollment is a **separate privileged operator task**. A person needs both the appropriate realm role and the relevant DB mapping/grant.

## Audit data protection

- `AdministrativeAuditEvent` records nonclinical privilege changes within database transactions. The SQL migration adds an immutable trigger to reject UPDATE/DELETE.
- Institution logs are scoped to the hospital; auditor event listings remove identities, clinical payloads and arbitrary metadata.
- Central clinical access `AuditEvent` remains the separate append-only log introduced in v0.4.
- **Limitations:** the demo uses static local Keycloak accounts and no enterprise SIEM, HSM, security alerting, identity proofing or external compliance audit. Database owner/superuser permissions still require independent hardening in production.

## Synthetic research privacy

`GET /api/v1/research/aggregates` returns **resource reference counts**, not diseases, patient counts, prevalence, diagnoses, or research findings. The API does not accept grouping/filtering inputs that could enable differencing. Any cell smaller than 10 is **omitted**, not reported as a small count. The design is demonstration-only; institutional ethics approval, disclosure risk review and data processing agreement are prerequisites for real research.

## Workflows

- Keycloak grants `hospital_admin` role -> Network Admin enrolls an `HospitalOperator` for a hospital -> Hospital Admin lists only own clinicians -> Doctor activation/verification changes are audited -> revoked operator's next request is rejected.
- Keycloak grants `researcher` role -> Network Admin approves limited synthetic grant -> Researcher sees only eligible aggregate groups -> grant revocation blocks subsequent requests without waiting for JWT expiry.
- Auditor can verify the event outcome but not inspect individual patient or medical records.

## Mandatory production blockers

- [ ] Real PostgreSQL migration execution and rollback rehearsals
- [ ] Full NestJS and frontend builds on compatible Node version
- [ ] Keycloak authentication and six-role E2E in running containers
- [ ] External security and clinical governance review, role provisioning and MFA
- [ ] Cardano Preprod submission and confirmation, Midnight Compact compilation and ZK proof verification
- [ ] Real-hospital interface agreements, privacy impact assessment and regulatory approval

