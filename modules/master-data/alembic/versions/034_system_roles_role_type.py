"""Add role_type to system_roles (global + tenant).

Revision ID: 034_system_roles_role_type
Revises: 033_picklist_values_seed
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "034_system_roles_role_type"
down_revision: str | Sequence[str] | None = "033_picklist_values_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_GLOBAL = "global_master"
_TENANT = "tenant_master"


def upgrade() -> None:
    op.add_column(
        "system_roles",
        sa.Column("role_type", sa.Text(), nullable=True),
        schema=_GLOBAL,
    )
    op.add_column(
        "system_roles",
        sa.Column("role_type", sa.Text(), nullable=True),
        schema=_TENANT,
    )


def downgrade() -> None:
    op.drop_column("system_roles", "role_type", schema=_TENANT)
    op.drop_column("system_roles", "role_type", schema=_GLOBAL)
