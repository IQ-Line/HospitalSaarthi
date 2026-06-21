"""Create ``master_global.picklist_values`` catalog table.

Revision ID: 032_picklist_values_catalog
Revises: 031_picklist_catalog_seed

Values for picklist domains (``category_id`` → ``picklist.id``).
Unique on ``(category_id, value)``.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM

revision: str = "032_picklist_values_catalog"
down_revision: str | Sequence[str] | None = "031_picklist_catalog_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "picklist_values",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "display_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            [f"{_GM}.picklist.id"],
            name="picklist_values_category_id_fkey",
            ondelete="RESTRICT",
        ),
        schema=_GM,
    )

    op.execute(
        f"""
        CREATE UNIQUE INDEX uq_picklist_values_category_value
        ON {_GM}.picklist_values (category_id, value)
        """
    )
    op.execute(
        f"""
        CREATE INDEX idx_picklist_values_category
        ON {_GM}.picklist_values (category_id)
        """
    )
    op.execute(
        f"""
        CREATE INDEX idx_picklist_values_order
        ON {_GM}.picklist_values (category_id, display_order)
        """
    )

    op.execute(
        f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN
                PERFORM create_reference_table('{_GM}.picklist_values');
            END IF;
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(f"DROP INDEX IF EXISTS {_GM}.idx_picklist_values_order")
    op.execute(f"DROP INDEX IF EXISTS {_GM}.idx_picklist_values_category")
    op.execute(f"DROP INDEX IF EXISTS {_GM}.uq_picklist_values_category_value")
    op.drop_table("picklist_values", schema=_GM)
