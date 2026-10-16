#!/usr/bin/env bash
# Kører migrations + seed + flow_test mod en lokal Postgres (uden Docker).
# Brug: PGHOST=/var/tmp/tfpg PGPORT=5499 supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=tfn_test
psql -U postgres -qc "drop database if exists $DB" -c "create database $DB"
run() { psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f "$1"; }
run tests/stub_supabase.sql
for f in migrations/*.sql; do run "$f"; done
run seed.sql
OUT=$(psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f tests/flow_test.sql)
echo "$OUT"
# Hvert tjek returnerer en ok-kolonne; en "f" betyder at en regel ikke holdt.
if echo "$OUT" | grep -qE '\| f( |$)'; then echo "TEST FEJLEDE" >&2; exit 1; fi
