"""Add soft-delete and optional audit UUIDs to modules (ERD / DB principles).

Revision ID: 003_soft_delete_audit (≤32 chars for alembic_version.version_num)
Revises: 002_extend_modules_catalog
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003_soft_delete_audit"
down_revision: str | Sequence[str] | None = "002_extend_modules_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Catalog uses soft-delete only (no hard DELETE in application flows).
    op.add_column(
        "modules",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # UUID identifiers only — no FK to user_management (cross-schema rule).
    op.add_column(
        "modules",
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "modules",
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "idx_modules_is_deleted",
        "modules",
        ["is_deleted"],
    )


def downgrade() -> None:
    op.drop_index("idx_modules_is_deleted", table_name="modules")
    op.drop_column("modules", "updated_by")
    op.drop_column("modules", "created_by")
    op.drop_column("modules", "is_deleted")
