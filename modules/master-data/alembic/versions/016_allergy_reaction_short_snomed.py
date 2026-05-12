"""Add ``short_name`` and ``snomed_code`` to Visitpad ``allergy_reactions`` (public + tenant_master).

Revision ID: 016_allergy_react_snomed (≤32 chars for ``alembic_version.version_num``)
Revises: 015_diagnosis_code_short_name

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "016_allergy_react_snomed"
down_revision: str | Sequence[str] | None = "015_diagnosis_code_short_name"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in ("public", _TM):
        op.add_column(
            "allergy_reactions",
            sa.Column("short_name", sa.String(length=120), nullable=True),
            schema=schema,
        )
        op.add_column(
            "allergy_reactions",
            sa.Column("snomed_code", sa.String(length=64), nullable=True),
            schema=schema,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in ("public", _TM):
        op.drop_column("allergy_reactions", "snomed_code", schema=schema)
        op.drop_column("allergy_reactions", "short_name", schema=schema)
