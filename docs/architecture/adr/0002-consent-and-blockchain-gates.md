# ADR 0002: Fail-closed privacy / provenance gates

Status: Accepted for MVP.

In `local-demo`, consent decisions are local policy decisions clearly labeled NOT MIDNIGHT.
A production-like mode cannot return records until a real Midnight verifier is implemented.
Cardano `PENDING` means not anchored, and local digest matching must never be reported as
Cardano-chain verified. Real anchoring will run asynchronously via an idempotent outbox.
