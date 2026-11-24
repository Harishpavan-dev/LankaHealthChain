# Real environment acceptance checklist (NOT YET EXECUTED HERE)

- [ ] Docker Engine + Node >=22.22.3; project dependencies install and all packages compile
- [ ] Four PostgreSQL databases bootstrap; each role can connect only to its own DB
- [ ] Core and hospital Prisma migrations applied, `_prisma_migrations` has matching histories
- [ ] Synthetic seeds loaded; Arun plus 100 fictional patients (101 total), 504 synthetic resources spread over three hospitals
- [ ] Keycloak demo patient/doctor/admin access tokens verify against JWKS
- [ ] `GET /api/v1/health` returns 200; Swagger docs are available only in development
- [ ] Wrong doctor, unknown patient, wrong hospital and invalid resource creation fail
- [ ] New Observation created in Venus hospital appears in Arun timeline
- [ ] Doctor read before consent rejected; after approval the authorized records return
- [ ] Alter source FHIR payload; integrity mismatch fails and is logged
- [ ] Revoke; subsequent doctor read is denied
- [ ] Demo application refuses `CONSENT_MODE=local-demo` in production
- [ ] Preprod signed batch transaction is included and metadata verified; DB anchors updated
- [ ] Midnight Ledger 9 contract compiles and is proven/deployed with wallet and local prover
- [ ] Testnet proof is bound to scoped consent and current revocation state; no bypass of backend RBAC
- [ ] Run bounded k6 smoke, measure P50/P95, test failover and replay-cache behavior under replicas
- [ ] Independent security/privacy review and clinical/authority approval BEFORE any real patient data

A unit test or protocol double does **not** satisfy any unexecuted real-deployment check.
