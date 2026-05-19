"""Align modules with schema-reference.json (LLD catalog).

Revision ID: 002_extend_modules_catalog
Revises: 001_initial_schema
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM

revision: str = "002_extend_modules_catalog"
down_revision: str | Sequence[str] | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "modules",
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema=_GM,
    )
    op.add_column(
        "modules",
        sa.Column(
            "slug",
            sa.Text(),
            nullable=False,
            server_default="_placeholder_",
        ),
        schema=_GM,
    )
    op.add_column(
        "modules",
        sa.Column("description", sa.Text(), nullable=True),
        schema=_GM,
    )
    op.add_column(
        "modules",
        sa.Column(
            "level",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        schema=_GM,
    )
    op.add_column(
        "modules",
        sa.Column("icon", sa.Text(), nullable=True),
        schema=_GM,
    )
    op.add_column(
        "modules",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        schema=_GM,
    )

    # Citus reference tables: backfill every row (no WHERE) so slugs are unique before the constraint.
    op.execute(
        sa.text(
            f"""
        UPDATE {_GM}.modules
        SET slug = lower(replace(trim(name), '_', '-'))
        """
        )
    )

    op.alter_column(
        "modules",
        "slug",
        existing_type=sa.Text(),
        server_default=None,
        schema=_GM,
    )

    op.create_check_constraint(
        "modules_level_check",
        "modules",
        "level >= 1 AND level <= 4",
        schema=_GM,
    )

    op.create_foreign_key(
        "modules_parent_id_fkey",
        source_table="modules",
        referent_table="modules",
        local_cols=["parent_id"],
        remote_cols=["id"],
        ondelete="RESTRICT",
        source_schema=_GM,
        referent_schema=_GM,
    )

    op.create_unique_constraint(
        "modules_slug_key",
        "modules",
        ["slug"],
        schema=_GM,
    )
    op.create_index(
        "idx_modules_parent",
        "modules",
        ["parent_id"],
        schema=_GM,
    )
    op.create_index(
        "idx_modules_category",
        "modules",
        ["category"],
        schema=_GM,
    )

    op.execute(
        sa.text(
            f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN
                PERFORM create_reference_table('{_GM}.modules');
            END IF;
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END $$;
        """
        )
    )


def downgrade() -> None:
    op.drop_index("idx_modules_category", table_name="modules", schema=_GM)
    op.drop_index("idx_modules_parent", table_name="modules", schema=_GM)
    op.drop_constraint("modules_slug_key", "modules", type_="unique", schema=_GM)

    op.drop_constraint(
        "modules_parent_id_fkey",
        "modules",
        type_="foreignkey",
        schema=_GM,
    )
    op.drop_constraint("modules_level_check", "modules", type_="check", schema=_GM)

    op.drop_column("modules", "is_active", schema=_GM)
    op.drop_column("modules", "icon", schema=_GM)
    op.drop_column("modules", "level", schema=_GM)
    op.drop_column("modules", "description", schema=_GM)
    op.drop_column("modules", "slug", schema=_GM)
    op.drop_column("modules", "parent_id", schema=_GM)
