"""Create Master Data modules registry.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-05-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001_initial_schema"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CORE_MODULES = [
    {
        "id": "11111111-1111-4111-8111-111111111111",
        "name": "user_management",
        "category": "core",
        "version": "1.0.0",
    },
    {
        "id": "22222222-2222-4222-8222-222222222222",
        "name": "configurator",
        "category": "core",
        "version": "1.0.0",
    },
    {
        "id": "33333333-3333-4333-8333-333333333333",
        "name": "empi",
        "category": "core",
        "version": "1.0.0",
    },
    {
        "id": "44444444-4444-4444-8444-444444444444",
        "name": "master_data",
        "category": "core",
        "version": "1.0.0",
    },
]


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS master_data")
    op.create_table(
        "modules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
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
        sa.CheckConstraint(
            "category IN ('core', 'clinical', 'administrative', 'support')",
            name="modules_category_check",
        ),
        sa.UniqueConstraint("name", name="modules_name_key"),
        schema="master_data",
    )

    modules_table = sa.table(
        "modules",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("category", sa.String),
        sa.column("version", sa.String),
        schema="master_data",
    )
    op.bulk_insert(modules_table, CORE_MODULES)

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN
                PERFORM create_reference_table('master_data.modules');
            END IF;
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END $$;
        """
    )


def downgrade() -> None:
    op.drop_table("modules", schema="master_data")
