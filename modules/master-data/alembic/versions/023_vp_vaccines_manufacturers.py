"""Add Visitpad ``vaccines`` and ``manufacturers`` in ``public`` and ``tenant_master``.

Revision ID: 023_vp_vaccines_manufacturers
Revises: 022_tm_iq_tenant_uuid

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "023_vp_vaccines_manufacturers"
down_revision: str | Sequence[str] | None = "022_tm_iq_tenant_uuid"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TM = "tenant_master"


def _stamp_cols() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    ]


def _catalog_cols(*, tenant: bool) -> list[sa.Column]:
    cols: list[sa.Column] = [
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
    ]
    if tenant:
        cols.append(
            sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        )
    cols.extend(
        [
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("short_name", sa.String(length=120), nullable=True),
            sa.Column("display_name", sa.String(length=512), nullable=False),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        ],
    )
    cols.extend(_stamp_cols())
    return cols


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(text(f"CREATE SCHEMA IF NOT EXISTS {_TM}"))

    # --- vaccines ---
    op.create_table("vaccines", *_catalog_cols(tenant=False), schema="public")
    op.create_index(
        "vaccines_global_code_active_key",
        "vaccines",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )

    op.create_table("vaccines", *_catalog_cols(tenant=True), schema=_TM)
    op.create_index(
        "vaccines_tenant_code_active_key",
        "vaccines",
        ["iq_tenant_id", "code"],
        unique=True,
        schema=_TM,
        postgresql_where=sa.text("NOT is_deleted"),
    )

    # --- manufacturers ---
    op.create_table("manufacturers", *_catalog_cols(tenant=False), schema="public")
    op.create_index(
        "manufacturers_global_code_active_key",
        "manufacturers",
        ["code"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("NOT is_deleted"),
    )

    op.create_table("manufacturers", *_catalog_cols(tenant=True), schema=_TM)
    op.create_index(
        "manufacturers_tenant_code_active_key",
        "manufacturers",
        ["iq_tenant_id", "code"],
        unique=True,
        schema=_TM,
        postgresql_where=sa.text("NOT is_deleted"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.drop_index("manufacturers_tenant_code_active_key", table_name="manufacturers", schema=_TM)
    op.drop_table("manufacturers", schema=_TM)
    op.drop_index("manufacturers_global_code_active_key", table_name="manufacturers", schema="public")
    op.drop_table("manufacturers", schema="public")

    op.drop_index("vaccines_tenant_code_active_key", table_name="vaccines", schema=_TM)
    op.drop_table("vaccines", schema=_TM)
    op.drop_index("vaccines_global_code_active_key", table_name="vaccines", schema="public")
    op.drop_table("vaccines", schema="public")
