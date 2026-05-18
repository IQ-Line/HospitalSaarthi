"""Rename ``tenant_id`` → ``iq_tenant_id`` on all ``tenant_master`` catalog tables.

Revision ID: 019_tm_iq_tenant_id_col (≤32 chars for ``alembic_version.version_num``)
Revises: 018_procedure_short_name

**No-op (fresh local DB):** ``011`` renames Visitpad ``tenant_master`` columns; ``012`` creates platform tables with ``iq_tenant_id``.
Revision retained for Alembic chain continuity only.

SQLite / non-PostgreSQL: no-op.
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "019_tm_iq_tenant_id_col"
down_revision: str | Sequence[str] | None = "018_procedure_short_name"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return
