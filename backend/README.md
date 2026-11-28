# Backend — Services and Data Packages

## Applications

| Service | Folder | Responsibility |
| --- | --- | --- |
| Core API | `apps/api` | NestJS REST `/api/v1`, OIDC authorization, consent and hospital access |
| Hospital simulator | `apps/hospital-simulator` | Reusable FHIR-like synthetic service deployed as Northern/Jaffna/Venus |
| Anchor preparation worker | `apps/worker` | Background PostgreSQL-outbox processing and offline Merkle batch generation |

## Shared backend packages

- `packages/database/`: Core Prisma schema, migrations and seed data.
- `packages/hospital-database/`: Hospital Prisma schema and reusable per-hospital migrations.
- `packages/shared/`: Validated domain utilities, integrity hashing, permissions and FHIR helpers.

Keep server-side secrets out of the frontend and source control. Hospital APIs run with unique database credentials and scoped service-token secrets. The worker does not require Cardano signing keys.

The supported full local run is documented in [Installation Guide](../docs/installation-guide.md). Root workspace developer commands include:

```shell
pnpm dev:api
pnpm dev:hospital
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm --filter @lhc/worker... build
pnpm anchors:prepare
```

Native commands require the corresponding exported environment variables, running databases and installed workspace dependencies. Prefer the supplied local Docker Compose stack for reproducible multi-service startup.

**Not yet live:** Midnight zero-knowledge proof enforcement and a confirmed Cardano Preprod transaction. Offline Merkle commitments and `local-demo` consent must not be described as live blockchain-backed clinical authorization.
