"""Visitpad catalog symmetry: ``units.display_label`` → ``display_name``; add ``created_by`` /
``updated_by``.

Revision ID: 020_vp_disp_nm_audit_cols (≤32 chars for ``alembic_version.version_num``)
Revises: 019_tm_iq_tenant_id_col

- Renames ``display_label`` to ``display_name`` on ``units`` (``public`` + ``master_tenant``).
- Adds nullable UUID ``created_by`` and ``updated_by`` to all Visitpad catalog tables in both
  schemas.

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from schema_names import GLOBAL_SCHEMA as _GM
from schema_names import TENANT_SCHEMA as _TM
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "020_vp_disp_nm_audit_cols"
down_revision: str | Sequence[str] | None = "019_tm_iq_tenant_id_col"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_VISITPAD_TABLES = (
    "units",
    "unit_conversions",
    "rx_columns",
    "allergens",
    "allergy_reactions",
    "chief_complaints",
    "diagnoses",
    "chronic_illnesses",
    "vitals",
    "medicines",
    "procedures",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in (_GM, _TM):
        op.execute(
            sa.text(
                f'ALTER TABLE {schema}."units" RENAME COLUMN display_label TO display_name'
            )
        )

    for table in _VISITPAD_TABLES:
        op.add_column(
            table,
            sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.add_column(
            table,
            sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        )

    for table in _VISITPAD_TABLES:
        op.add_column(
            table,
            sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
            schema=_TM,
        )
        op.add_column(
            table,
            sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
            schema=_TM,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table in _VISITPAD_TABLES:
        op.drop_column(table, "updated_by", schema=_TM)
        op.drop_column(table, "created_by", schema=_TM)

    for table in _VISITPAD_TABLES:
        op.drop_column(table, "updated_by")
        op.drop_column(table, "created_by")

    for schema in (_GM, _TM):
        op.execute(
            sa.text(
                f'ALTER TABLE {schema}."units" RENAME COLUMN display_name TO display_label'
            )
        )
