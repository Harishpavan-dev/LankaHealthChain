# Database migrations

- CORE: `packages/database/prisma/migrations/202611220001_init/migration.sql`
- CORE constraints: `packages/database/prisma/migrations/202611220002_constraints/migration.sql`
- CORE patient mapping and integrity hardening: `202611220003_hardening/migration.sql`
- CORE randomized commitment unique lookup: `202611220004_anchor_lookup/migration.sql`
- CORE idempotent batch preparation: `202611220005_outbox_idempotency/migration.sql`
- CORE audit append-only trigger: `202611220006_append_only_audit/migration.sql`
- CORE query indexes: `202611220007_query_indexes/migration.sql`
- CORE 24-hour access-request deadline: `202611220008_request_expiration/migration.sql`
- CORE stable cursor pagination: `202611220009_stable_pagination_indexes/migration.sql`
- CORE doctor-scoped request idempotency: `202611220010_access_request_idempotency/migration.sql`
- EACH hospital: `packages/hospital-database/prisma/migrations/202611220001_init/migration.sql`
- EACH hospital: `packages/hospital-database/prisma/migrations/202611220002_durable_replay/migration.sql`

Migrations are committed versioned SQL, never schema auto-sync on deployment.
Prisma migration history is scoped to each database; all three hospital databases
run the same hospital schema but have separate `_prisma_migrations` tables.

To apply after PostgreSQL is initialized and `.env` variables loaded:

```bash
set -a; . ./.env; set +a
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Use **forward-only expand/contract** migrations for breaking schema changes:
add nullable column, deploy compatible readers/writers, backfill, then constrain/remove
in a later release. Do not edit an already deployed migration; create a new one.
Run `prisma migrate status` with the matching config in CI. Back up before rollout.

`202611220002_constraints` is handwritten SQL with CHECK clauses, requiring manual
review when altering related Prisma fields. A schema drift check must be performed
once dependencies and a disposable PostgreSQL instance are available.


## v0.5: mandatory migration verification

The repository contains **9 Core** migrations and **2 Hospital** migrations.
Hospital migrations run independently on each of the three Hospital databases, each with its own `_prisma_migrations` history.

After starting the local Compose stack, verify the PostgreSQL credentials really enforce isolation:

```bash
docker compose --env-file .env -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.app.yml \
  run --rm --no-deps migrate-and-seed pnpm db:verify-isolation
```

Expected: 4 own-database connections succeed and 12 cross-database connections are denied. **This check was not executed in the offline authoring environment.**

## v0.6 deployment condition

This release contains **10 Core migrations** and **2 Hospital migrations**, each hospital migration executed independently against Northern, Jaffna and Venus. Apply `202611220010_access_request_idempotency` before running the updated API; the database uniqueness guarantee is necessary for concurrent request deduplication. In particular, do not treat static migration checks as a replacement for real `prisma migrate deploy` on an isolated PostgreSQL instance.
