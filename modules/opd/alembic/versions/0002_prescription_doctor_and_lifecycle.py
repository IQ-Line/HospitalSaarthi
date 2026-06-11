"""prescription doctor_id, vitals schema version, lifecycle timestamps

Revision ID: 0002_rx_doctor_vitals
Revises: 001_prescription_schema
Create Date: 2026-06-03
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from schema_names import SCHEMA

revision: str = "0002_rx_doctor_vitals"
down_revision: Union[str, None] = "001_prescription_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, column: str) -> bool:
    return bool(
        conn.execute(
            sa.text(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_schema = :schema
                    AND table_name = 'prescriptions'
                    AND column_name = :column
                )
                """
            ),
            {"schema": SCHEMA, "column": column},
        ).scalar()
    )


def upgrade() -> None:
    conn = op.get_bind()

    if not _column_exists(conn, "doctor_id"):
        op.add_column(
            "prescriptions",
            sa.Column("doctor_id", postgresql.UUID(as_uuid=True), nullable=True),
            schema=SCHEMA,
        )

    if not _column_exists(conn, "vitals_schema_version"):
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

    if not _column_exists(conn, "cancelled_at"):
        op.add_column(
            "prescriptions",
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            schema=SCHEMA,
        )

    if not _column_exists(conn, "deleted_at"):
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
            WHERE rv.id = p.visit_id
              AND rv.iq_tenant_id = p.tenant_id
              AND p.doctor_id IS NULL
              AND rv.doctor_id IS NOT NULL
            """
        )
    )

    op.execute(sa.text(f"LOCK TABLE {SCHEMA}.prescriptions IN ACCESS EXCLUSIVE MODE"))

    remaining_null = conn.execute(
        sa.text(f"SELECT COUNT(*) FROM {SCHEMA}.prescriptions WHERE doctor_id IS NULL")
    ).scalar()
    if remaining_null and int(remaining_null) > 0:
        raise RuntimeError(
            f"Cannot enforce prescriptions.doctor_id NOT NULL: "
            f"{remaining_null} row(s) still missing doctor_id after registration.visit backfill"
        )

    nullable = conn.execute(
        sa.text(
            """
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = 'prescriptions'
              AND column_name = 'doctor_id'
            """
        ),
        {"schema": SCHEMA},
    ).scalar()
    if nullable == "YES":
        op.alter_column(
            "prescriptions",
            "doctor_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=False,
            schema=SCHEMA,
        )


def downgrade() -> None:
    conn = op.get_bind()
    if _column_exists(conn, "deleted_at"):
        op.drop_column("prescriptions", "deleted_at", schema=SCHEMA)
    if _column_exists(conn, "cancelled_at"):
        op.drop_column("prescriptions", "cancelled_at", schema=SCHEMA)
    if _column_exists(conn, "vitals_schema_version"):
        op.drop_column("prescriptions", "vitals_schema_version", schema=SCHEMA)
    if _column_exists(conn, "doctor_id"):
        op.drop_column("prescriptions", "doctor_id", schema=SCHEMA)
