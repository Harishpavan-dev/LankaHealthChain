# LankaHealthChain v0.6.0 – Source release notes

## Backend-first changes

1. **Doctor request idempotency:** Optional HTTP `Idempotency-Key`; database-backed uniqueness scoped to doctor and immutable request-body fingerprint; reject re-use with changed payload, safely resolve concurrent replicas after Prisma unique-key conflict. New Core migration `202611220010_access_request_idempotency`.
2. **FHIR retry integrity:** Existing Core record locator can only be reused for exactly the same patient, FHIR type, and original randomized cryptographic commitment, not merely the same remote record id.
3. **Consistent error contracts:** Core global exception filter provides `{statusCode,code,message,requestId}`; server exceptions are sanitized and response/header correlation added. Runtime DB/secret errors are not disclosed to clients.
4. **Request size:** Core and Hospital NestExpress JSON parsers accept up to 300 KiB so a validated synthetic FHIR payload up to 256 KiB is not rejected by a lower default 100 KiB parser. Strict validation continues on resource content; this is NOT full HL7 profile validation.
5. **Access limits:** Throttler guards also protect authenticated hospital directory and admin aggregate summary endpoints; API ingress remains a deployment responsibility.
6. **API docs:** 19 implemented routes have typed OpenAPI 3.1 request/response, role/security requirements, error status descriptions and examples. Source OpenAPI spec drives development Swagger, machine contract checker compares all NestJS route annotations with source specification.
7. **UI polish:** Restrained white/soft-grey/teal light design, responsive layout, keyboard visible focus, functional sidebar anchor, system fonts (no external font requests), clearer labels distinguishing local cryptographic checks from public blockchain proof.
8. **Live E2E test improvements (not run):** Added duplicate-key retry and changed-payload conflict checks to an existing loopback-only, synthetic-data end-to-end script.

## What was not delivered / not tested

- Full dependency-aware pnpm build and browser UI rendering
- Real PostgreSQL migrations + real database isolation + actual Keycloak journey
- Cardano testnet transaction signing/confirmation (offline proofs only)
- Midnight Compact compilation/deployment, private proof and revoke checking (draft only)
- External FHIR certification, hospital agreements, production privacy/security hardening
- Lockfile: cannot generate without package registry access; must commit a verified `pnpm-lock.yaml` on a dependency-enabled machine.

Read [verification evidence](VERIFICATION_0.6.md) for exact commands and limitations. Do not use this demo with real patient information.
