"""Operational inventory product catalog — GRN, indents, stock, transfers (``global_master``).

Revision ID: 045_inventory_operational_catalog
Revises: 044_inventory_masters_catalog

``inventory-master`` (L2 under master-data) holds reference masters (categories, UOM, …).
This revision adds L1 ``inventory`` and L2 workflow modules for operational stock management.

Seeds ``global_master.module_permissions`` (shell + L1/L2 CRUD junctions) using shared
permission rows from ``026`` / ``030``. Runtime capabilities sync to User Management via
``syncCapabilitiesFromMasterDataCatalog`` (e.g. ``inventory-grn:inventory-grn:read``).
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "045_inventory_operational_catalog"
down_revision: str | Sequence[str] | None = "044_inventory_masters_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")

# (parent_slug, name, slug, description)
_INVENTORY_L2_SEEDS: tuple[tuple[str, str, str, str], ...] = (
    ("inventory", "Stock", "inventory-stock", "On-hand stock balances and lot positions."),
    ("inventory", "Indents", "inventory-indents", "Store indents and fulfillment requests."),
    ("inventory", "Inventory GRN", "inventory-grn", "Goods receipt notes and GRN logs."),
    ("inventory", "Transfers", "inventory-transfers", "Inter-store stock transfers."),
)

_DOWNGRADE_MODULE_SLUGS: tuple[str, ...] = (
    "inventory",
    *(slug for _, _, slug, _ in _INVENTORY_L2_SEEDS),
)


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def _insert_module(
    parent_slug: str | None,
    name: str,
    slug: str,
    description: str,
    category: str,
    level: int,
) -> None:
    parent_sql = "NULL"
    parent_exists_clause = ""
    if parent_slug is not None:
        parent_sql = f"""
            (SELECT id FROM global_master.modules
             WHERE slug = '{parent_slug}' AND NOT is_deleted
             LIMIT 1)
        """
        parent_exists_clause = f"""
          AND EXISTS (
              SELECT 1 FROM global_master.modules
              WHERE slug = '{parent_slug}' AND NOT is_deleted
          )
        """

    op.execute(
        f"""
        INSERT INTO global_master.modules (
            id, parent_id, name, slug, description, category, version, level, icon,
            is_active, is_deleted, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            {parent_sql},
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
        ){parent_exists_clause};
        """
    )


def _link_shell_junction(module_slug: str, permission_slug: str) -> None:
    junction_slug = f"{module_slug}:{permission_slug}"
    op.execute(
        f"""
        INSERT INTO global_master.module_permissions (
            id, slug, module_id, permission_id, is_default, is_active, is_deleted,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            '{_sql_literal(junction_slug)}',
            m.id,
            p.id,
            false,
            true,
            false,
            now(),
            now()
        FROM global_master.modules m
        INNER JOIN global_master.permissions p
          ON p.slug = '{permission_slug}' AND NOT p.is_deleted
        WHERE m.slug = '{module_slug}' AND NOT m.is_deleted
          AND NOT EXISTS (
            SELECT 1 FROM global_master.module_permissions mp
            WHERE mp.slug = '{_sql_literal(junction_slug)}'
              AND NOT mp.is_deleted
          );
        """
    )


def _link_l1_crud_permissions(l1_slug: str) -> None:
    """L1 product shell module — read/create/edit/delete (``inventory:read``, …)."""
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
            WHERE m.slug = '{l1_slug}'
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


def _link_all_l2_crud_permissions() -> None:
    l2_slugs = tuple(slug for _, _, slug, _ in _INVENTORY_L2_SEEDS)
    slugs_sql = ", ".join(f"'{slug}'" for slug in l2_slugs)
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
            WHERE m.slug IN ({slugs_sql})
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
        None,
        "Inventory",
        "inventory",
        "Operational inventory — stock, GRN, indents, and transfers.",
        "administrative",
        1,
    )

    for parent_slug, name, slug, description in _INVENTORY_L2_SEEDS:
        _insert_module(parent_slug, name, slug, description, "administrative", 2)

    _link_shell_junction("inventory", "shell.access")
    _link_l1_crud_permissions("inventory")
    _link_all_l2_crud_permissions()

    op.execute(
        """
        UPDATE global_master.modules
        SET display_order = 130, updated_at = now()
        WHERE slug = 'inventory'
          AND level = 1
          AND NOT is_deleted
          AND display_order = 0;
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    slugs_sql = ", ".join(f"'{slug}'" for slug in _DOWNGRADE_MODULE_SLUGS)
    permission_slugs_sql = ", ".join(f"'{slug}'" for slug in _PERMISSION_SLUGS)

    op.execute(
        f"""
        UPDATE global_master.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM global_master.modules m
        WHERE mp.module_id = m.id
          AND m.slug IN ({slugs_sql})
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
          AND m.slug IN ({slugs_sql})
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
        WHERE slug IN ({slugs_sql}) AND NOT is_deleted;
        """
    )
