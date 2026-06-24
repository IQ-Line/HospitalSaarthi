"""Partial unique indexes on name/slug so soft-deleted rows do not block reuse.

Note: migration 002 first introduced full unique constraints (`modules_name_key`,
`modules_slug_key`). This migration intentionally replaces them with partial unique
indexes. On fresh databases that run all migrations sequentially, this means create-then-
replace; this is expected and documents the historical evolution.

Revision ID: 004_partial_unique (≤32 chars for alembic_version.version_num)
Revises: 003_soft_delete_audit
"""

from collections.abc import Sequence

from schema_names import GLOBAL_SCHEMA as _GM

from alembic import op

revision: str = "004_partial_unique"
down_revision: str | Sequence[str] | None = "003_soft_delete_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("modules_slug_key", "modules", type_="unique")
    op.drop_constraint("modules_name_key", "modules", type_="unique")

    op.execute(
        """
        CREATE UNIQUE INDEX modules_name_active_key
        ON master_global.modules (name)
        WHERE NOT is_deleted
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX modules_slug_active_key
        ON master_global.modules (slug)
        WHERE NOT is_deleted
        """
    )


def downgrade() -> None:
    op.drop_index("modules_slug_active_key", table_name="modules")
    op.drop_index("modules_name_active_key", table_name="modules")

    op.create_unique_constraint(
        "modules_name_key",
        "modules",
        ["name"],
        schema=_GM,
    )
    op.create_unique_constraint(
        "modules_slug_key",
        "modules",
        ["slug"],
        schema=_GM,
    )
