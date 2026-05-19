"""Add ``departments`` catalog tables to ``global_master`` and ``tenant_master``.

Revision ID: 026_departments_catalog
Revises: 025_visitpad_templates_catalog_manage
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "026_departments_catalog"
down_revision: str | Sequence[str] | None = "025_visitpad_templates_catalog_manage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEPARTMENT_COLUMNS = (
    sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    ),
    sa.Column("name", sa.String(length=200), nullable=False),
    sa.Column("code", sa.String(length=64), nullable=False),
    sa.Column("type", sa.String(length=32), nullable=False),
    sa.Column("description", sa.Text(), nullable=True),
    sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
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
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.create_table(
        "departments",
        *_DEPARTMENT_COLUMNS,
        sa.CheckConstraint(
            "type IN ('clinical', 'diagnostic', 'administrative', 'support')",
            name="departments_type_check",
        ),
        schema=_GM,
    )
    op.create_index("idx_departments_type", "departments", ["type"], schema=_GM)
    op.create_index("idx_departments_is_deleted", "departments", ["is_deleted"], schema=_GM)
    op.execute(
        f"""
        CREATE UNIQUE INDEX departments_code_active_key
        ON {_GM}.departments (code)
        WHERE NOT is_deleted
        """
    )
    op.execute(
        f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN
                PERFORM create_reference_table('{_GM}.departments');
            END IF;
        END $$;
        """
    )

    op.execute(sa.text(f"CREATE SCHEMA IF NOT EXISTS {_TM}"))
    op.create_table(
        "departments",
        *_DEPARTMENT_COLUMNS,
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.CheckConstraint(
            "type IN ('clinical', 'diagnostic', 'administrative', 'support')",
            name="tm_departments_type_check",
        ),
        schema=_TM,
    )
    op.create_index("tm_idx_departments_type", "departments", ["type"], schema=_TM)
    op.create_index("tm_idx_departments_is_deleted", "departments", ["is_deleted"], schema=_TM)
    op.create_index("tm_idx_departments_iq_tenant_id", "departments", ["iq_tenant_id"], schema=_TM)
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_departments_code_active_key
        ON {_TM}.departments (iq_tenant_id, code)
        WHERE NOT is_deleted
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.drop_table("departments", schema=_TM)
    op.drop_table("departments", schema=_GM)
