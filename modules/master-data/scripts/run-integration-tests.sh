#!/usr/bin/env bash
# Real-Postgres integration tests: migrate a throwaway DB, then run tests/integration.
#
# Defaults to a local Citus on 127.0.0.1:5432/hims_test_master_data (matches CI's
# per-module DB loop). Override the whole URL with MASTER_DATA_TEST_DATABASE_URL,
# e.g. for the local hims-postgres on :5433.
set -euo pipefail

URL="${MASTER_DATA_TEST_DATABASE_URL:-postgresql+psycopg://hims:hims@127.0.0.1:5432/hims_test_master_data}"

# Alembic reads MASTER_DATA_DATABASE_URL; the tests read TEST_DATABASE_URL. Same DB.
# The app under test also gets MASTER_DATA_DATABASE_URL so its lifespan connectivity
# probe hits the test DB instead of whatever .env resolves to.
MASTER_DATA_DATABASE_URL="$URL" uv run alembic upgrade heads
# Drift gate: models vs migrations must be identical on a fully-migrated DB — the check
# that would have caught the missing inventory migration (0003) the day it happened.
MASTER_DATA_DATABASE_URL="$URL" uv run alembic check
MASTER_DATA_DATABASE_URL="$URL" TEST_DATABASE_URL="$URL" uv run pytest tests/integration "$@"
