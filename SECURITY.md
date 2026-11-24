# Security Policy

This repository is an educational hackathon prototype, **not** a medical device,
certified healthcare system or approved clinical deployment.

Do not submit real patient records. Do not expose the local Keycloak demo users or
hospital endpoints publicly. Disclose vulnerabilities privately to maintainers through
a secure channel defined when the repository is published.

Threat boundaries: bearer JWTs validated against OIDC JWKS; doctors are verified
against central registry; explicit patient consent is required; hospital APIs
check internal scoped tokens; hashes prove **change detection**, not clinical accuracy.
`CONSENT_MODE=local-demo` uses local database authorization only and is not a ZK proof.
Cardano transaction and Midnight proof services are not connected in this increment.
