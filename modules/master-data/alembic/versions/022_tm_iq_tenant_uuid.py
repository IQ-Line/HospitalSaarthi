"""``tenant_master.*.iq_tenant_id``: integer → UUID (align with platform ``iq_tenant_id`` as UUID).

Revision ID: 022_tm_iq_tenant_uuid
Revises: 021_alembic_ver_num_128

**Pre-production / wipe posture:** ``TRUNCATE`` all ``tenant_master`` catalog rows, then alter ``iq_tenant_id``
from ``INTEGER`` to ``UUID``. Integer keys are not mapped to stable UUIDs; re-seed tenant catalog after upgrade.

PostgreSQL rewrites indexes that reference the column as part of ``ALTER TYPE``.

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "022_tm_iq_tenant_uuid"
down_revision: str | Sequence[str] | None = "021_alembic_ver_num_128"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"

_TM_TABLES = (
    "module_permissions",
    "modules",
    "permissions",
    "system_roles",
    "unit_conversions",
    "units",
    "rx_columns",
    "allergy_reactions",
    "allergens",
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

    tables_sql = ", ".join(f'{_TM}."{t}"' for t in _TM_TABLES)
    op.execute(text(f"TRUNCATE TABLE {tables_sql} RESTART IDENTITY CASCADE"))

    for table in _TM_TABLES:
        op.alter_column(
            table,
            "iq_tenant_id",
            schema=_TM,
            existing_type=sa.Integer(),
            type_=postgresql.UUID(as_uuid=True),
            postgresql_using="gen_random_uuid()",
            nullable=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    tables_sql = ", ".join(f'{_TM}."{t}"' for t in _TM_TABLES)
    op.execute(text(f"TRUNCATE TABLE {tables_sql} RESTART IDENTITY CASCADE"))
    for table in _TM_TABLES:
        op.alter_column(
            table,
            "iq_tenant_id",
            schema=_TM,
            existing_type=postgresql.UUID(as_uuid=True),
            type_=sa.Integer(),
            postgresql_using="1",
            nullable=False,
        )
