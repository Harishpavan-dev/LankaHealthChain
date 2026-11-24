# API versioning policy

Core API prefix is `/api/v1` (NestJS URI versioning). `v1` operations must preserve
request/response compatibility; breaking changes launch `/api/v2` with migration policy.
JSON input is validated with DTO allowlists and rejects unknown fields. Current primitive
FHIR envelope validation does not imply complete FHIR R4 conformance.

Error bodies follow NestJS HTTP exception conventions. Production work: adopt RFC 9457
Problem Details, request IDs, idempotency headers, pagination, OpenTelemetry and structured
log correlation without clinical payloads. Swagger is served at `/api/docs`.
