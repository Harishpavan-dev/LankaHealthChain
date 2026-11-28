# ADR-0001: Modular monolith with independent hospital boundary

**Date:** 2026-11-22 · **Status:** Accepted for hackathon prototype

## Decision
Start with a **NestJS modular monolith** and independently owned hospital simulator services rather than splitting every backend domain into independent microservices. Keep HTTP APIs under `/api/v1` and domain logic isolated. Store patient linkage/consent/reference information in Core DB; clinical records only in hospital databases.

## Rationale
The important trust boundary is between hospitals, not between microservices within the core. The chosen structure allows realistic cross-hospital authorization, FHIR exchange, and asynchronous blockchain operations without distributed-transaction complexity across many core services.

## Consequences
- Faster local deployment, fewer moving parts, simpler debugging.
- Application nodes can later be replicated after sessions are stateless and shared replay/queue services exist.
- Cross-database writes remain a distributed consistency risk and require a reconciler/outbox.
- Real hospital integrations require signed agreements, external validation, a facility/doctor trust registry and patient identity matching.
