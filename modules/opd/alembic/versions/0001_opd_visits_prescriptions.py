"""visits and prescriptions (form_data JSONB phase-0)

Revision ID: 0001_opd_visits_prescriptions
Revises:
Create Date: 2026-06-01
"""

from __future__ import annotations

import sys
from collections.abc import Sequence
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from schema_names import SCHEMA

revision: str = "0001_opd_visits_prescriptions"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(name: str) -> bool:
    return name in inspect(op.get_bind()).get_table_names(schema=SCHEMA)


def _index_exists(table: str, index: str) -> bool:
    indexes = inspect(op.get_bind()).get_indexes(table, schema=SCHEMA)
    return any(ix["name"] == index for ix in indexes)


def upgrade() -> None:
    op.execute(sa.text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))

    if not _table_exists("visits"):
        op.create_table(
            "visits",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                primary_key=True,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("status", sa.Text(), nullable=False, server_default="in_progress"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            schema=SCHEMA,
        )
    if not _index_exists("visits", "ix_opd_visits_tenant_patient_updated"):
        op.create_index(
            "ix_opd_visits_tenant_patient_updated",
            "visits",
            ["tenant_id", "patient_id", "updated_at"],
            schema=SCHEMA,
        )

    if not _table_exists("prescriptions"):
        op.create_table(
            "prescriptions",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                primary_key=True,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("visit_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
            sa.Column(
                "form_data",
                postgresql.JSONB(),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.ForeignKeyConstraint(["visit_id"], [f"{SCHEMA}.visits.id"], ondelete="CASCADE"),
            schema=SCHEMA,
        )
    if not _index_exists("prescriptions", "ix_opd_prescriptions_visit_id"):
        op.create_index(
            "ix_opd_prescriptions_visit_id",
            "prescriptions",
            ["visit_id"],
            unique=True,
            schema=SCHEMA,
        )
    if not _index_exists("prescriptions", "ix_opd_prescriptions_tenant_patient"):
        op.create_index(
            "ix_opd_prescriptions_tenant_patient",
            "prescriptions",
            ["tenant_id", "patient_id"],
            schema=SCHEMA,
        )


def downgrade() -> None:
    op.drop_index("ix_opd_prescriptions_tenant_patient", table_name="prescriptions", schema=SCHEMA)
    op.drop_index("ix_opd_prescriptions_visit_id", table_name="prescriptions", schema=SCHEMA)
    op.drop_table("prescriptions", schema=SCHEMA)
    op.drop_index("ix_opd_visits_tenant_patient_updated", table_name="visits", schema=SCHEMA)
    op.drop_table("visits", schema=SCHEMA)
