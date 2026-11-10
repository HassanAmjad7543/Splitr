#!/usr/bin/env bash
# Run the schema + RLS tests against a throwaway database on a local Postgres.
# Connection comes from the usual libpq env vars (PGHOST, PGPORT, PGUSER, ...).
#
#   PGHOST=localhost PGUSER=postgres scripts/test-db.sh
#
# Creates a fresh database, runs the tests, and drops it again.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="splitr_test_$$"
psql -d postgres -q -c "create database $DB"
trap 'psql -d postgres -q -c "drop database if exists $DB"' EXIT

# Roles are cluster-wide, so they may already exist from an earlier run.
psql -d "$DB" -q -v ON_ERROR_STOP=0 -f supabase/tests/auth_stub.sql 2>&1 | grep -v 'already exists' || true
psql -d "$DB" -q -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql -d "$DB" -q -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
