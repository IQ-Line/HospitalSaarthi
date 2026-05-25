"""Add visibility_scope to global_master.modules and tenant_master.modules.

Revision ID: 037_module_visibility_scope
Revises: 036_module_kind_and_display_order

Adds one column to both schemas:
- visibility_scope VARCHAR(16) NOT NULL DEFAULT 'tenant'
  with CHECK constraint ('superadmin', 'tenant')

Backfill:
- Internal RBAC/registry submodules marked 'superadmin'.
- Everything else remains 'tenant'.
- Includes soft-deleted rows.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "037_module_visibility_scope"
down_revision: str | Sequence[str] | None = "036_module_kind_and_display_order"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SUPERADMIN_SLUGS = (
    "permissions",
    "modules",
    "role-capabilities",
    "user-capabilities",
    "tenant-modules",
)


def _add_columns(schema: str, constraint_name: str) -> None:
    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(16) NOT NULL DEFAULT 'tenant'"
    )

    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"ADD CONSTRAINT {constraint_name} "
        f"CHECK (visibility_scope IN ('superadmin', 'tenant'))"
    )


def _backfill_visibility_scope(schema: str) -> None:
    slug_list = ", ".join(f"'{s}'" for s in _SUPERADMIN_SLUGS)
    op.execute(
        f"""
        UPDATE {schema}.modules
        SET visibility_scope = 'superadmin'
        WHERE slug IN ({slug_list})
        """
    )


def _drop_columns(schema: str, constraint_name: str) -> None:
    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"DROP CONSTRAINT IF EXISTS {constraint_name}"
    )

    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"DROP COLUMN IF EXISTS visibility_scope"
    )


def upgrade() -> None:
    _add_columns("global_master", "modules_visibility_scope_check")
    _backfill_visibility_scope("global_master")

    _add_columns("tenant_master", "tm_modules_visibility_scope_check")
    _backfill_visibility_scope("tenant_master")


def downgrade() -> None:
    _drop_columns("tenant_master", "tm_modules_visibility_scope_check")
    _drop_columns("global_master", "modules_visibility_scope_check")
