#!/bin/sh
set -eu
: "${HOSPITAL_NORTHERN_DATABASE_URL:?Missing env}"
: "${HOSPITAL_JAFFNA_DATABASE_URL:?Missing env}"
: "${HOSPITAL_VENUS_DATABASE_URL:?Missing env}"
for code in NORTHERN JAFFNA VENUS; do
  case "$code" in
    NORTHERN) HOSPITAL_DATABASE_URL="$HOSPITAL_NORTHERN_DATABASE_URL" ;;
    JAFFNA) HOSPITAL_DATABASE_URL="$HOSPITAL_JAFFNA_DATABASE_URL" ;;
    VENUS) HOSPITAL_DATABASE_URL="$HOSPITAL_VENUS_DATABASE_URL" ;;
  esac
  export HOSPITAL_DATABASE_URL
  echo "Applying hospital migration: $code"
  pnpm --filter @lhc/hospital-database exec prisma migrate deploy --config prisma.config.ts
done
