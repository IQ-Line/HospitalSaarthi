"""Insert ``inventory-grn`` L2 module (045 skipped due to duplicate name ``GRN``).

Revision ID: 046_inventory_grn_catalog_fix
Revises: 045_inventory_operational_catalog

Migration 045 used display name ``GRN``, which collides with an existing catalog row
(``slug = grn``). This revision inserts ``inventory-grn`` under L1 ``inventory`` with a
distinct name and links CRUD ``module_permissions``.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "046_inventory_grn_catalog_fix"
down_revision: str | Sequence[str] | None = "045_inventory_operational_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")
_L2_SLUG = "inventory-grn"
_L2_NAME = "Inventory GRN"


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def _insert_module(
    parent_slug: str,
    name: str,
    slug: str,
    description: str,
    category: str,
    level: int,
) -> None:
    op.execute(
        f"""
        INSERT INTO global_master.modules (
            id, parent_id, name, slug, description, category, version, level, icon,
            is_active, is_deleted, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            (SELECT id FROM global_master.modules
             WHERE slug = '{parent_slug}' AND NOT is_deleted
             LIMIT 1),
            '{_sql_literal(name)}',
            '{slug}',
            '{_sql_literal(description)}',
            '{category}',
            '1.0.0',
            {level},
            NULL,
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM global_master.modules
            WHERE slug = '{slug}' AND NOT is_deleted
        )
          AND NOT EXISTS (
            SELECT 1 FROM global_master.modules
            WHERE name = '{_sql_literal(name)}' AND NOT is_deleted
        )
          AND EXISTS (
              SELECT 1 FROM global_master.modules
              WHERE slug = '{parent_slug}' AND NOT is_deleted
          );
        """
    )


def _link_l2_crud_permissions(l2_slug: str) -> None:
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
            WHERE m.slug = '{l2_slug}'
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


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    _insert_module(
        "inventory",
        _L2_NAME,
        _L2_SLUG,
        "Goods receipt notes and GRN logs.",
        "administrative",
        2,
    )
    _link_l2_crud_permissions(_L2_SLUG)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    permission_slugs_sql = ", ".join(f"'{slug}'" for slug in _PERMISSION_SLUGS)

    op.execute(
        f"""
        UPDATE global_master.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM global_master.modules m
        WHERE mp.module_id = m.id
          AND m.slug = '{_L2_SLUG}'
          AND NOT mp.is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE global_master.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM global_master.modules m, global_master.permissions p
        WHERE mp.module_id = m.id
          AND mp.permission_id = p.id
          AND m.slug = '{_L2_SLUG}'
          AND m.level >= 2
          AND p.slug IN ({permission_slugs_sql})
          AND NOT mp.is_deleted
          AND NOT p.is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE global_master.modules
        SET is_deleted = true, updated_at = now()
        WHERE slug = '{_L2_SLUG}' AND NOT is_deleted;
        """
    )
