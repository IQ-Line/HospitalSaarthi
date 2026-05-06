"""Widen modules.level check from 4 to 10 (nested catalog depth).

Revision ID: 005_level_max_10
Revises: 004_partial_unique
"""

from collections.abc import Sequence

from alembic import op

revision: str = "005_level_max_10"
down_revision: str | Sequence[str] | None = "004_partial_unique"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("modules_level_check", "modules", schema="master_data", type_="check")
    op.create_check_constraint(
        "modules_level_check",
        "modules",
        "level >= 1 AND level <= 10",
        schema="master_data",
    )


def downgrade() -> None:
    op.drop_constraint("modules_level_check", "modules", schema="master_data", type_="check")
    op.create_check_constraint(
        "modules_level_check",
        "modules",
        "level >= 1 AND level <= 4",
        schema="master_data",
    )
