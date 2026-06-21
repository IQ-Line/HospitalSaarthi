"""Canonicalize the OPD tenant distribution column to ``iq_tenant_id`` (D4).

Revision ID: 0004_opd_iq_tenant_id
Revises: 003_merge_opd_prescription_heads

Part of the database-reshape cleanup (decision D4): the Citus distribution
column is canonically named ``iq_tenant_id`` across every module. OPD tables
were created with ``tenant_id``; this revision renames that column to
``iq_tenant_id`` on every ``opd.*`` table that still carries it.

The rename is data-driven and idempotent: it inspects
``information_schema.columns`` and only renames tables that still have a
``tenant_id`` column, so re-running (or running against a partially migrated
database) is safe. PostgreSQL automatically rewires dependent primary keys,
foreign keys, and indexes on ``RENAME COLUMN``, so no constraint/index DDL is
needed here.

PostgreSQL only: SQLite (test) databases are built from the ORM models, which
now map the physical column directly, so no migration step is required there.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_opd_iq_tenant_id"
down_revision: str | Sequence[str] | None = "003_merge_opd_prescription_heads"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(
        sa.text(
            "DO $$ DECLARE r record; BEGIN "
            "FOR r IN SELECT table_name FROM information_schema.columns "
            "WHERE table_schema='opd' AND column_name='tenant_id' LOOP "
            "EXECUTE format('ALTER TABLE opd.%I RENAME COLUMN tenant_id TO iq_tenant_id', r.table_name); "
            "END LOOP; END $$;"
        )
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(
        sa.text(
            "DO $$ DECLARE r record; BEGIN "
            "FOR r IN SELECT table_name FROM information_schema.columns "
            "WHERE table_schema='opd' AND column_name='iq_tenant_id' LOOP "
            "EXECUTE format('ALTER TABLE opd.%I RENAME COLUMN iq_tenant_id TO tenant_id', r.table_name); "
            "END LOOP; END $$;"
        )
    )
