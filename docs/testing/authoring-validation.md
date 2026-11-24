# Authoring-session validation evidence

Generated: 2026-11-22.

## Executed successfully

- `node --experimental-strip-types --test tests/unit/*.test.mjs`: **22 passed, 0 failed**.
- Global TypeScript transpile/syntax check for **35** `.ts` / `.tsx` source files: **0 syntax errors**.
- `tsc --noEmit -p packages/shared/tsconfig.json` with preinstalled Node type roots: **passed**.
- Static migration-to-Prisma-model/column matching: **3 passing assertions** within the 22 unit tests.

## Not executed

- `pnpm install`, application typecheck and build using installed libraries: npm DNS failure (`EAI_AGAIN`).
- Running Docker / PostgreSQL migrations: Docker and PostgreSQL server are not installed in this authoring environment.
- NestJS integration tests with real Keycloak, browser automation, live Cardano Preprod transactions, Midnight Compact compilation/proof generation: not implemented or run.

This report distinguishes source/syntax/unit verification from runtime and integration verification.
See [unit test raw output](unit-test-output.txt).
