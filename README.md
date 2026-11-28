# LankaHealthChain v0.13.0

**Next.js + NestJS Healthcare Interoperability Application — Frontend / Backend Repository Layout**

> This release supports synthetic records. See the [verification report](docs/testing/RELEASE_VERIFICATION_0.13.md) for the checks completed and the [acceptance checklist](docs/testing/deployment-checklist.md) for the remaining clinical deployment requirements.

## Start here

1. Read the **[English Installation Guide](docs/installation-guide.md)**.
2. Review the **[Project Structure](docs/project-structure.md)** to understand folder ownership.
3. Run the local Docker demo with unique generated credentials (commands below).
4. See the [API documentation](docs/api/README.md) and [current verification status](docs/testing/RELEASE_VERIFICATION_0.13.md).

## Easy-to-understand project layout

```text
LankaHealthChain/
├── frontend/                   # One Next.js App Router application
│   ├── src/app/                # Six role routes + landing page
│   ├── src/portal-pages/       # Migrated clinical dashboards
│   └── src/lib/auth.ts         # Keycloak PKCE + authenticated API client
├── backend/
│   ├── apps/api/               # NestJS API (/api/v1)
│   ├── apps/hospital-simulator/# Three isolated hospital deployments
│   ├── apps/worker/            # Cardano Merkle batch preparation
│   └── packages/               # Prisma databases + shared domain code
├── contracts/                  # Cardano tools + Midnight draft contract
├── infrastructure/             # Local Docker, Keycloak, PostgreSQL
├── docs/                       # English technical documentation
├── scripts/                    # Setup, migrations, quality checks
├── tests/                      # Unit, protocol, synthetic integration
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

Frontend and backend are separate **folders within one monorepo**, not separate repositories. Shared pnpm workspace configuration remains at the root, allowing one dependency graph and consistent CI checks.

### Portals

| Role workspace | Next.js source | URL path |
| --- | --- | --- |
| Patient | `frontend/src/app/patient` | `/patient` |
| Doctor | `frontend/src/app/doctor` | `/doctor` |
| Network Admin | `frontend/src/app/admin` | `/admin` |
| Hospital Admin | `frontend/src/app/hospital-admin` | `/hospital-admin` |
| Security Auditor | `frontend/src/app/auditor` | `/auditor` |
| Researcher | `frontend/src/app/researcher` | `/researcher` |

### Backend services

| Component | Folder | Purpose |
| --- | --- | --- |
| Core API | `backend/apps/api` | NestJS, OIDC/RBAC, records, scoped consent |
| Hospital simulator | `backend/apps/hospital-simulator` | One reusable API, three separate database deployments |
| Background worker | `backend/apps/worker` | PostgreSQL outbox, offline Merkle batch/retry/monitoring |
| Core database package | `backend/packages/database` | Core Prisma schema, migrations and seed |
| Hospital database package | `backend/packages/hospital-database` | Hospital Prisma schema and migrations |
| Server shared utilities | `backend/packages/shared` | Validation, cryptography, FHIR, access policy |

The core backend follows a **modular monolith architecture**. Hospital instances and the async preparation worker are separate services where isolation is useful; additional microservices are intentionally deferred until justified by actual performance and deployment needs.

## Quick start — local development only

Prerequisites: **Node.js 22.22.3+ (Node 22), Docker with Compose, Internet access** for first build. Docker Desktop with WSL2 backend is recommended on Windows.

```shell
# Run these commands at the repository root.
node scripts/setup-local.mjs

docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml up -d --build

docker compose --env-file .env -f infrastructure/docker/compose.yml -f infrastructure/docker/compose.app.yml ps
```

The setup script creates **unique private local passwords** in `.env` and a **private generated Keycloak import** under `private/`. Neither should be pushed to GitHub. Default entry points are `http://localhost:3001/patient` (Patient), `/doctor` (Doctor), `/admin` (Admin), and `http://localhost:3000/api/docs` (development-only API docs). See the installation guide for the six routes, role usernames, migration checks, troubleshooting and PowerShell commands.

The Docker Compose setup uses development-only services (`Keycloak start-dev`, Next.js dev server) and localhost-bound ports. **Do not deploy this Compose configuration directly to the Internet.**

## Documentation

- [Installation and Local Demo Guide](docs/installation-guide.md) — Requirements, setup, six logins, Docker, tests and troubleshooting.
- [Project Structure](docs/project-structure.md) — Responsibilities of every top-level folder and workspace package.
- [Frontend README](frontend/README.md) — One Next.js app, six routes and public browser configuration.
- [Backend README](backend/README.md) — API, hospital simulators and preparation worker.
- [OpenAPI Contract](docs/api/openapi.yaml) — API `/api/v1`, 40 source-documented operations.
- [API Usage](docs/api/README.md) — Authentication, authorization matrix and Postman.
- [Database Migration Guide](docs/database/migrations.md) — Core and hospital schema histories.
- [Background Processing Architecture](docs/architecture/background-processing.md) — Outbox, locking and retry lifecycle.
- [Deployment Acceptance Checklist](docs/testing/deployment-checklist.md) — Live tests required before deployment claims.
- [v0.13.0 Verification Report](docs/testing/RELEASE_VERIFICATION_0.13.md) — Checks performed and known limitations.

## Source-level quality checks

```shell
node scripts/qa/config-audit.mjs
node --experimental-strip-types --test tests/unit/*.test.mjs
node --experimental-strip-types --test tests/integration/*.test.mjs
node scripts/qa/verify-openapi.mjs
```

Full installation/build checks (requires matching Node and pnpm versions and online dependencies):

```shell
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install --frozen-lockfile
# Export the four required NEXT_PUBLIC_* build variables from the installation guide.
pnpm build
pnpm check:syntax
```

Follow the [installation guide](docs/installation-guide.md) to run the synthetic stack and test record writes.

## Privacy and development boundaries

- **No real patient information** is included or permitted in this development environment.
- Medical records remain in separate hospital databases and are not written to the public chain.
- Backend authorization is rechecked before accessing scoped records; synthetic `local-demo` consent is not a production replacement for verified blockchain consent.
- The worker prepares Merkle commitments offline and does not require wallet signing keys.
- Browser applications must not receive server secrets. All provider endpoints, browser origins and hospital URLs are configurable through environment variables.
- Real deployment requires TLS, secure identity infrastructure, backup/restore testing, monitoring, live blockchain integration, and independent clinical/privacy/security approval.

License: Apache-2.0; see [`LICENSE`](LICENSE), [`SECURITY.md`](SECURITY.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
