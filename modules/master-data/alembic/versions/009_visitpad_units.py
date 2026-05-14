"""Create ``units`` and ``unit_conversions`` in the default (``public``) schema.

Revision ID: 009_visitpad_units
Revises: 008_module_permissions

Platform-global catalog rows use ``tenant_id`` (application supplies platform UUID).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "009_visitpad_units"
down_revision: str | Sequence[str] | None = "008_module_permissions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "units",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("display_label", sa.String(length=256), nullable=False),
        sa.Column("dimension", sa.String(length=32), nullable=False),
        sa.Column("ucum_code", sa.String(length=64), nullable=True),
        sa.Column("is_canonical", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
    )
    op.create_index(
        "ix_visitpad_units_tenant_display_order",
        "units",
        ["tenant_id", "display_order", "code"],
        unique=False,
    )
    op.create_index(
        "units_tenant_code_active_key",
        "units",
        ["tenant_id", "code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
    )

    op.create_table(
        "unit_conversions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_unit_code", sa.String(length=64), nullable=False),
        sa.Column("to_unit_code", sa.String(length=64), nullable=False),
        sa.Column("factor", sa.Double(), nullable=False),
        sa.Column("offset_value", sa.Double(), nullable=False, server_default=sa.text("0")),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
    )
    op.create_index(
        "ix_visitpad_unit_conversions_tenant_order",
        "unit_conversions",
        ["tenant_id", "display_order", "from_unit_code"],
        unique=False,
    )
    op.create_index(
        "unit_conversions_tenant_from_to_active_key",
        "unit_conversions",
        ["tenant_id", "from_unit_code", "to_unit_code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
    )


def downgrade() -> None:
    op.drop_table("unit_conversions")
    op.drop_table("units")
