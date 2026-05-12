"""Add ``chronic_illness_prompt`` to Visitpad ``chronic_illnesses`` (public + tenant_master).

Revision ID: 017_chronic_illness_prompt
Revises: 016_allergy_react_snomed

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "017_chronic_illness_prompt"
down_revision: str | Sequence[str] | None = "016_allergy_react_snomed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in ("public", _TM):
        op.add_column(
            "chronic_illnesses",
            sa.Column(
                "chronic_illness_prompt",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            schema=schema,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in ("public", _TM):
        op.drop_column("chronic_illnesses", "chronic_illness_prompt", schema=schema)
