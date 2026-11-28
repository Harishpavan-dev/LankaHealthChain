# LankaHealthChain v0.13.0 release verification

Verified on 27 November 2026 against an isolated Docker stack using synthetic records and disposable credentials.

| Check | Result |
| --- | --- |
| Dependency installation and audit | Frozen lockfile installed with pnpm 10.18.0. The audit reported zero known vulnerabilities. |
| Build and static checks | All seven workspaces built. Type checks, lint, syntax, and configuration checks passed. |
| Automated tests | 144 unit tests, 3 protocol tests, and all 40 OpenAPI operations passed. |
| Frontend release image | The standalone image built on Node 22.22.3, ran as a non-root user, and served HTTP successfully. |
| PostgreSQL | Applied 15 core migrations and 3 migrations in each hospital database. Verified 4 owner connections and 12 cross-database denials. |
| Browser sign-in | Keycloak sign-in and authenticated API calls passed for all six workspaces in Edge. The Patient account was denied access to the Network Admin workspace. |
| Live synthetic workflows | Consent approval and revocation, cross-hospital retrieval, governance controls, and worker health passed. Concurrent identical record writes produced one record, and conflicting content was rejected. |
| Production consent guard | The compiled API rejected `CONSENT_MODE=local-demo` under `NODE_ENV=production`. |

Prisma printed an OpenSSL detection warning in the local demo image. Client generation and all migrations completed successfully.

## Clinical deployment gates

Live Midnight consent verification remains unimplemented. Cardano Preprod transaction submission and confirmation remain unverified. Deployment with real patient records requires the operational, clinical, privacy, and security gates in the [deployment acceptance checklist](deployment-checklist.md).

Reproduce the synthetic checks with the [installation guide](../installation-guide.md). The dependency patches cover the [PostCSS advisory](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) and the [Effect advisory](https://github.com/Effect-TS/effect/security/advisories/GHSA-7589-6fvf-x4pw).
