"""Seed Frontdesk and Finance module catalog entries.

Revision ID: 034_frontdesk_finance_modules_seed
Revises: 033_picklist_values_seed

Idempotent by ``slug``. Keeps existing databases aligned with the expanded
core module seed in ``027_core_modules_catalog``.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "034_frontdesk_finance_modules_seed"
down_revision: str | Sequence[str] | None = "033_picklist_values_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")
_MODULE_PERMISSION_MODULE_SLUGS: tuple[str, ...] = (
    "registrations",
    "tariff-master",
    "billing-accounts",
    "invoices",
)

# (parent_slug | None, name, slug, description, category, version, level)
_MODULE_SEEDS: tuple[tuple[str | None, str, str, str, str, str, int], ...] = (
    (
        None,
        "Frontdesk",
        "frontdesk",
        "Frontdesk workflows for patient intake and reception operations.",
        "frontdesk",
        "1.0.0",
        1,
    ),
    (
        "frontdesk",
        "Registrations",
        "registrations",
        "Patient registration and frontdesk intake workflows.",
        "frontdesk",
        "1.0.0",
        2,
    ),
    (
        None,
        "Finance",
        "finance",
        "Revenue cycle, billing, invoicing, and financial operations.",
        "finance",
        "1.0.0",
        1,
    ),
    (
        "finance",
        "Tariff Master",
        "tariff-master",
        "Chargeable service catalog and tariff definitions.",
        "finance",
        "1.0.0",
        2,
    ),
    (
        "finance",
        "Billing Accounts",
        "billing-accounts",
        "Patient billing accounts and outstanding balances.",
        "finance",
        "1.0.0",
        2,
    ),
    (
        "finance",
        "Invoices",
        "invoices",
        "Invoice generation, tracking, and rendering.",
        "finance",
        "1.0.0",
        2,
    ),
)


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


def _insert_module_permission(module_slug: str, permission_slug: str) -> None:
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

    for module_slug in _MODULE_PERMISSION_MODULE_SLUGS:
        for permission_slug in _PERMISSION_SLUGS:
            _insert_module_permission(module_slug, permission_slug)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    permission_slugs = ", ".join(f"'{slug}'" for slug in _PERMISSION_SLUGS)
    module_slugs = ", ".join(f"'{slug}'" for slug in _MODULE_PERMISSION_MODULE_SLUGS)
    op.execute(
        f"""
        UPDATE global_master.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM global_master.modules m, global_master.permissions p
        WHERE mp.module_id = m.id
          AND mp.permission_id = p.id
          AND m.slug IN ({module_slugs})
          AND p.slug IN ({permission_slugs})
          AND NOT mp.is_deleted
          AND NOT m.is_deleted
          AND NOT p.is_deleted;
        """
    )

    slugs = ", ".join(f"'{slug}'" for _, _, slug, _, _, _, _ in reversed(_MODULE_SEEDS))
    op.execute(
        f"""
        UPDATE global_master.modules SET is_deleted = true, updated_at = now()
        WHERE slug IN ({slugs}) AND NOT is_deleted;
        """
    )
