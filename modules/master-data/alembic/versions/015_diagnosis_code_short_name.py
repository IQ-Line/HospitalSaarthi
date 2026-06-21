"""Visitpad ``diagnoses``: add ``code`` + ``short_name``, optional ICD block, uniqueness on ``code``.

Revision ID: 015_diagnosis_code_short_name
Revises: 014_cc_short_name

- Drops ICD partial unique indexes (replaced by ``code`` uniqueness) when present
  (``DROP INDEX IF EXISTS`` so partial / hand-edited DBs still upgrade).
- Backfills ``code`` from stable id-based slug for existing rows.
- Makes ICD columns nullable for simple diagnosis rows (legacy-style).

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "015_diagnosis_code_short_name"
down_revision: str | Sequence[str] | None = "014_cc_short_name"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    # IF EXISTS: some DBs never got the master_tenant ICD index (e.g. partial upgrade paths); 015 must still run.
    op.execute(text(f'DROP INDEX IF EXISTS "{_TM}".diagnoses_tenant_icd_active_key'))
    op.execute(text('DROP INDEX IF EXISTS master_global.diagnoses_global_icd_active_key'))

    for schema in (_GM, _TM):
        op.add_column(
            "diagnoses",
            sa.Column("code", sa.String(length=64), nullable=True),
            schema=schema,
        )
        op.add_column(
            "diagnoses",
            sa.Column("short_name", sa.String(length=120), nullable=True),
            schema=schema,
        )

    op.execute(
        text(
            """
            UPDATE master_global.diagnoses
            SET code = 'dx' || replace(cast(id as text), '-', '')
            WHERE code IS NULL
            """
        )
    )
    op.execute(
        text(
            f"""
            UPDATE {_TM}.diagnoses
            SET code = 'dx' || replace(cast(id as text), '-', '')
            WHERE code IS NULL
            """
        )
    )

    for schema in (_GM, _TM):
        with op.batch_alter_table("diagnoses", schema=schema) as batch:
            batch.alter_column("code", existing_type=sa.String(length=64), nullable=False)
            batch.alter_column("icd10_code", existing_type=sa.String(length=16), nullable=True)
            batch.alter_column("icd_version", existing_type=sa.String(length=32), nullable=True)
            batch.alter_column("official_descriptor", existing_type=sa.String(length=512), nullable=True)
            batch.alter_column("category", existing_type=sa.String(length=64), nullable=True)

    op.create_index(
        "diagnoses_global_code_active_key",
        "diagnoses",
        ["code"],
        unique=True,
        schema=_GM,
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "diagnoses_tenant_code_active_key",
        "diagnoses",
        ["iq_tenant_id", "code"],
        unique=True,
        schema=_TM,
        postgresql_where=sa.text("NOT is_deleted"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.drop_index(
        "diagnoses_global_code_active_key",
        table_name="diagnoses",
        schema=_GM,
        if_exists=True,
    )
    op.drop_index(
        "diagnoses_tenant_code_active_key",
        table_name="diagnoses",
        schema=_TM,
        if_exists=True,
    )

    for schema in (_GM, _TM):
        with op.batch_alter_table("diagnoses", schema=schema) as batch:
            batch.drop_column("short_name")
            batch.drop_column("code")
            batch.alter_column("icd10_code", existing_type=sa.String(length=16), nullable=False)
            batch.alter_column("icd_version", existing_type=sa.String(length=32), nullable=False)
            batch.alter_column("official_descriptor", existing_type=sa.String(length=512), nullable=False)
            batch.alter_column("category", existing_type=sa.String(length=64), nullable=False)

    # Re-create ICD uniqueness (fails if NULL ICD rows exist — downgrade is best-effort).
    op.create_index(
        "diagnoses_global_icd_active_key",
        "diagnoses",
        ["icd10_code", "icd_version"],
        unique=True,
        schema=_GM,
        postgresql_where=sa.text("NOT is_deleted"),
    )
    op.create_index(
        "diagnoses_tenant_icd_active_key",
        "diagnoses",
        ["iq_tenant_id", "icd10_code", "icd_version"],
        unique=True,
        schema=_TM,
        postgresql_where=sa.text("NOT is_deleted"),
    )
