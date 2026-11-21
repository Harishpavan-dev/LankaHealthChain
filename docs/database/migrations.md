# Database migrations — v0.11.0

This is a **synthetic-only four-database demonstration**. All schema changes are versioned forward-only SQL. We have **15 Core migrations** and **3 reusable Hospital migrations**, run against each hospital database independently. Each database has its own `_prisma_migrations` history; do not combine them or give the Core API direct SQL access to hospital stores.

## Core migration history

| Version | Purpose |
|---|---|
| `202611220001_init` | Hospital, patient, doctor, record-index and consent foundation |
| `202611220002_constraints` | Initial CHECK and uniqueness constraints |
| `202611220003_hardening` | Identity mapping and provenance hardening |
| `202611220004_anchor_lookup` | Randomized commitment lookup |
| `202611220005_outbox_idempotency` | Durable outbox and deduplicated jobs |
| `202611220006_append_only_audit` | Audit append-only trigger |
| `202611220007_query_indexes` | Record/request query indexes |
| `202611220008_request_expiration` | Consent approval request deadline |
| `202611220009_stable_pagination_indexes` | Stable owner-scoped cursor pagination |
| `202611220010_access_request_idempotency` | Doctor + client key uniqueness |
| `202611220011_history_pagination_indexes` | History keyset query indexes |
| `202611220012_clinical_locator_constraints` | Synthetic record locator validation |
| `202611220013_anchor_batch_lookup` | Prepared anchor batch recovery indexes |
| `202611220014_institutional_governance` | Scoped operators, audit, synthetic research grants |
| `202611220015_background_worker_monitoring` | Scheduled retries, dead-letter tracking, worker heartbeat |

## Hospital migration history

| Version | Purpose |
|---|---|
| `202611220001_init` | Local clinical FHIR subset table |
| `202611220002_durable_replay` | Shared service-token nonce replay ledger |
| `202611220003_clinical_record_constraints` | Record envelope and id validation |

## Apply to a disposable local synthetic stack

```bash
set -a; . ./.env; set +a
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:verify-isolation
```

Or use the Docker Compose `migrate-and-seed` initialization job. The four DB owners and bootstrap admin must remain isolated. Verify all four histories and run live-stack E2E before claiming DB completion. Do not use `prisma db push` to bypass migrations, rewrite already-applied migration files, or delete existing PostgreSQL volumes without a backup.

**Verification status:** Migration source structure was statically checked, but `prisma migrate deploy` on real PostgreSQL has **not been run in this authoring environment**. Performance and schema drift need live checks. In production, perform staged expand/contract migrations and independent database backups.
