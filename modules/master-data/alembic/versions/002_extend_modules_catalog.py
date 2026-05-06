"""Align master_data.modules with schema-reference.json (LLD catalog).

Revision ID: 002_extend_modules_catalog
Revises: 001_initial_schema
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002_extend_modules_catalog"
down_revision: str | Sequence[str] | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # New nullable columns first (slug backfilled before NOT NULL).
    op.add_column(
        "modules",
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="master_data",
    )
    op.add_column(
        "modules",
        sa.Column("slug", sa.Text(), nullable=True),
        schema="master_data",
    )
    op.add_column(
        "modules",
        sa.Column("description", sa.Text(), nullable=True),
        schema="master_data",
    )
    op.add_column(
        "modules",
        sa.Column(
            "level",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        schema="master_data",
    )
    op.add_column(
        "modules",
        sa.Column("icon", sa.Text(), nullable=True),
        schema="master_data",
    )
    op.add_column(
        "modules",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        schema="master_data",
    )

    # Slug from machine name: replace underscores with hyphens.
    op.execute(
        """
        UPDATE master_data.modules
        SET slug = replace(name, '_', '-')
        WHERE slug IS NULL
        """
    )

    op.alter_column(
        "modules",
        "slug",
        existing_type=sa.Text(),
        nullable=False,
        schema="master_data",
    )

    op.create_check_constraint(
        "modules_level_check",
        "modules",
        "level >= 1 AND level <= 4",
        schema="master_data",
    )

    op.create_foreign_key(
        "modules_parent_id_fkey",
        source_table="modules",
        referent_table="modules",
        local_cols=["parent_id"],
        remote_cols=["id"],
        source_schema="master_data",
        referent_schema="master_data",
        ondelete="RESTRICT",
    )

    op.create_unique_constraint(
        "modules_slug_key",
        "modules",
        ["slug"],
        schema="master_data",
    )
    op.create_index(
        "idx_modules_parent",
        "modules",
        ["parent_id"],
        schema="master_data",
    )
    op.create_index(
        "idx_modules_category",
        "modules",
        ["category"],
        schema="master_data",
    )


def downgrade() -> None:
    op.drop_index("idx_modules_category", table_name="modules", schema="master_data")
    op.drop_index("idx_modules_parent", table_name="modules", schema="master_data")
    op.drop_constraint("modules_slug_key", "modules", schema="master_data", type_="unique")

    op.drop_constraint(
        "modules_parent_id_fkey",
        "modules",
        schema="master_data",
        type_="foreignkey",
    )
    op.drop_constraint("modules_level_check", "modules", schema="master_data", type_="check")

    op.drop_column("modules", "is_active", schema="master_data")
    op.drop_column("modules", "icon", schema="master_data")
    op.drop_column("modules", "level", schema="master_data")
    op.drop_column("modules", "description", schema="master_data")
    op.drop_column("modules", "slug", schema="master_data")
    op.drop_column("modules", "parent_id", schema="master_data")
