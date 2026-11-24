# Cardano Preprod – Privacy-safe record anchoring

Real Cardano transactions **not submitted yet**. Off-chain deterministic SHA-256
Merkle proofs and Cardano label `1900` metadata generation are implemented.

## Offline preparation and verification

```bash
# Must be an array of randomized commitments, NOT raw report hashes/medical data.
node contracts/cardano/scripts/prepare-batch.mjs commitments.json /tmp/lhc-batch
node contracts/cardano/scripts/verify-batch.mjs \
  /tmp/lhc-batch/private-inclusion-proofs.json /tmp/lhc-batch/cardano-metadata.json 0
```

`cardano-metadata.json` is safe to anchor if the commitments are unlinkable to
patients; the **private** inclusion-proofs file must remain access-controlled.

## Testnet signing/submission (operator only)

1. Install `cardano-cli` compatible with the Preprod network, run/synchronize an
   authorized Cardano node or access a trusted submission provider, and fund a
   dedicated Preprod wallet with test ADA (never production credentials).
2. Build a transaction with an explicit `--metadata-json-file` pointing at the
   generated `cardano-metadata.json`, a suitable UTxO and a return/change address.
3. Sign offline with the hospital attestation wallet, submit to Preprod, and
   wait for confirmation; write the transaction hash to `RecordAnchor` and mark
   status `CONFIRMED` **only after confirmation and metadata root verification**.
4. Verify the on-chain metadata root matches the local inclusion proof. Detect
   stale/replaced record versions; do not use chain anchoring to claim a diagnosis is true.

Example metadata format:

```json
{"1900":{"v":1,"alg":"LHC_SHA256_MERKLE_V1","root":"<64-hex-merkle-root>","count":2}}
```

This module supplies offline proof tooling, **not** a validated complete Cardano
wallet signing/transaction or submission integration. Do not mark records as
anchored based on local metadata alone.

### Operator-side Preprod integration

`sign-submit-preprod.sh` builds and signs a genuine metadata transaction **only
when Cardano node + funded Preprod wallet + secure signing-key file are provided**.
Submission requires the explicit `LHC_SUBMIT_PREPROD=YES_I_APPROVE_TESTNET` switch.
After Blockfrost reports on-chain inclusion, run `register-confirmed-anchor.ts`
with the private inclusion-proof manifest and confirmed TX hash. It verifies the
*actual* Preprod metadata against each private proof before updating `RecordAnchor`
and `MedicalRecordIndex` in a single PostgreSQL transaction.

These operator scripts have **not been executed here** (no test wallet, node,
Blockfrost API key or PostgreSQL connection). Verify the cardano-cli command
flags for your installed version and do not expose keys to CI or source control.
