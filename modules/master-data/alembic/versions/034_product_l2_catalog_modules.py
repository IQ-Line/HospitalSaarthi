"""Billing & Finance and Frontdesk product catalog (``master_global.modules``).

Revision ID: 034_product_l2_catalog_modules
Revises: 033_picklist_values_seed, 030_demo_authorization_catalog

Merge head after the picklist branch (``033``) and demo authorization branch (``030``).

Follows ``027_core_modules_catalog`` (L1/L2 tree) and ``028_core_module_permissions_catalog``
(CRUD on L2). L1 shell junctions use the shared ``shell.access`` permission from ``026``.

``030_demo_authorization_catalog`` may insert ``frontdesk`` / ``opd`` earlier on the demo branch;
inserts here are idempotent by ``slug`` so this file is the canonical product tree definition.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "034_product_l2_catalog_modules"
down_revision: str | Sequence[str] | None = (
    "033_picklist_values_seed",
    "030_demo_authorization_catalog",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (parent_slug | None, name, slug, description, category, level) — L1 products
_MODULE_SEEDS: tuple[tuple[str | None, str, str, str, str, int], ...] = (
    (
        None,
        "Billing & Finance",
        "billing-and-finance",
        "Tariff master, chargeable services, and billing configuration.",
        "core",
        1,
    ),
    (
        None,
        "Frontdesk",
        "frontdesk",
        "Front desk registration and OPD workflows.",
        "clinical",
        1,
    ),
)

_BILLING_L2_SEEDS: tuple[tuple[str, str, str, str], ...] = (
    ("billing-and-finance", "Invoice", "invoice", "Patient invoices and billing documents."),
    (
        "billing-and-finance",
        "Billing Account",
        "billing-account",
        "Patient billing accounts and balances.",
    ),
    (
        "billing-and-finance",
        "Tariff Master",
        "tariff-master",
        "Chargeable services and tariff catalog.",
    ),
)

_FRONTDESK_L2_SEEDS: tuple[tuple[str, str, str, str], ...] = (
    ("frontdesk", "Registration", "registration", "Visit registration and front-desk intake."),
)

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")

# Slugs owned by this revision (``frontdesk`` L1 may also exist from ``030`` —
# not dropped on downgrade).
_DOWNGRADE_MODULE_SLUGS: tuple[str, ...] = (
    "billing-and-finance",
    *(slug for _, _, slug, _ in _BILLING_L2_SEEDS),
    *(slug for _, _, slug, _ in _FRONTDESK_L2_SEEDS),
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
            (SELECT id FROM master_global.modules
             WHERE slug = '{parent_slug}' AND NOT is_deleted
             LIMIT 1)
        """
        parent_exists_clause = f"""
          AND EXISTS (
              SELECT 1 FROM master_global.modules
              WHERE slug = '{parent_slug}' AND NOT is_deleted
          )
        """

    op.execute(
        f"""
        INSERT INTO master_global.modules (
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
            SELECT 1 FROM master_global.modules
            WHERE slug = '{slug}' AND NOT is_deleted
        )
          AND NOT EXISTS (
            SELECT 1 FROM master_global.modules
            WHERE name = '{_sql_literal(name)}' AND NOT is_deleted
        ){parent_exists_clause};
        """
    )


def _link_shell_junction(module_slug: str, permission_slug: str) -> None:
    junction_slug = f"{module_slug}:{permission_slug}"
    op.execute(
        f"""
        INSERT INTO master_global.module_permissions (
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
        FROM master_global.modules m
        INNER JOIN master_global.permissions p
          ON p.slug = '{permission_slug}' AND NOT p.is_deleted
        WHERE m.slug = '{module_slug}' AND NOT m.is_deleted
          AND NOT EXISTS (
            SELECT 1 FROM master_global.module_permissions mp
            WHERE mp.slug = '{_sql_literal(junction_slug)}'
              AND NOT mp.is_deleted
          );
        """
    )


def _link_l2_crud_permissions() -> None:
    l2_slugs = tuple(slug for _, _, slug, _ in _BILLING_L2_SEEDS + _FRONTDESK_L2_SEEDS)
    slugs_sql = ", ".join(f"'{slug}'" for slug in l2_slugs)
    for permission_slug in _PERMISSION_SLUGS:
        op.execute(
            f"""
            INSERT INTO master_global.module_permissions (
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
            FROM master_global.modules m
            CROSS JOIN master_global.permissions p
            WHERE m.slug IN ({slugs_sql})
              AND m.level >= 2
              AND NOT m.is_deleted
              AND p.slug = '{permission_slug}'
              AND NOT p.is_deleted
              AND NOT EXISTS (
                  SELECT 1 FROM master_global.module_permissions mp
                  WHERE mp.slug = m.slug || ':' || '{permission_slug}'
                    AND NOT mp.is_deleted
              );
            """
        )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for parent_slug, name, slug, description, category, level in _MODULE_SEEDS:
        _insert_module(parent_slug, name, slug, description, category, level)

    for parent_slug, name, slug, description in _BILLING_L2_SEEDS:
        _insert_module(parent_slug, name, slug, description, "core", 2)

    for parent_slug, name, slug, description in _FRONTDESK_L2_SEEDS:
        _insert_module(parent_slug, name, slug, description, "clinical", 2)

    _link_shell_junction("billing-and-finance", "shell.access")
    _link_shell_junction("frontdesk", "shell.access")
    _link_l2_crud_permissions()


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    slugs_sql = ", ".join(f"'{slug}'" for slug in reversed(_DOWNGRADE_MODULE_SLUGS))
    permission_slugs_sql = ", ".join(f"'{slug}'" for slug in _PERMISSION_SLUGS)

    op.execute(
        f"""
        UPDATE master_global.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM master_global.modules m
        WHERE mp.module_id = m.id
          AND m.slug IN ({slugs_sql})
          AND NOT mp.is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE master_global.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM master_global.modules m, master_global.permissions p
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
        UPDATE master_global.modules
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({slugs_sql}) AND NOT is_deleted;
        """
    )
