"""add prescriptions.form_data for legacy databases missing the column

Revision ID: 0003_prescription_form_data
Revises: 0002_rx_doctor_vitals
Create Date: 2026-06-04
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from schema_names import SCHEMA
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003_prescription_form_data"
down_revision: str | None = "0002_rx_doctor_vitals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        sa.text(
            """
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = :schema
                AND table_name = 'prescriptions'
                AND column_name = 'form_data'
            )
            """
        ),
        {"schema": SCHEMA},
    ).scalar()
    if exists:
        return

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


def downgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        sa.text(
            """
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = :schema
                AND table_name = 'prescriptions'
                AND column_name = 'form_data'
            )
            """
        ),
        {"schema": SCHEMA},
    ).scalar()
    if not exists:
        return

    op.drop_column("prescriptions", "form_data", schema=SCHEMA)
