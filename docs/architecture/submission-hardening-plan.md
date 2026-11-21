# v0.11.0 submission hardening plan — 22 November 2026

**Goal:** Prepare a clean, reproducible, appropriately scoped UniHack source submission before the user's 20:00 Asia/Colombo deadline. No claim of background execution or live blockchain verification is made.

| Stage | Deliverable | Status |
|---|---|---|
| 1 | Audit v0.10 source, test baseline, enumerate hard-coded deployment values | Done |
| 2 | Configuration utilities for port, CORS, Cardano provider and required secrets | Implemented + unit tests |
| 3 | Parameterized Docker internal endpoints, ports and frontend public env | Implemented + static checks |
| 4 | Synthetic Keycloak redirects/passwords generated privately from `.env` | Implemented + isolated generation test |
| 5 | Remove stale release logs/reports; retain source, migrations, security and API docs | Implemented |
| 6 | Update six-portal integration CI to use generated credentials | Implemented; CI execution pending |
| 7 | Re-run offline tests and package archive; provide exact evidence | See release verification |
| 8 | Full pnpm install, TypeScript build, Docker, real DB migration/E2E | Blocked by environment |
| 9 | Signed Cardano Preprod TX with live provider confirmation | Not performed; credentials/testnet needed |
| 10 | Midnight Compact compile, deploy, prove and revoke on testnet | Not performed; toolchain/network/wallet needed |

## Design decision

Keep a modular NestJS monolith + independent Hospital APIs + dedicated PostgreSQL outbox worker. Do **not** add Kafka/RabbitMQ or more microservices without measured throughput and operating requirements. Browser Service Workers must not cache PHI. Every Hospital DB maintains separate credentials. Core API is fail-closed in production when only local-demo consent is available.

## Release acceptance

Package only source, migration history, synthetic fixtures, contract drafts, tests, CI and essential docs. Scan ZIP members for `.env`, private keys, generated realm and `private/`. Verify all offline unit/protocol/API contracts; document that full-stack tests were not executable without Docker/dependencies. Never represent source-level pass as end-to-end production validation.
