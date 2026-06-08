"""prescription doctor_id, vitals schema version, lifecycle timestamps

Revision ID: 0002_rx_doctor_vitals
Revises: 0001_opd_visits_prescriptions
Create Date: 2026-06-03
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from schema_names import SCHEMA

revision: str = "0002_rx_doctor_vitals"
down_revision: Union[str, None] = "0001_opd_visits_prescriptions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prescriptions",
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        "prescriptions",
        sa.Column(
            "vitals_schema_version",
            sa.SmallInteger(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        schema=SCHEMA,
    )
    op.add_column(
        "prescriptions",
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        schema=SCHEMA,
    )
    op.add_column(
        "prescriptions",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        schema=SCHEMA,
    )

    op.execute(
        sa.text(
            f"""
            UPDATE {SCHEMA}.prescriptions p
            SET doctor_id = rv.doctor_id
            FROM registration.visit rv
            WHERE rv.visit_id::uuid = p.visit_id
              AND rv.iq_tenant_id::uuid = p.tenant_id
              AND p.doctor_id IS NULL
              AND rv.doctor_id IS NOT NULL
            """
        )
    )

    op.execute(
        sa.text(
            f"""
            UPDATE {SCHEMA}.prescriptions
            SET doctor_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid
            WHERE doctor_id IS NULL
            """
        )
    )

    op.alter_column(
        "prescriptions",
        "doctor_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("prescriptions", "deleted_at", schema=SCHEMA)
    op.drop_column("prescriptions", "cancelled_at", schema=SCHEMA)
    op.drop_column("prescriptions", "vitals_schema_version", schema=SCHEMA)
    op.drop_column("prescriptions", "doctor_id", schema=SCHEMA)
