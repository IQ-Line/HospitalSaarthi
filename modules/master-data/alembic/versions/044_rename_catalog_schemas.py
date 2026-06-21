"""Rename catalog schemas: ``global_master`` → ``master_global``, ``tenant_master`` → ``master_tenant``.

Revision ID: 044_rename_catalog_schemas
Revises: 043_platform_role_types_super_admin_and_admin

Issue #91: rename the master-data dual-catalog schemas to the ``master_*`` prefix so the
namespace reads consistently with the module (``master_global`` / ``master_tenant``).

The schema names come from constants (``schema_names.py`` / ``app.core.catalog_schemas``),
already swapped to ``master_global`` / ``master_tenant``. On a **fresh** database every
revision (and ``env.py``'s ``_ensure_catalog_schemas``) creates the new names directly, so
this revision is a **no-op** there. On an **existing** database (already at ``043`` with the
old ``global_master`` / ``tenant_master`` schemas) this revision performs the in-place
``ALTER SCHEMA … RENAME``. Both arms are guarded by an ``information_schema.schemata`` check,
so re-running is idempotent and never errors when a schema is already at its target name.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "044_rename_catalog_schemas"
down_revision: str | Sequence[str] | None = "043_platform_role_types_super_admin_and_admin"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.schemata
                WHERE schema_name = 'global_master'
            ) THEN
                EXECUTE 'ALTER SCHEMA global_master RENAME TO master_global';
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.schemata
                WHERE schema_name = 'tenant_master'
            ) THEN
                EXECUTE 'ALTER SCHEMA tenant_master RENAME TO master_tenant';
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.schemata
                WHERE schema_name = 'master_global'
            ) THEN
                EXECUTE 'ALTER SCHEMA master_global RENAME TO global_master';
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.schemata
                WHERE schema_name = 'master_tenant'
            ) THEN
                EXECUTE 'ALTER SCHEMA master_tenant RENAME TO tenant_master';
            END IF;
        END $$;
        """
    )
