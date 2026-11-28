# Source layout — v0.13.0

- `frontend/` — Next.js App Router, React 19, six authenticated role-based routes.
- `backend/apps/api/` — NestJS REST API (`/api/v1`), authorization, FHIR processing, governance.
- `backend/apps/hospital-simulator/` — same hospital API code, started three times with distinct databases and credentials.
- `backend/apps/worker/` — asynchronous Merkle batching, outbox retry / recovery.
- `backend/packages/database/` — Prisma central database schema/migrations.
- `backend/packages/hospital-database/` — Prisma hospital schema/migrations.
- `backend/packages/shared/` — shared backend business rules and validation.
- `contracts/` — Cardano operator scripts and Midnight Compact contract draft.
- `infrastructure/docker/` — local Compose stack.
- `scripts/` — environment setup, generated private Keycloak realm, database helpers and quality checks.

Every role is served by ONE Next.js application, not six independent dev servers. Backend clinical data remains split across three independently owned PostgreSQL databases.

This repository must not be used with real patient data without live consent integration, independently audited security, operational monitoring and relevant regulatory approvals.
