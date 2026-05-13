"""Add ``short_name`` to Visitpad ``procedures`` (public + tenant_master).

Revision ID: 018_procedure_short_name
Revises: 017_chronic_illness_prompt

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "018_procedure_short_name"
down_revision: str | Sequence[str] | None = "017_chronic_illness_prompt"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in ("public", _TM):
        op.add_column(
            "procedures",
            sa.Column("short_name", sa.String(length=64), nullable=True),
            schema=schema,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in ("public", _TM):
        op.drop_column("procedures", "short_name", schema=schema)
