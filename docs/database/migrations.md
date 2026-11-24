# Database migrations

- CORE: `packages/database/prisma/migrations/202611220001_init/migration.sql`
- CORE constraints: `packages/database/prisma/migrations/202611220002_constraints/migration.sql`
- CORE patient mapping and integrity hardening: `202611220003_hardening/migration.sql`
- CORE randomized commitment unique lookup: `202611220004_anchor_lookup/migration.sql`
- CORE idempotent batch preparation: `202611220005_outbox_idempotency/migration.sql`
- EACH hospital: `packages/hospital-database/prisma/migrations/202611220001_init/migration.sql`

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
