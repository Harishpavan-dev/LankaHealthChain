#!/bin/sh
set -eu
# Run by postgres only when first initializing an EMPTY data volume.
# psql :'name' escapes each password as an SQL literal (not a shell expansion).
psql -v ON_ERROR_STOP=1 \
  -v core_pw="$LHC_CORE_DB_PASSWORD" \
  -v north_pw="$LHC_NORTHERN_DB_PASSWORD" \
  -v jaffna_pw="$LHC_JAFFNA_DB_PASSWORD" \
  -v venus_pw="$LHC_VENUS_DB_PASSWORD" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'lhc_core', :'core_pw') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'lhc_northern', :'north_pw') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'lhc_jaffna', :'jaffna_pw') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'lhc_venus', :'venus_pw') \gexec
CREATE DATABASE lankahealthchain_core OWNER lhc_core;
CREATE DATABASE hospital_northern OWNER lhc_northern;
CREATE DATABASE hospital_jaffna OWNER lhc_jaffna;
CREATE DATABASE hospital_venus OWNER lhc_venus;
-- PostgreSQL grants CONNECT to PUBLIC by default. Lock each database to its owner.
REVOKE CONNECT ON DATABASE lankahealthchain_core FROM PUBLIC;
REVOKE CONNECT ON DATABASE hospital_northern FROM PUBLIC;
REVOKE CONNECT ON DATABASE hospital_jaffna FROM PUBLIC;
REVOKE CONNECT ON DATABASE hospital_venus FROM PUBLIC;
GRANT CONNECT ON DATABASE lankahealthchain_core TO lhc_core;
GRANT CONNECT ON DATABASE hospital_northern TO lhc_northern;
GRANT CONNECT ON DATABASE hospital_jaffna TO lhc_jaffna;
GRANT CONNECT ON DATABASE hospital_venus TO lhc_venus;
EOSQL
