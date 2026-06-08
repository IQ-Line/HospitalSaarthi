#!/usr/bin/env bash
set -euo pipefail

export PYTHONPATH=src
uv run python scripts/repair_alembic_baseline.py
uv run alembic upgrade heads
