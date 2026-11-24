# Midnight – Ledger 9, pre-integration contract prototype

`compact/medical-consent.compact` is a **source-only experimental Compact contract**:
- private `patientSecret` witness derives scoped, non-reversible ledger grant keys;
- `grantConsent` / `revokeConsent` write *boolean* state only;
- no patient name, medical report, PHN, NIC, doctor identity or scope policy is sent on chain.

**Not deployed, compiled, or connected to the NestJS API.** The API *deliberately fails
closed* unless `CONSENT_MODE=local-demo` is explicitly configured. The local-demo
mode is conspicuously marked and rejected in production.

## Before network integration
1. Pin toolchain `compact 0.36.1`, runtime `0.21.0`, Midnight.js `5.0.1`, proof server `9.0.2` as specified for ledger 9 on 17 Nov 2026. Use official compatibility matrix to confirm exact set.
2. Compile: `compact compile contracts/midnight/compact/medical-consent.compact contracts/midnight/managed/medical-consent` from repository root. **Not yet verified** here.
3. Implement generated witness bindings **in the patient wallet/browser or local trusted client**, not the shared server. Protect patient secret; use Keycloak identity mapping securely.
4. Review caller authentication, repeated grant, scoped proof-of-authorization semantics, confirmation/finality, key derivation, reorg behavior, expiration and revocation replay protections.
5. Deploy to *local devnet* with wallet + proof server; then Preprod and record contract address and real transaction proofs.
6. Only after independent verification replace local-demo authorization with an authenticated Midnight verifier. Never treat an arbitrary transaction hash or client claim as consent proof.

Official docs: https://docs.midnight.network/relnotes/ledger-9 and https://docs.midnight.network/guides/build-a-private-smart-contract

## Ledger 9 contract build path (NOT YET TESTED ON A LIVE TOOLCHAIN)

Midnight documentation dated 21 November 2026 pins **Compact 0.36.1**,
**Compact runtime 0.21.0**, **Midnight.js 5.0.1** and proof server **9.0.2** for Ledger 9.
Install `compact` from the official distribution and select the supported version:

```bash
compact update 0.36.1
bash contracts/midnight/scripts/compile.sh
# Starts local-only prover in a separate container, not a blockchain node
docker compose -f infrastructure/docker/compose.yml --profile midnight up -d midnight-proof-server
```

The compile step generates JS/TS bindings; it does not deploy, prove, or
authorize a medical-record access. Backend `CONSENT_MODE` deliberately has no
live `midnight` mode until application-session binding, payer/wallet integration,
proof generation, indexer finality, revocation consistency and replay protection
are implemented and tested. The only usable consent workflow today is
`local-demo` against synthetic data, and production boot rejects it.

**Security boundary:** patientSecret must remain on a trusted patient device;
never send it to the Core API or store it in GitHub. Public grant keys are
pseudorandom but still need correlation/privacy review.

References: https://docs.midnight.network/getting-started/installation and
https://docs.midnight.network/guides/private-state-witnesses
