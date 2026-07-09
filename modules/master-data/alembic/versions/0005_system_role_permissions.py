"""Create the system_role↔permission junction tables (master_global + master_tenant).

Completes the system-role catalog surface: ``system_roles`` (a role template) and
``permissions`` (an action on a resource) already ship, but nothing linked the two. This
junction records which permissions a system-role template carries, mirroring the existing
``module_permissions`` shape one level up. It is a CRUD-managed catalog table — NOT consumed
by User Management's Phase 1.5 runtime (UM still seeds its own roles/role_capabilities via the
dev tools); this is catalog completeness only.

DDL is frozen (generated once from the models, following the 0003 inventory convention) so this
revision is an immutable snapshot. Both tables register as Citus **reference** tables when
running on Citus (a no-op on plain Postgres); their FK parents (system_roles, permissions) are
already reference tables from 0001, so the Citus FK-colocation rule holds.

The junction ships **empty**: like ``system_roles`` itself, rows are created through the admin
CRUD API rather than seeded. (The only extant role→permission mapping lives in the TS dev-seed
tool; wiring the migration to that would couple this Python module to a tools constant and inject
role rows the 0001 baseline never had — premature for a table no runtime consumes yet.)

Revision ID: 0005_system_role_permissions
Revises: 0004_catalog_index_alignment
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0005_system_role_permissions"
down_revision: str | Sequence[str] | None = "0004_catalog_index_alignment"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TABLES: tuple[str, ...] = (
    """CREATE TABLE master_global.system_role_permissions (
    id UUID NOT NULL,
    slug TEXT NOT NULL,
    system_role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    is_default BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(system_role_id) REFERENCES master_global.system_roles (id) ON DELETE RESTRICT,
    FOREIGN KEY(permission_id) REFERENCES master_global.permissions (id) ON DELETE RESTRICT
)""",
    """CREATE TABLE master_tenant.system_role_permissions (
    id UUID NOT NULL,
    iq_tenant_id UUID NOT NULL,
    slug TEXT NOT NULL,
    system_role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    is_default BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(system_role_id) REFERENCES master_tenant.system_roles (id) ON DELETE RESTRICT,
    FOREIGN KEY(permission_id) REFERENCES master_tenant.permissions (id) ON DELETE RESTRICT
)""",
)

_INDEXES: tuple[str, ...] = (
    "CREATE UNIQUE INDEX system_role_permissions_slug_active_key ON master_global.system_role_permissions (slug) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX system_role_permissions_role_permission_active_key ON master_global.system_role_permissions (system_role_id, permission_id) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_system_role_permissions_slug_active_key ON master_tenant.system_role_permissions (iq_tenant_id, slug) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_system_role_permissions_role_permission_active_key ON master_tenant.system_role_permissions (iq_tenant_id, system_role_id, permission_id) WHERE NOT is_deleted",
)

# Qualified names in creation order — reference-table registration and drops both use this.
_QUALIFIED: tuple[str, ...] = (
    "master_global.system_role_permissions",
    "master_tenant.system_role_permissions",
)


def upgrade() -> None:
    bind = op.get_bind()
    for stmt in _TABLES:
        bind.exec_driver_sql(stmt)
    for stmt in _INDEXES:
        bind.exec_driver_sql(stmt)
    # Register as Citus reference tables when running on Citus; no-op on plain Postgres.
    for qualified in _QUALIFIED:
        bind.exec_driver_sql(
            "DO $$ BEGIN "
            "IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN "
            f"PERFORM create_reference_table('{qualified}'); "
            "END IF; END $$;"
        )


def downgrade() -> None:
    bind = op.get_bind()
    for qualified in reversed(_QUALIFIED):
        bind.exec_driver_sql(f"DROP TABLE IF EXISTS {qualified} CASCADE")
