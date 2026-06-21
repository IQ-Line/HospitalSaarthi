"""Add module_permissions junction table (`master_global.module_permissions`).

Revision ID: 008_module_permissions
Revises: 007_system_roles_catalog

Partial unique indexes: ``slug`` and ``(module_id, permission_id)`` among active rows only.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "008_module_permissions"
down_revision: str | Sequence[str] | None = "007_system_roles_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "module_permissions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
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
        schema=_GM,
    )

    op.create_foreign_key(
        "module_permissions_module_id_fkey",
        "module_permissions",
        "modules",
        ["module_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "module_permissions_permission_id_fkey",
        "module_permissions",
        "permissions",
        ["permission_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_index(
        "idx_module_permissions_module",
        "module_permissions",
        ["module_id"],
        schema=_GM,
    )
    op.create_index(
        "idx_module_permissions_permission",
        "module_permissions",
        ["permission_id"],
        schema=_GM,
    )

    op.execute(
        """
        CREATE UNIQUE INDEX module_permissions_slug_active_key
        ON module_permissions (slug)
        WHERE NOT is_deleted
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX module_permissions_module_permission_active_key
        ON module_permissions (module_id, permission_id)
        WHERE NOT is_deleted
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN
                PERFORM create_reference_table('master_global.module_permissions');
            END IF;
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END $$;
        """
    )


def downgrade() -> None:
    op.drop_index(
        "module_permissions_module_permission_active_key",
        table_name="module_permissions",
        schema=_GM,
    )
    op.drop_index(
        "module_permissions_slug_active_key",
        table_name="module_permissions",
        schema=_GM,
    )
    op.drop_index(
        "idx_module_permissions_permission",
        table_name="module_permissions",
        schema=_GM,
    )
    op.drop_index(
        "idx_module_permissions_module",
        table_name="module_permissions",
        schema=_GM,
    )
    op.drop_table("module_permissions")
