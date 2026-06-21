"""Create ``master_tenant`` tables for platform catalog (modules, permissions, system_roles, module_permissions).

Each table mirrors ``master_global`` plus ``iq_tenant_id`` (UUID) and tenant-scoped partial unique indexes.
Rows start empty; global catalog remains in ``master_global``.

Revision ID: 012_tm_platform_catalog (≤32 chars for ``alembic_version.version_num``).
Revises: 011_tenant_master_visitpad

Chain order: all ``master_global``-only revisions through ``010`` run first; ``011`` performs Visitpad dual-schema
(data copy before ``master_global`` reshape); **this** revision adds platform ``master_tenant`` tables only after ``011``.

SQLite / non-PostgreSQL: no-op (tests use ORM ``create_all`` only).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "012_tm_platform_catalog"
down_revision: str | Sequence[str] | None = "011_tenant_master_visitpad"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(sa.text(f"CREATE SCHEMA IF NOT EXISTS {_TM}"))

    op.create_table(
        "modules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("icon", sa.Text(), nullable=True),
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
        sa.CheckConstraint(
            "category IN ('core', 'clinical', 'administrative', 'support')",
            name="tm_modules_category_check",
        ),
        sa.CheckConstraint("level >= 1 AND level <= 10", name="tm_modules_level_check"),
        schema=_TM,
    )
    op.create_foreign_key(
        "tm_modules_parent_id_fkey",
        "modules",
        "modules",
        ["parent_id"],
        ["id"],
        source_schema=_TM,
        referent_schema=_TM,
        ondelete="RESTRICT",
    )
    op.create_index("tm_idx_modules_parent", "modules", ["parent_id"], schema=_TM)
    op.create_index("tm_idx_modules_category", "modules", ["category"], schema=_TM)
    op.create_index("tm_idx_modules_is_deleted", "modules", ["is_deleted"], schema=_TM)
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_modules_name_active_key
        ON {_TM}.modules (iq_tenant_id, name)
        WHERE NOT is_deleted
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_modules_slug_active_key
        ON {_TM}.modules (iq_tenant_id, slug)
        WHERE NOT is_deleted
        """
    )

    op.create_table(
        "permissions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("action", sa.String(length=16), nullable=False),
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
        sa.CheckConstraint(
            "action IN ('create', 'read', 'update', 'delete', 'manage')",
            name="tm_permissions_action_check",
        ),
        schema=_TM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_permissions_slug_active_key
        ON {_TM}.permissions (iq_tenant_id, slug)
        WHERE NOT is_deleted
        """
    )

    op.create_table(
        "system_roles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("is_template", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        schema=_TM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_system_roles_slug_active_key
        ON {_TM}.system_roles (iq_tenant_id, slug)
        WHERE NOT is_deleted
        """
    )

    op.create_table(
        "module_permissions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
        schema=_TM,
    )
    op.create_foreign_key(
        "tm_module_permissions_module_id_fkey",
        "module_permissions",
        "modules",
        ["module_id"],
        ["id"],
        source_schema=_TM,
        referent_schema=_TM,
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "tm_module_permissions_permission_id_fkey",
        "module_permissions",
        "permissions",
        ["permission_id"],
        ["id"],
        source_schema=_TM,
        referent_schema=_TM,
        ondelete="RESTRICT",
    )
    op.create_index(
        "tm_idx_module_permissions_module",
        "module_permissions",
        ["module_id"],
        schema=_TM,
    )
    op.create_index(
        "tm_idx_module_permissions_permission",
        "module_permissions",
        ["permission_id"],
        schema=_TM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_module_permissions_slug_active_key
        ON {_TM}.module_permissions (iq_tenant_id, slug)
        WHERE NOT is_deleted
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_module_permissions_module_permission_active_key
        ON {_TM}.module_permissions (iq_tenant_id, module_id, permission_id)
        WHERE NOT is_deleted
        """
    )

    for qualified in (
        f"{_TM}.modules",
        f"{_TM}.permissions",
        f"{_TM}.system_roles",
        f"{_TM}.module_permissions",
    ):
        op.execute(
            sa.text(
                f"""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN
                        PERFORM create_reference_table('{qualified}');
                    END IF;
                EXCEPTION
                    WHEN duplicate_object THEN
                        NULL;
                END $$;
                """
            )
        )


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade for master_tenant platform catalog migration is not supported.",
    )
