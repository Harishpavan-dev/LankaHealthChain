# Threat model (MVP)

**Assets:** synthetic FHIR resources, access policy, hospital identity references, per-record
nonces, audit log, service bearer tokens, OIDC access tokens. Real patient data forbidden.

**Trust boundaries:** browser to Core OIDC API, Core to hospital HTTP service, each
hospital's SQL role/database, blockchain networks (not yet connected).

| Threat | MVP mitigation | Residual work |
|---|---|---|
| Token impersonation | OIDC JWKS signature, issuer, audience, RS256 | MFA, revocation handling, assurance level |
| Unauthorized doctor | DB verifies active/verified + role | Professional provider registry integration |
| Excessive patient record exposure | Exact patient/doctor/hospital/purpose/type/expiry consent | Real Midnight verifier and policy binding |
| DB credential reuse | Unique PostgreSQL logins per hospital | Network ACL, per-service secret manager |
| Tampered report | Nonce-based SHA-256 commitment; compare read payload | Independent hospital signatures + Cardano confirmations |
| Internal API misuse | 45 second signed, site-specific scoped token | Replay cache, mTLS, asymmetric issuer trust |
| Fake hospital endpoint SSRF | Only seeded base URLs | Egress allowlisting, URL policy, facility enrollment approval |
| Revoke during data retrieval | Read current consent before release | Distributed transaction/lease semantics |
| Immutable metadata leakage | Public chain writes not yet enabled | Privacy review of all anchor contents |
| Keycloak static demo credentials | Loopback-only dev service | Remove entirely for external deployments |

The `local-demo` consent adapter has **no zero-knowledge properties**.
Do not equate a cryptographic hash with a clinically valid report. This version has
no comprehensive abuse detection, complete append-only audit controls, formal FHIR
R4 compliance, encrypted identity mapping or clinical risk assessment.
