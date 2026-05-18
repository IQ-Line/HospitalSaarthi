"""Align modules with schema-reference.json (LLD catalog).

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
    )
    op.add_column(
        "modules",
        sa.Column("slug", sa.Text(), nullable=True),
    )
    op.add_column(
        "modules",
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.add_column(
        "modules",
        sa.Column(
            "level",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )
    op.add_column(
        "modules",
        sa.Column("icon", sa.Text(), nullable=True),
    )
    op.add_column(
        "modules",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    # Slug from machine name: replace underscores with hyphens (fallback when name is empty).
    op.execute(
        """
        UPDATE public.modules
        SET slug = replace(
          coalesce(nullif(trim(name), ''), id::text),
          '_',
          '-'
        )
        WHERE slug IS NULL
        """
    )

    op.alter_column(
        "modules",
        "slug",
        existing_type=sa.Text(),
        nullable=False,
    )

    op.create_check_constraint(
        "modules_level_check",
        "modules",
        "level >= 1 AND level <= 4",
    )

    op.create_foreign_key(
        "modules_parent_id_fkey",
        source_table="modules",
        referent_table="modules",
        local_cols=["parent_id"],
        remote_cols=["id"],
        ondelete="RESTRICT",
    )

    op.create_unique_constraint(
        "modules_slug_key",
        "modules",
        ["slug"],
    )
    op.create_index(
        "idx_modules_parent",
        "modules",
        ["parent_id"],
    )
    op.create_index(
        "idx_modules_category",
        "modules",
        ["category"],
    )


def downgrade() -> None:
    op.drop_index("idx_modules_category", table_name="modules")
    op.drop_index("idx_modules_parent", table_name="modules")
    op.drop_constraint("modules_slug_key", "modules", type_="unique")

    op.drop_constraint(
        "modules_parent_id_fkey",
        "modules",
        type_="foreignkey",
    )
    op.drop_constraint("modules_level_check", "modules", type_="check")

    op.drop_column("modules", "is_active")
    op.drop_column("modules", "icon")
    op.drop_column("modules", "level")
    op.drop_column("modules", "description")
    op.drop_column("modules", "slug")
    op.drop_column("modules", "parent_id")
