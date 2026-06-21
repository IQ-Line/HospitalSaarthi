"""Seed core platform modules and Master Data catalog tree in ``master_global.modules``.

Revision ID: 027_core_modules_catalog
Revises: 026_master_data_catalog_permissions

Replaces the legacy ``001_initial_schema`` bulk insert. Idempotent by ``slug``.

Each row sets ``name`` and ``slug`` explicitly in the seed tuples below (no derivation in code).
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "027_core_modules_catalog"
down_revision: str | Sequence[str] | None = (
    "026_master_data_catalog_permissions",
    "026_um_catalog_seed",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (parent_slug | None, name, slug, description, category, version, level)
_MODULE_SEEDS: tuple[tuple[str | None, str, str, str, str, str, int], ...] = (
    # Level 1
    (
        None,
        "User Management",
        "user-management",
        "User and role administration.",
        "core",
        "1.0.0",
        1,
    ),
    (
        None,
        "Onboarding",
        "configurator",
        "Tenant configuration and module enablement.",
        "core",
        "1.0.0",
        1,
    ),
    (
        None,
        "EMPI",
        "empi",
        "Enterprise master patient index.",
        "core",
        "1.0.0",
        1,
    ),
    (
        None,
        "Master Data",
        "master-data",
        "Platform catalog and reference data.",
        "core",
        "1.0.0",
        1,
    ),
    # Level 2 — under master-data
    (
        "master-data",
        "Departments",
        "departments",
        "Hospital departments and organizational units.",
        "core",
        "1.0.0",
        2,
    ),
    (
        "master-data",
        "Picklist",
        "picklist",
        "Picklist domain headers.",
        "core",
        "1.0.0",
        2,
    ),
    (
        "master-data",
        "Modules",
        "modules",
        "Platform module registry.",
        "core",
        "1.0.0",
        2,
    ),
    (
        "master-data",
        "Permissions",
        "permissions",
        "Permission definitions catalog.",
        "core",
        "1.0.0",
        2,
    ),
    (
        "master-data",
        "Visitpad Master",
        "visitpad-master",
        "Visitpad clinical reference catalogs.",
        "clinical",
        "1.0.0",
        2,
    ),
    (
        "master-data",
        "Picklist Items",
        "picklist-items",
        "Values for picklist domains.",
        "core",
        "1.0.0",
        2,
    ),
)

# (name, slug, description) — parent slug is user-management (L1, L2)
_USER_MANAGEMENT_L2_SEEDS: tuple[tuple[str, str, str], ...] = (
    ("Users", "users", "Tenant-scoped platform users."),
    ("User Roles", "user-roles", "Roles assigned to users."),
    ("Role Capabilities", "role-capabilities", "Capabilities granted to roles."),
    ("User Capabilities", "user-capabilities", "Capabilities granted directly to users."),
)

# (name, slug, description) — parent slug is configurator (L1, L2)
_CONFIGURATOR_L2_SEEDS: tuple[tuple[str, str, str], ...] = (
    ("Organizations", "organizations", "Hospital organizations and hierarchy."),
    ("Tenant Modules", "tenant-modules", "Per-tenant module enablement."),
    ("Tenants", "tenants", "Tenant registry and lifecycle."),
)

# (name, slug, description) — parent slug is visitpad-master (L3)
_VISITPAD_L3_SEEDS: tuple[tuple[str, str, str], ...] = (
    ("Units", "units", "Measurement units and unit conversions."),
    ("Vitals", "vitals", "Vital sign definitions."),
    ("Chief Complaints", "chief-complaints", "Chief complaint catalog."),
    ("Diagnoses", "diagnoses", "Diagnosis / ICD catalog."),
    ("Allergens", "allergens", "Allergen definitions."),
    ("Reactions", "allergy-reactions", "Allergy reaction catalog."),
    ("Rx Columns", "rxcolumns", "Prescription column templates (frequency, route, etc.)."),
    ("Medicines", "medicines", "Medicine catalog."),
    ("Chronic Illnesses", "chronic-illnesses", "Chronic illness catalog."),
    ("Procedures", "procedures", "Procedure catalog."),
    ("Vaccines", "vaccines", "Vaccine catalog."),
    ("Manufacturers", "manufacturers", "Vaccine / medicine manufacturers."),
)

# (name, slug, description) — parent slug is always rxcolumns (L4)
_RXCOLUMN_L4_SEEDS: tuple[tuple[str, str, str], ...] = (
    ("Medication Type", "medication-type", "Rx column section: medication type."),
    ("Frequency", "frequency", "Rx column section: frequency."),
    ("Unit", "unit", "Rx column section: unit."),
    ("Diet Type", "diet-type", "Rx column section: diet type."),
    ("Method Strength", "method-strength", "Rx column section: method / strength."),
    ("Route", "route", "Rx column section: route."),
    ("Time Of Administration", "time-of-administration", "Rx column section: time of administration."),
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
            '{version}',
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


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for parent_slug, name, slug, description, category, version, level in _MODULE_SEEDS:
        _insert_module(parent_slug, name, slug, description, category, version, level)

    for name, slug, description in _USER_MANAGEMENT_L2_SEEDS:
        _insert_module(
            "user-management",
            name,
            slug,
            description,
            "core",
            "1.0.0",
            2,
        )

    for name, slug, description in _CONFIGURATOR_L2_SEEDS:
        _insert_module(
            "configurator",
            name,
            slug,
            description,
            "core",
            "1.0.0",
            2,
        )

    for name, slug, description in _VISITPAD_L3_SEEDS:
        _insert_module(
            "visitpad-master",
            name,
            slug,
            description,
            "clinical",
            "1.0.0",
            3,
        )

    for name, slug, description in _RXCOLUMN_L4_SEEDS:
        _insert_module(
            "rxcolumns",
            name,
            slug,
            description,
            "clinical",
            "1.0.0",
            4,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    all_slugs = [slug for _, _, slug, _, _, _, _ in _MODULE_SEEDS] + [
        slug for _, slug, _ in _USER_MANAGEMENT_L2_SEEDS
    ] + [slug for _, slug, _ in _CONFIGURATOR_L2_SEEDS] + [
        slug for _, slug, _ in _VISITPAD_L3_SEEDS
    ] + [
        slug for _, slug, _ in _RXCOLUMN_L4_SEEDS
    ]
    slugs = ", ".join(f"'{slug}'" for slug in reversed(all_slugs))
    op.execute(
        f"""
        UPDATE master_global.modules SET is_deleted = true, updated_at = now()
        WHERE slug IN ({slugs}) AND NOT is_deleted;
        """
    )
