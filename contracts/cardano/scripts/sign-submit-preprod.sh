#!/usr/bin/env bash
# Operator-only, NEVER run with real medical data or a production wallet.
# Read official cardano-cli help for your pinned node version before proceeding.
set -euo pipefail
: "${CARDANO_PREPROD_ADDRESS:?Provide funded Preprod address}"
: "${CARDANO_PREPROD_UTXO:?Provide txHash#utxoIndex from the authorized wallet}"
: "${CARDANO_PREPROD_SIGNING_KEY_FILE:?Provide path to locally protected signing key}"
: "${CARDANO_METADATA_FILE:?Path to cardano-metadata.json created by prepare-batch.mjs}"
: "${CARDANO_NODE_SOCKET_PATH:?Requires a synchronized Preprod cardano-node socket}"
OUT_DIR="${CARDANO_ARTIFACT_DIR:-./cardano-out}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
if [[ ! -f "$CARDANO_PREPROD_SIGNING_KEY_FILE" || ! -f "$CARDANO_METADATA_FILE" ]]; then
  echo 'Missing signing key or public metadata file' >&2; exit 2
fi
node - "$CARDANO_METADATA_FILE" <<'NODE'
const fs=require('fs');const file=process.argv[2];const m=JSON.parse(fs.readFileSync(file));
if(Object.keys(m).length!==1 || m['1900']?.v!==1 || m['1900']?.alg!=='LHC_SHA256_MERKLE_V1' || !/^[0-9a-f]{64}$/i.test(m['1900']?.root||''))
 throw new Error('Refusing unexpected metadata (possible PHI leakage)');
NODE
# A 2 ADA payment to self ensures the transaction has a normal output;
# the rest returns to the change address.
cardano-cli latest transaction build \
  --testnet-magic 1 \
  --tx-in "$CARDANO_PREPROD_UTXO" \
  --tx-out "${CARDANO_PREPROD_ADDRESS}+2000000" \
  --change-address "$CARDANO_PREPROD_ADDRESS" \
  --metadata-json-file "$CARDANO_METADATA_FILE" \
  --out-file "$OUT_DIR/anchor.txbody"
cardano-cli latest transaction sign \
  --testnet-magic 1 \
  --tx-body-file "$OUT_DIR/anchor.txbody" \
  --signing-key-file "$CARDANO_PREPROD_SIGNING_KEY_FILE" \
  --out-file "$OUT_DIR/anchor.signed"
TX_HASH="$(cardano-cli latest transaction txid --tx-file "$OUT_DIR/anchor.signed")"
printf '%s\n' "$TX_HASH" > "$OUT_DIR/tx-hash.txt"
echo "Signed Preprod transaction: $TX_HASH"
if [[ "${LHC_SUBMIT_PREPROD:-no}" != 'YES_I_APPROVE_TESTNET' ]]; then
  echo "NOT submitted. Set LHC_SUBMIT_PREPROD=YES_I_APPROVE_TESTNET to submit."
  exit 0
fi
cardano-cli latest transaction submit --testnet-magic 1 --tx-file "$OUT_DIR/anchor.signed"
echo "Submitted transaction. Wait for confirmation, then run register-confirmed-anchor.ts."
