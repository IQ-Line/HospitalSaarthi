"""Add role_type and module_permission_ids to system_roles (global + tenant).

Revision ID: 034_system_roles_role_type
Revises: 033_picklist_values_seed
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "034_system_roles_role_type"
down_revision: str | Sequence[str] | None = "033_picklist_values_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_GLOBAL = "global_master"
_TENANT = "tenant_master"


def _add_columns(schema: str) -> None:
    op.add_column(
        "system_roles",
        sa.Column("role_type", sa.Text(), nullable=True),
        schema=schema,
    )
    op.add_column(
        "system_roles",
        sa.Column(
            "module_permission_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=True,
        ),
        schema=schema,
    )


def _drop_columns(schema: str) -> None:
    op.drop_column("system_roles", "module_permission_ids", schema=schema)
    op.drop_column("system_roles", "role_type", schema=schema)


def upgrade() -> None:
    _add_columns(_GLOBAL)
    _add_columns(_TENANT)


def downgrade() -> None:
    _drop_columns(_TENANT)
    _drop_columns(_GLOBAL)
