#!/usr/bin/env bash
set -euo pipefail
# Compiles Ledger 9 proof circuits. Never publish patient witness secrets or keys.
cd "$(dirname "$0")/../../.."
if ! command -v compact >/dev/null 2>&1; then
  echo 'Compact CLI missing: follow https://docs.midnight.network/getting-started/installation' >&2
  exit 2
fi
VER="$(compact compile --version)"
if [[ "$VER" != *"0.36.1"* ]]; then
  echo "Expected Ledger 9 Compact toolchain 0.36.1, found: $VER" >&2
  echo 'Run: compact update 0.36.1' >&2
  exit 2
fi
mkdir -p contracts/midnight/managed/medical-consent
compact compile contracts/midnight/compact/medical-consent.compact contracts/midnight/managed/medical-consent
printf 'Contract generated locally. NO testnet transaction/deployment has occurred.\n'
