"""Rename ``tenant_id`` → ``iq_tenant_id`` on all ``tenant_master`` catalog tables.

Revision ID: 019_tm_iq_tenant_id_col (≤32 chars for ``alembic_version.version_num``)
Revises: 018_procedure_short_name

Aligns persisted column name with the ``iq_tenant_id`` request header and JSON response field.

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "019_tm_iq_tenant_id_col"
down_revision: str | Sequence[str] | None = "018_procedure_short_name"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"

_TM_TABLES = (
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
    "modules",
    "permissions",
    "system_roles",
    "module_permissions",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table in _TM_TABLES:
        op.execute(
            sa.text(
                f'ALTER TABLE {_TM}."{table}" RENAME COLUMN tenant_id TO iq_tenant_id'
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table in _TM_TABLES:
        op.execute(
            sa.text(
                f'ALTER TABLE {_TM}."{table}" RENAME COLUMN iq_tenant_id TO tenant_id'
            )
        )
