# Local infrastructure

From repository root: `docker compose --env-file .env -f infrastructure/docker/compose.yml up -d`.
All host ports are loopback-only. Do not publicly expose demo Keycloak (static demo users).
Each hospital database is separately owned, as created by the postgres initializer.
The core and hospital simulators run locally using pnpm commands in the root README.
Reset only throwaway data: `docker compose -f infrastructure/docker/compose.yml down -v`.
