#!/usr/bin/env bash
# Real-Postgres integration tests: migrate a throwaway DB, then run tests/integration.
#
# Defaults to a local Citus on 127.0.0.1:5432/hims_test_opd (matches CI's per-module
# DB loop). Override the whole URL with OPD_TEST_DATABASE_URL, e.g. for the local
# hims-postgres on :5433.
set -euo pipefail

URL="${OPD_TEST_DATABASE_URL:-postgresql+psycopg://hims:hims@127.0.0.1:5432/hims_test_opd}"

# Alembic reads OPD_DATABASE_URL; the tests read TEST_DATABASE_URL. Same DB.
OPD_DATABASE_URL="$URL" uv run alembic upgrade heads
TEST_DATABASE_URL="$URL" uv run pytest tests/integration "$@"
