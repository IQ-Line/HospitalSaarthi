"""Convert ``tenant_master.*.tenant_id`` from UUID to integer (catalog tenant key).

Revision ID: 013_tm_tenant_id_int (≤32 chars for ``alembic_version.version_num``).
Revises: 012_tm_platform_catalog

**Breaking / pre-production only:** truncates all rows in ``tenant_master`` catalog tables (Visitpad + platform)
because UUID tenant keys cannot be converted to integers, then coerces keys with ``USING 1``. Never run this
revision against a production DB with real multi-tenant data. Re-seed tenant data after upgrade if needed.

SQLite / non-PostgreSQL: no-op.

"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "013_tm_tenant_id_int"
down_revision: str | Sequence[str] | None = "012_tm_platform_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"

_TENANT_MASTER_TABLES = (
    "module_permissions",
    "modules",
    "permissions",
    "system_roles",
    "unit_conversions",
    "units",
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

    table_list = ", ".join(f'{_TM}."{t}"' for t in _TENANT_MASTER_TABLES)
    op.execute(text(f"TRUNCATE TABLE {table_list} CASCADE"))

    for table in _TENANT_MASTER_TABLES:
        op.execute(
            text(
                f'ALTER TABLE {_TM}."{table}" '
                f"ALTER COLUMN tenant_id TYPE integer USING 1"
            )
        )
        op.execute(text(f'ALTER TABLE {_TM}."{table}" ALTER COLUMN tenant_id DROP DEFAULT'))


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade from integer tenant_id to UUID is not supported.",
    )
