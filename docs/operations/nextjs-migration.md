# v0.13.0 — Next.js migration and operational verification

## Goal and implementation

Six independent React/Vite portals are consolidated into **one** Next.js 15.5+ App Router application, retaining React 19, Keycloak, NestJS, Prisma/PostgreSQL, hospital isolation, and the existing background anchor worker. The Next.js workspaces use one OIDC public client and one browser origin. The original role-level pages were migrated without dropping their API actions.

| Previous | New |
|---|---|
| Six Vite apps on ports 5173–5178 | One Next.js app on configurable port 3001 |
| `frontend/packages/web/src/auth.ts` | `frontend/src/lib/auth.ts` |
| Six individual CSS imports | One `frontend/src/app/globals.css` |
| Six Docker Vite services | Single Docker Next.js service |
| Six Keycloak redirect origins | Single `WEB_BASE_URL/*` redirect target |
| VITE_ environment | NEXT_PUBLIC_ environment |

## Preserved server features

- NestJS versioned REST API and Keycloak authorization validation.
- Six independent role-gated interfaces and server-side authorization.
- Prisma central database + three independently owned hospital databases.
- FHIR record CRUD, scoped patient consent, audit trails and aggregation.
- Durable Merkle batch preparation, outbox retry, worker health.
- Cardano anchor verification (live only after confirmed transaction).
- Midnight Compact contract sources are retained; backend denies unverified consent in non-demo mode.

## Deployment and security

Use `pnpm install --frozen-lockfile` and `pnpm build` with the public frontend variables for the target environment. Configure HTTPS, the API CORS allowlist, and Keycloak redirect origins for the frontend. Use the local Compose stack for synthetic integration testing.

`node scripts/setup-local.mjs` generates a random-secret private `.env` and Keycloak realm. To change an existing local origin, update `WEB_BASE_URL` and `CORS_ORIGINS` in `.env` and rerun `node scripts/generate-keycloak-realm.mjs` (existing Keycloak realm imports may require a clean dev realm reset).

## Blockchain truthfulness

- **Offline Cardano batching** prepares cryptographic commitments. It is not by itself an on-chain transaction. A funded Preprod signing wallet, transaction submission, confirmed explorer hash and verified Merkle proof are necessary.
- **Midnight prototype** contains a Compact contract draft. A compatible compiled/deployed contract, wallet, ZK prover, testnet indexer, verified state and revocation logic must be integrated before enabling non-demo access.
- **Hospital data remains off-chain**. Never publish patient identifiers, medical details, or re-identifiable deterministic hashes.

## Verification

See the [release verification report](../testing/RELEASE_VERIFICATION_0.13.md) and [deployment acceptance checklist](../testing/deployment-checklist.md).
