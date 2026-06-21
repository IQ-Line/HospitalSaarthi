"""Add module_kind and display_order to master_global.modules and master_tenant.modules.

Revision ID: 036_module_kind_and_display_order
Revises: 035_retire_visitpad_templates_catalog

Adds two columns to both schemas:
- module_kind VARCHAR(16) NOT NULL DEFAULT 'product'
  with CHECK constraint ('platform','foundation','product')
- display_order INTEGER NOT NULL DEFAULT 0

Backfill:
- L1 module_kind set by slug; descendants inherit via recursive CTE.
- display_order assigned for stable sidebar + wizard ordering.
- Includes soft-deleted rows.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "036_module_kind_and_display_order"
down_revision: str | Sequence[str] | None = "035_retire_visitpad_templates_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_L1_KIND_MAP = {
    "user-management": "platform",
    "configurator": "platform",
    "master-data": "platform",
    "empi": "foundation",
}

_L1_DISPLAY_ORDER = {
    # infrastructure
    "configurator": 10,
    "empi": 20,
    "master-data": 30,
    "user-management": 40,

    # products
    "frontdesk": 100,
    "opd": 110,
    "billing-and-finance": 120,
}


def _add_columns(schema: str, kind_constraint: str) -> None:
    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"ADD COLUMN module_kind VARCHAR(16) NOT NULL DEFAULT 'product'"
    )

    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0"
    )

    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"ADD CONSTRAINT {kind_constraint} "
        f"CHECK (module_kind IN ('platform', 'foundation', 'product'))"
    )


def _backfill_kind(schema: str) -> None:
    cases = "\n".join(
        f"        WHEN slug = '{slug}' THEN '{kind}'"
        for slug, kind in _L1_KIND_MAP.items()
    )

    op.execute(
        f"""
        UPDATE {schema}.modules
        SET module_kind = CASE
{cases}
        ELSE 'product'
        END
        WHERE level = 1
        """
    )

    op.execute(
        f"""
        WITH RECURSIVE tree AS (
            SELECT id, module_kind
            FROM {schema}.modules
            WHERE level = 1

            UNION ALL

            SELECT c.id, t.module_kind
            FROM {schema}.modules c
            JOIN tree t ON c.parent_id = t.id
        )
        UPDATE {schema}.modules m
        SET module_kind = tree.module_kind
        FROM tree
        WHERE m.id = tree.id
          AND m.level > 1
        """
    )


def _backfill_display_order(schema: str) -> None:
    for slug, order in _L1_DISPLAY_ORDER.items():
        op.execute(
            f"""
            UPDATE {schema}.modules
            SET display_order = {order}
            WHERE slug = '{slug}'
            """
        )

    child_orders = {
        # master-data
        "departments": 301,
        "organizations": 302,
        "picklist": 303,
        "picklist-items": 304,
        "modules": 305,
        "permissions": 306,
        "visitpad-master": 307,

        # user-management
        "users": 401,
        "user-roles": 402,
        "role-capabilities": 403,
        "user-capabilities": 404,

        # visitpad-master
        "units": 3001,
        "unit-conversions": 3002,
        "vitals": 3003,
        "diagnoses": 3004,
        "medicines": 3005,
        "vaccines": 3006,
        "allergens": 3007,
        "procedures": 3008,
        "manufacturers": 3009,
        "chronic-illnesses": 3010,
        "allergy-reactions": 3011,

        # rxcolumns
        "frequency": 3101,
        "route": 3102,
        "unit": 3103,
        "medication-type": 3104,
        "diet-type": 3105,
        "method-strength": 3106,
        "time-of-administration": 3107,

        # frontdesk
        "registration": 1001,

        # billing
        "tariff-master": 1201,
        "billing-account": 1202,
        "invoice": 1203,
    }

    for slug, order in child_orders.items():
        op.execute(
            f"""
            UPDATE {schema}.modules
            SET display_order = {order}
            WHERE slug = '{slug}'
            """
        )


def _drop_columns(schema: str, kind_constraint: str) -> None:
    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"DROP CONSTRAINT IF EXISTS {kind_constraint}"
    )

    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"DROP COLUMN IF EXISTS module_kind"
    )

    op.execute(
        f"ALTER TABLE {schema}.modules "
        f"DROP COLUMN IF EXISTS display_order"
    )


def upgrade() -> None:
    _add_columns("master_global", "modules_module_kind_check")
    _backfill_kind("master_global")
    _backfill_display_order("master_global")

    _add_columns("master_tenant", "tm_modules_module_kind_check")
    _backfill_kind("master_tenant")
    _backfill_display_order("master_tenant")


def downgrade() -> None:
    _drop_columns("master_tenant", "tm_modules_module_kind_check")
    _drop_columns("master_global", "modules_module_kind_check")