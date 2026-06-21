"""Add optional ``price`` to Visitpad ``medicines`` (master_global + master_tenant).

Revision ID: 040_medicines_price
Revises: 039_registration_picklists_seed

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "040_medicines_price"
down_revision: str | Sequence[str] | None = "039_registration_picklists_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in (_GM, _TM):
        op.add_column(
            "medicines",
            sa.Column("price", sa.Float(), nullable=True),
            schema=schema,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for schema in (_GM, _TM):
        op.drop_column("medicines", "price", schema=schema)
