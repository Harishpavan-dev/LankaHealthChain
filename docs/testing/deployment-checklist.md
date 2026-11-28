# Deployment acceptance checklist

- [x] Project dependencies install and all packages compile on the supported toolchain
- [x] Four PostgreSQL databases bootstrap and `pnpm db:verify-isolation` verifies 4 owner connections and 12 cross-database denials
- [x] Core and hospital Prisma migrations apply successfully to fresh PostgreSQL databases
- [x] Seeded 101 fictional patients and 504 synthetic resources across the three hospitals
- [x] Keycloak demo patient, doctor, and admin access tokens verify against JWKS
- [x] All six workspaces sign in through the standalone frontend image and make authenticated API calls
- [x] Network admin `GET /api/v1/admin/dependencies` reports all 3 hospital DB readiness checks. The patient receives 403, and the response omits internal URLs.
- [ ] `GET /api/v1/health` returns 200; Swagger docs are available only in development
- [ ] Wrong doctor, unknown patient, wrong hospital and invalid resource creation fail
- [ ] New Observation created in Venus hospital appears in Arun timeline
- [x] Doctor read before consent is rejected and authorized records return after approval
- [ ] Pending access request older than 24 hours cannot be approved
- [ ] Doctor cursor pagination returns distinct records and rejects cross-patient cursors
- [ ] FHIR R4 AllergyIntolerance uses `patient.reference`; oversized/invalid writes fail
- [ ] Frontend Docker containers receive no database credentials or internal signing keys
- [ ] Alter source FHIR payload; integrity mismatch fails and is logged
- [x] Revocation blocks subsequent doctor reads
- [x] Compiled API refuses `CONSENT_MODE=local-demo` in production
- [ ] Preprod signed batch transaction is included and metadata verified; DB anchors updated
- [ ] Midnight Ledger 9 contract compiles and is proven/deployed with wallet and local prover
- [ ] Testnet proof is bound to scoped consent and current revocation state; no bypass of backend RBAC
- [ ] Run bounded k6 smoke, measure P50/P95, test failover and replay-cache behavior under replicas
- [ ] Independent security/privacy review and clinical/authority approval BEFORE any real patient data

Checked items describe verification on the isolated synthetic stack. See the [release verification report](RELEASE_VERIFICATION_0.13.md).
