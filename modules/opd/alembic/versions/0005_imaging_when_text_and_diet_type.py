"""add prescription parity columns: imaging when_text + medical-history diet_type

Revision ID: 0005_rx_when_diet
Revises: 0004_opd_iq_tenant_id
Create Date: 2026-06-29

Two Create-RX form fields had no normalized column and were dropped on a
normalized round-trip (they survived only inside the legacy ``form_data`` blob):

- ``imagingRequired[].byWhen`` -> ``prescription_ordered_imaging.when_text``
  (free text; distinct from the typed ``due_by`` the OPD form never populates)
- ``medicalHistory.dietType`` -> ``prescription_medical_histories.diet_type``

Adding the columns lets the normalized ``/prescriptions`` family capture these
fields on the create/update -> read round-trip, so the FE cutover off the JSONB
family preserves what the doctor typed. NOTE: the clinical-report/PDF path is a
separate concern — its report mappers do not yet project ``diet_type`` (and never
projected imaging ``byWhen``); wiring those is a gated step of the JSONB retirement,
not this migration. See docs/architecture/cleanup/opd-prescription-api-comparison.md.

PostgreSQL only: SQLite (test) databases are built from the ORM models, which map
these columns directly, so no migration step is required there. Each column is
added behind an ``information_schema`` existence check, so the revision is
idempotent and safe to re-run against a partially migrated database.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from schema_names import SCHEMA

from alembic import op

revision: str = "0005_rx_when_diet"
down_revision: str | Sequence[str] | None = "0004_opd_iq_tenant_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(conn, table: str, column: str) -> bool:
    return bool(
        conn.execute(
            sa.text(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_schema = :schema
                    AND table_name = :table
                    AND column_name = :column
                )
                """
            ),
            {"schema": SCHEMA, "table": table, "column": column},
        ).scalar()
    )


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return

    if not _column_exists(conn, "prescription_ordered_imaging", "when_text"):
        op.add_column(
            "prescription_ordered_imaging",
            sa.Column("when_text", sa.String(length=256), nullable=True),
            schema=SCHEMA,
        )
    if not _column_exists(conn, "prescription_medical_histories", "diet_type"):
        op.add_column(
            "prescription_medical_histories",
            sa.Column("diet_type", sa.String(length=64), nullable=True),
            schema=SCHEMA,
        )


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return

    if _column_exists(conn, "prescription_medical_histories", "diet_type"):
        op.drop_column("prescription_medical_histories", "diet_type", schema=SCHEMA)
    if _column_exists(conn, "prescription_ordered_imaging", "when_text"):
        op.drop_column("prescription_ordered_imaging", "when_text", schema=SCHEMA)
