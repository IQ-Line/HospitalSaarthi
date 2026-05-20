"""Seed Frontdesk and Finance module catalog tree in ``global_master.modules``.

Revision ID: 034_frontdesk_finance_module_catalog
Revises: 033_picklist_values_seed

Idempotent inserts by ``slug``. L1 modules have no junction rows; L2 modules
get the standard ``read``, ``create``, ``edit``, and ``delete`` links.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "034_frontdesk_finance_module_catalog"
down_revision: str | Sequence[str] | None = "033_picklist_values_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (parent_slug | None, name, slug, description, category, version, level)
_MODULE_SEEDS: tuple[tuple[str | None, str, str, str, str, str, int], ...] = (
    # Level 1
    (
        None,
        "Frontdesk",
        "frontdesk",
        "Frontdesk workflows and patient arrival operations.",
        "administrative",
        "1.0.0",
        1,
    ),
    (
        None,
        "Finance",
        "finance",
        "Finance, billing, invoicing, and revenue operations.",
        "administrative",
        "1.0.0",
        1,
    ),
    # Level 2 — under frontdesk
    (
        "frontdesk",
        "Registrations",
        "registrations",
        "Patient registration and intake workflows.",
        "administrative",
        "1.0.0",
        2,
    ),
    # Level 2 — under finance
    (
        "finance",
        "Tariff Master",
        "tariff-master",
        "Service tariff and price catalog management.",
        "administrative",
        "1.0.0",
        2,
    ),
    (
        "finance",
        "Billing Accounts",
        "billing-accounts",
        "Patient billing accounts and account balances.",
        "administrative",
        "1.0.0",
        2,
    ),
    (
        "finance",
        "Invoices",
        "invoices",
        "Invoice generation, tracking, and lifecycle management.",
        "administrative",
        "1.0.0",
        2,
    ),
)

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def _insert_module(
    parent_slug: str | None,
    name: str,
    slug: str,
    description: str,
    category: str,
    version: str,
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
            '{version}',
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


def _insert_module_permissions(module_slug: str) -> None:
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
            WHERE m.slug = '{module_slug}'
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

    for parent_slug, name, slug, description, category, version, level in _MODULE_SEEDS:
        _insert_module(parent_slug, name, slug, description, category, version, level)

    for _, _, slug, _, _, _, level in _MODULE_SEEDS:
        if level >= 2:
            _insert_module_permissions(slug)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    l2_slugs = [slug for _, _, slug, _, _, _, level in _MODULE_SEEDS if level >= 2]
    module_permission_slugs = ", ".join(
        f"'{module_slug}:{permission_slug}'"
        for module_slug in l2_slugs
        for permission_slug in _PERMISSION_SLUGS
    )
    op.execute(
        f"""
        UPDATE global_master.module_permissions
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({module_permission_slugs})
          AND NOT is_deleted;
        """
    )

    module_slugs = ", ".join(f"'{slug}'" for _, _, slug, _, _, _, _ in reversed(_MODULE_SEEDS))
    op.execute(
        f"""
        UPDATE global_master.modules SET is_deleted = true, updated_at = now()
        WHERE slug IN ({module_slugs}) AND NOT is_deleted;
        """
    )
