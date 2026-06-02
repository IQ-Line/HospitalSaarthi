"""Seed visit-types and registration-status picklist domains and values.

Revision ID: 039_registration_picklists_seed
Revises: 038_picklist_values_is_global

Idempotent inserts by picklist ``slug`` (domains) and ``(category_id, value)`` (values).
Skipped on non-PostgreSQL (ORM create_all tests).

Value keys align with registration module visit_type and registration_status slugs.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "039_registration_picklists_seed"
down_revision: str | Sequence[str] | None = "038_picklist_values_is_global"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (name, slug)
_PICKLIST_SEEDS: tuple[tuple[str, str], ...] = (
    ("Visit Types", "visit-types"),
    ("Registration Status", "registration-status"),
)

# (picklist_slug, value, label, display_order, is_global)
_PICKLIST_VALUE_SEEDS: tuple[tuple[str, str, str, int, bool], ...] = (
    ("visit-types", "opd_first", "OPD — First visit", 1, False),
    ("visit-types", "opd_follow_up", "OPD — Follow-up", 2, False),
    ("visit-types", "ipd_admission", "IPD admission", 3, False),
    ("visit-types", "emergency", "Emergency", 4, False),
    ("visit-types", "daycare", "Day care", 5, False),
    ("registration-status", "pending", "Registered", 1, False),
    ("registration-status", "in_progress", "Pre-consultation", 2, False),
    ("registration-status", "completed", "Consulted", 3, False),
    ("registration-status", "cancelled", "Cancelled", 4, False),
)


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def _insert_picklist(name: str, slug: str) -> None:
    op.execute(
        f"""
        INSERT INTO global_master.picklist (
            id, name, slug, is_active, is_deleted, created_by, updated_by,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            '{_sql_literal(name)}',
            '{slug}',
            true,
            false,
            NULL,
            NULL,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM global_master.picklist
            WHERE slug = '{slug}' AND NOT is_deleted
        );
        """
    )


def _insert_picklist_value(
    picklist_slug: str,
    value: str,
    label: str,
    display_order: int,
    is_global: bool,
) -> None:
    global_sql = "true" if is_global else "false"
    op.execute(
        f"""
        INSERT INTO global_master.picklist_values (
            id, category_id, value, label, description, metadata,
            is_active, is_global, display_order, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            p.id,
            '{_sql_literal(value)}',
            '{_sql_literal(label)}',
            NULL,
            NULL,
            true,
            {global_sql},
            {display_order},
            now(),
            now()
        FROM global_master.picklist p
        WHERE p.slug = '{picklist_slug}'
          AND NOT p.is_deleted
          AND NOT EXISTS (
              SELECT 1 FROM global_master.picklist_values pv
              WHERE pv.category_id = p.id
                AND pv.value = '{_sql_literal(value)}'
          );
        """
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for name, slug in _PICKLIST_SEEDS:
        _insert_picklist(name, slug)

    for picklist_slug, value, label, display_order, is_global in _PICKLIST_VALUE_SEEDS:
        _insert_picklist_value(picklist_slug, value, label, display_order, is_global)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for picklist_slug, value, _, _, _ in _PICKLIST_VALUE_SEEDS:
        op.execute(
            f"""
            DELETE FROM global_master.picklist_values pv
            USING global_master.picklist p
            WHERE pv.category_id = p.id
              AND p.slug = '{picklist_slug}'
              AND NOT p.is_deleted
              AND pv.value = '{_sql_literal(value)}';
            """
        )

    slugs = ", ".join(f"'{slug}'" for _, slug in _PICKLIST_SEEDS)
    op.execute(
        f"""
        UPDATE global_master.picklist SET is_deleted = true, updated_at = now()
        WHERE slug IN ({slugs}) AND NOT is_deleted;
        """
    )
