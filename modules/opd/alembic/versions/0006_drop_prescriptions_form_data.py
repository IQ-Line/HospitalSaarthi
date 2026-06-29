"""drop the legacy prescriptions.form_data JSONB column

Revision ID: 0006_drop_prescriptions_form_data
Revises: 0005_rx_when_diet
Create Date: 2026-06-29

The phase-0 JSONB ``opd.prescriptions.form_data`` blob is retired. The normalized
``/prescriptions`` REST family is now the sole writer/reader of clinical content
(typed child tables); the legacy ``/visits`` + ``/patients`` JSONB API and its
repo/bundle are deleted; the ABDM-M2 pipeline sources form_data from the aggregate
(``build_form_data_from_prescription_model``); and the clinical-report path reads the
typed clinical payload. No code references the column anymore.

This drops the column. ``downgrade`` re-creates it with its original definition
(JSONB NOT NULL DEFAULT ``'{}'``) but CANNOT restore data — the blob is gone. The
application has never gone live, so there is no production data to preserve.

PostgreSQL only: SQLite (test) databases are built from the ORM models, which no
longer map ``form_data``, so there is nothing to drop there. Guarded by an
``information_schema`` existence check, so the revision is idempotent.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from schema_names import SCHEMA
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006_drop_prescriptions_form_data"
down_revision: str | Sequence[str] | None = "0005_rx_when_diet"
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

    if _column_exists(conn, "prescriptions", "form_data"):
        op.drop_column("prescriptions", "form_data", schema=SCHEMA)


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return

    if not _column_exists(conn, "prescriptions", "form_data"):
        op.add_column(
            "prescriptions",
            sa.Column(
                "form_data",
                postgresql.JSONB(),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            schema=SCHEMA,
        )
