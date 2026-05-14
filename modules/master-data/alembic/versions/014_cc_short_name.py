"""Add optional ``short_name`` to Visitpad ``chief_complaints`` (public + tenant_master).

Revision ID: 014_cc_short_name
Revises: 013_tm_tenant_id_int

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "014_cc_short_name"
down_revision: str | Sequence[str] | None = "013_tm_tenant_id_int"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.add_column("chief_complaints", sa.Column("short_name", sa.String(length=120), nullable=True))
    op.add_column(
        "chief_complaints",
        sa.Column("short_name", sa.String(length=120), nullable=True),
        schema=_TM,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.drop_column("chief_complaints", "short_name")
    op.drop_column("chief_complaints", "short_name", schema=_TM)
