"""Pharmacy product catalog module and dispense permissions.

Revision ID: 040_pharmacy_catalog
Revises: 039_registration_picklists_seed
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "040_pharmacy_catalog"
down_revision: str | Sequence[str] | None = "039_registration_picklists_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")


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
        None,
        "Pharmacy",
        "pharmacy",
        "Pharmacy counter — OPD dispense queue and manual billing.",
        "clinical",
        1,
    )
    _insert_module(
        "pharmacy",
        "Dispense",
        "dispense",
        "Dispense orders, partial rounds, and counter billing.",
        "clinical",
        2,
    )
    _link_shell_junction("pharmacy", "shell.access")
    _link_l2_crud_permissions("dispense")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    slugs = ("pharmacy", "dispense")
    slugs_sql = ", ".join(f"'{slug}'" for slug in slugs)
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
