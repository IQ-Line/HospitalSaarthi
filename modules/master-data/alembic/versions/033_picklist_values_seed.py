"""Seed platform picklist values for gender, blood group, and role types.

Revision ID: 033_picklist_values_seed
Revises: 032_picklist_values_catalog

Idempotent inserts by ``(category_id, value)``. Resolves category from parent picklist ``slug``.
Skipped on non-PostgreSQL (ORM create_all tests).

Value keys align with EMPI patient enums where applicable (gender, blood_group).
Role types align with platform clinical staff categories in HLD.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "033_picklist_values_seed"
down_revision: str | Sequence[str] | None = "032_picklist_values_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (picklist_slug, value, label, display_order, is_global)
_PICKLIST_VALUE_SEEDS: tuple[tuple[str, str, str, int, bool], ...] = (
    # gender — matches modules/empi patient gender enum
    ("gender", "male", "Male", 1, False),
    ("gender", "female", "Female", 2, False),
    ("gender", "other", "Other", 3, False),
    # blood-group — matches modules/empi blood_group enum
    ("blood-group", "A+", "A+", 1, False),
    ("blood-group", "A-", "A-", 2, False),
    ("blood-group", "B+", "B+", 3, False),
    ("blood-group", "B-", "B-", 4, False),
    ("blood-group", "AB+", "AB+", 5, False),
    ("blood-group", "AB-", "AB-", 6, False),
    ("blood-group", "O+", "O+", 7, False),
    ("blood-group", "O-", "O-", 8, False),
    # role-types — tenant staff (User Management role.code); platform roles in migration 038
    ("role-types", "doctor", "Doctor", 1, False),
    ("role-types", "nurse", "Nurse", 2, False),
    ("role-types", "pharmacist", "Pharmacist", 3, False),
    ("role-types", "lab-technician", "Lab Technician", 4, False),
    ("role-types", "admin", "Administrator", 5, True),
    ("role-types", "receptionist", "Receptionist", 6, False),
    ("role-types", "radiologist", "Radiologist", 7, False),
    ("role-types", "super-admin", "Super Admin", 8, True),
    ("role-types", "tenant-admin", "Tenant Admin", 9, False),
    # tariff-type — frontdesk / tariff catalog service categories
    ("tariff-type", "consultation-fee", "Consultation fee", 1, False),
    ("tariff-type", "registration-fee", "Registration fee", 2, False),
)


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


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
            is_active, is_default, display_order, created_at, updated_at
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
