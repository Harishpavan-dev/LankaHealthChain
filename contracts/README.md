# Blockchain implementation boundaries

The MVP integrity commitment and local consent policy are implemented **off-chain**.
Live Cardano and Midnight components are **NOT** part of this milestone.

Planned adapters must expose explicit verification result types, never `true` on errors.
On-chain metadata must avoid patient IDs, hashes of low-entropy report content,
diagnoses, names, dates of birth, healthcare document URLs or consent details.

## Cardano
- Independent hospital issuer credential verification.
- Batch nonce-based record commitments into a Merkle root.
- Submit a Cardano Preprod transaction and wait for confirmations.
- Verify inclusion proof and on-chain root; return chain state `PENDING/CONFIRMED/FAILED`.
- Implement idempotent retry/outbox jobs; never pretend a pending transaction is confirmed.

## Midnight
- Design privacy-preserving Compact consent circuit under Ledger 9 toolchain.
- Bind patient/doctor/hospital/request/purpose/expiry to a proof and contract state.
- Ensure revocation and replay defenses using current state, nonces and short-lived grants.
- Add real proof server, SDK pinning, testnet wallet and live evidence.
- Never use this demo's local consent record as a Midnight proof.

See official documentation: https://docs.midnight.network/ and https://developers.cardano.org/
