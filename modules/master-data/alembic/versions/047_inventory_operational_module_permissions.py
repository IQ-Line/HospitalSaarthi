"""Backfill operational inventory ``module_permissions`` (L1 CRUD + any missing L2 links).

Revision ID: 047_inventory_operational_module_permissions
Revises: 046_inventory_grn_catalog_fix

``045`` linked shell + L2 CRUD; L1 ``inventory`` read/create/edit/delete junctions were added
to ``045`` after some environments had already migrated. This revision idempotently ensures all
operational inventory modules have the expected ``global_master.module_permissions`` rows.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "047_inventory_operational_module_permissions"
down_revision: str | Sequence[str] | None = "046_inventory_grn_catalog_fix"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")

_L1_SLUG = "inventory"
_L2_SLUGS: tuple[str, ...] = (
    "inventory-stock",
    "inventory-indents",
    "inventory-grn",
    "inventory-transfers",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for permission_slug in _PERMISSION_SLUGS:
        op.execute(
            f"""
            INSERT INTO global_master.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                m.slug || ':' || '{permission_slug}',
                m.id,
                p.id,
                true,
                true,
                false,
                now(),
                now()
            FROM global_master.modules m
            CROSS JOIN global_master.permissions p
            WHERE m.slug = '{_L1_SLUG}'
              AND m.level = 1
              AND NOT m.is_deleted
              AND p.slug = '{permission_slug}'
              AND NOT p.is_deleted
              AND NOT EXISTS (
                  SELECT 1 FROM global_master.module_permissions mp
                  WHERE mp.slug = m.slug || ':' || '{permission_slug}'
                    AND NOT mp.is_deleted
              );
            """
        )

    l2_slugs_sql = ", ".join(f"'{slug}'" for slug in _L2_SLUGS)
    for permission_slug in _PERMISSION_SLUGS:
        op.execute(
            f"""
            INSERT INTO global_master.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                m.slug || ':' || '{permission_slug}',
                m.id,
                p.id,
                true,
                true,
                false,
                now(),
                now()
            FROM global_master.modules m
            CROSS JOIN global_master.permissions p
            WHERE m.slug IN ({l2_slugs_sql})
              AND m.level >= 2
              AND NOT m.is_deleted
              AND p.slug = '{permission_slug}'
              AND NOT p.is_deleted
              AND NOT EXISTS (
                  SELECT 1 FROM global_master.module_permissions mp
                  WHERE mp.slug = m.slug || ':' || '{permission_slug}'
                    AND NOT mp.is_deleted
              );
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    permission_slugs_sql = ", ".join(f"'{slug}'" for slug in _PERMISSION_SLUGS)

    op.execute(
        f"""
        UPDATE global_master.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM global_master.modules m, global_master.permissions p
        WHERE mp.module_id = m.id
          AND mp.permission_id = p.id
          AND m.slug = '{_L1_SLUG}'
          AND m.level = 1
          AND p.slug IN ({permission_slugs_sql})
          AND NOT mp.is_deleted
          AND NOT p.is_deleted;
        """
    )
