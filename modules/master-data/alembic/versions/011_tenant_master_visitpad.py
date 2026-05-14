"""Create ``tenant_master`` with full Visitpad copies, then drop ``tenant_id`` from ``public`` catalog tables.

Revision ID: 011_tenant_master_visitpad
Revises: 010_visitpad_catalog

**Pre-production / empty DB only:** includes dedupe ``DELETE`` paths that pick arbitrary survivor rows by UUID
order. Do **not** run against a production database that already holds tenant-specific catalog data you need
to preserve — replace with a data-preserving strategy before any live tenant.

Order: copy ``public`` → ``tenant_master`` (keeps ``tenant_id``), then reshape ``public`` for global rows
(without ``tenant_id``) and new partial unique indexes.

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

revision: str = "011_tenant_master_visitpad"
down_revision: str | Sequence[str] | None = "010_visitpad_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_VISITPAD_TABLES = (
    "units",
    "unit_conversions",
    "rx_columns",
    "allergens",
    "allergy_reactions",
    "chief_complaints",
    "diagnoses",
    "chronic_illnesses",
    "vitals",
    "medicines",
    "procedures",
)

_PUBLIC_INDEX_DROPS = (
    ("units", "units_tenant_code_active_key"),
    ("units", "ix_visitpad_units_tenant_display_order"),
    ("unit_conversions", "unit_conversions_tenant_from_to_active_key"),
    ("unit_conversions", "ix_visitpad_unit_conversions_tenant_order"),
    ("rx_columns", "rx_columns_tenant_section_code_active_key"),
    ("allergens", "allergens_tenant_code_active_key"),
    ("allergy_reactions", "allergy_reactions_tenant_code_active_key"),
    ("chief_complaints", "chief_complaints_tenant_code_active_key"),
    ("diagnoses", "diagnoses_tenant_icd_active_key"),
    ("chronic_illnesses", "chronic_illnesses_tenant_icd_active_key"),
    ("vitals", "vitals_tenant_code_active_key"),
    ("medicines", "medicines_tenant_code_active_key"),
    ("procedures", "procedures_tenant_cpt_active_key"),
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(text("CREATE SCHEMA IF NOT EXISTS tenant_master"))

    for table in _VISITPAD_TABLES:
        op.execute(
            text(f'CREATE TABLE tenant_master."{table}" (LIKE public."{table}" INCLUDING ALL)')
        )
        op.execute(text(f'INSERT INTO tenant_master."{table}" SELECT * FROM public."{table}"'))

    # Collapse duplicate natural keys in public before dropping tenant_id (keeps smallest id).
    op.execute(
        text(
            """
            DELETE FROM public.units u
            WHERE EXISTS (
              SELECT 1 FROM public.units u2
              WHERE lower(u2.code) = lower(u.code) AND u2.id < u.id
            )
            """
        )
    )
    for table, code_col in (
        ("allergens", "code"),
        ("allergy_reactions", "code"),
        ("chief_complaints", "code"),
        ("vitals", "code"),
        ("medicines", "code"),
        ("procedures", "cpt_code"),
    ):
        op.execute(
            text(
                f"""
                DELETE FROM public."{table}" u
                WHERE EXISTS (
                  SELECT 1 FROM public."{table}" u2
                  WHERE lower(u2.{code_col}) = lower(u.{code_col}) AND u2.id < u.id
                )
                """
            )
        )
    op.execute(
        text(
            """
            DELETE FROM public.diagnoses u
            WHERE EXISTS (
              SELECT 1 FROM public.diagnoses u2
              WHERE lower(u2.icd10_code) = lower(u.icd10_code)
                AND u2.icd_version = u.icd_version
                AND u2.id < u.id
            )
            """
        )
    )
    op.execute(
        text(
            """
            DELETE FROM public.chronic_illnesses u
            WHERE EXISTS (
              SELECT 1 FROM public.chronic_illnesses u2
              WHERE lower(u2.icd10_code) = lower(u.icd10_code) AND u2.id < u.id
            )
            """
        )
    )
    op.execute(
        text(
            """
            DELETE FROM public.unit_conversions u
            WHERE EXISTS (
              SELECT 1 FROM public.unit_conversions u2
              WHERE lower(u2.from_unit_code) = lower(u.from_unit_code)
                AND lower(u2.to_unit_code) = lower(u.to_unit_code)
                AND u2.id < u.id
            )
            """
        )
    )
    op.execute(
        text(
            """
            DELETE FROM public.rx_columns u
            WHERE EXISTS (
              SELECT 1 FROM public.rx_columns u2
              WHERE lower(u2.section) = lower(u.section)
                AND lower(u2.code) = lower(u.code)
                AND u2.id < u.id
            )
            """
        )
    )

    for table, index_name in _PUBLIC_INDEX_DROPS:
        op.drop_index(index_name, table_name=table, schema="public")

    for table in _VISITPAD_TABLES:
        with op.batch_alter_table(table, schema="public") as batch:
            batch.drop_column("tenant_id")

    op.create_index(
        "units_global_code_active_key",
        "units",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "ix_visitpad_units_display_order",
        "units",
        ["display_order", "code"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "unit_conversions_global_from_to_active_key",
        "unit_conversions",
        ["from_unit_code", "to_unit_code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "ix_visitpad_unit_conversions_order",
        "unit_conversions",
        ["display_order", "from_unit_code"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "rx_columns_global_section_code_active_key",
        "rx_columns",
        ["section", "code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "allergens_global_code_active_key",
        "allergens",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "allergy_reactions_global_code_active_key",
        "allergy_reactions",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "chief_complaints_global_code_active_key",
        "chief_complaints",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "diagnoses_global_icd_active_key",
        "diagnoses",
        ["icd10_code", "icd_version"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "chronic_illnesses_global_icd_active_key",
        "chronic_illnesses",
        ["icd10_code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "vitals_global_code_active_key",
        "vitals",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "medicines_global_code_active_key",
        "medicines",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "procedures_global_cpt_active_key",
        "procedures",
        ["cpt_code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )


def downgrade() -> None:
    raise NotImplementedError("Downgrade for dual-schema Visitpad migration is not supported.")
