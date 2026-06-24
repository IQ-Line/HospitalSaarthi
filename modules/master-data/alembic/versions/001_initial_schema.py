"""Create Master Data modules registry.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-05-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from schema_names import GLOBAL_SCHEMA as _GM
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001_initial_schema"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(sa.text(f"CREATE SCHEMA IF NOT EXISTS {_GM}"))

    op.create_table(
        "modules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            # gen_random_uuid() is built-in from PostgreSQL 13+ (no uuid-ossp extension).
            server_default=sa.text("gen_random_uuid()"),
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
        schema=_GM,
    )

    # Core module rows are seeded in ``027_core_modules_catalog`` (after catalog columns exist).
    # Citus: create_reference_table runs in 002 after slug backfill (UPDATE before replicate).


def downgrade() -> None:
    op.drop_table("modules", schema=_GM)
