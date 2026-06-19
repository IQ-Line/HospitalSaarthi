#!/usr/bin/env bash
set -euo pipefail

# Branched Alembic history — must upgrade all heads, not a single head.
uv run python -m opd.core.migrations
