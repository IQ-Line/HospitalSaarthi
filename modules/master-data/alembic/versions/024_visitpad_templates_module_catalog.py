"""Seed Visitpad templates module + permissions + module_permissions (``master_global`` catalog).

Revision ID: 024_visitpad_templates_module_catalog
Revises: 023_vp_vaccines_manufacturers

Idempotent inserts for fresh Postgres DBs. Skipped on non-PostgreSQL (ORM create_all tests).
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "024_visitpad_templates_module_catalog"
down_revision: str | Sequence[str] | None = "023_vp_vaccines_manufacturers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Stable UUIDs for catalog rows (deterministic across environments).
MODULE_VISITPAD_ID = "55555555-5555-4555-8555-555555555501"
PERM_CATALOG_READ_ID = "55555555-5555-4555-8555-555555555502"
PERM_CATALOG_WRITE_ID = "55555555-5555-4555-8555-555555555503"
MP_READ_ID = "55555555-5555-4555-8555-555555555504"
MP_WRITE_ID = "55555555-5555-4555-8555-555555555505"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        INSERT INTO master_global.modules (
            id, parent_id, name, slug, description, category, version, level, icon,
            is_active, is_deleted, created_at, updated_at
        )
        SELECT
            '{MODULE_VISITPAD_ID}'::uuid,
            NULL,
            'visitpad_templates',
            'visitpad-templates',
            'Visitpad clinical templates (units, vitals, picklists).',
            'clinical',
            '1.0.0',
            1,
            NULL,
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM master_global.modules
            WHERE slug = 'visitpad-templates' AND NOT is_deleted
        );
        """
    )

    op.execute(
        f"""
        INSERT INTO master_global.permissions (
            id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
        )
        SELECT
            '{PERM_CATALOG_READ_ID}'::uuid,
            'Visitpad catalog read',
            'visitpad-templates-catalog-read',
            'read',
            'Read Visitpad template catalog.',
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM master_global.permissions
            WHERE slug = 'visitpad-templates-catalog-read' AND NOT is_deleted
        );
        """
    )

    op.execute(
        f"""
        INSERT INTO master_global.permissions (
            id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
        )
        SELECT
            '{PERM_CATALOG_WRITE_ID}'::uuid,
            'Visitpad catalog write',
            'visitpad-templates-catalog-write',
            'update',
            'Create or update Visitpad template catalog rows.',
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM master_global.permissions
            WHERE slug = 'visitpad-templates-catalog-write' AND NOT is_deleted
        );
        """
    )

    op.execute(
        f"""
        INSERT INTO master_global.module_permissions (
            id, slug, module_id, permission_id, is_default, is_active, is_deleted,
            created_at, updated_at
        )
        SELECT
            '{MP_READ_ID}'::uuid,
            'visitpad-templates-catalog-read',
            '{MODULE_VISITPAD_ID}'::uuid,
            (SELECT id FROM master_global.permissions WHERE slug = 'visitpad-templates-catalog-read' AND NOT is_deleted LIMIT 1),
            true,
            true,
            false,
            now(),
            now()
        WHERE EXISTS (SELECT 1 FROM master_global.modules WHERE id = '{MODULE_VISITPAD_ID}'::uuid AND NOT is_deleted)
          AND EXISTS (
              SELECT 1 FROM master_global.permissions
              WHERE slug = 'visitpad-templates-catalog-read' AND NOT is_deleted
          )
          AND NOT EXISTS (
              SELECT 1 FROM master_global.module_permissions
              WHERE slug = 'visitpad-templates-catalog-read' AND NOT is_deleted
          );
        """
    )

    op.execute(
        f"""
        INSERT INTO master_global.module_permissions (
            id, slug, module_id, permission_id, is_default, is_active, is_deleted,
            created_at, updated_at
        )
        SELECT
            '{MP_WRITE_ID}'::uuid,
            'visitpad-templates-catalog-write',
            '{MODULE_VISITPAD_ID}'::uuid,
            (SELECT id FROM master_global.permissions WHERE slug = 'visitpad-templates-catalog-write' AND NOT is_deleted LIMIT 1),
            true,
            true,
            false,
            now(),
            now()
        WHERE EXISTS (SELECT 1 FROM master_global.modules WHERE id = '{MODULE_VISITPAD_ID}'::uuid AND NOT is_deleted)
          AND EXISTS (
              SELECT 1 FROM master_global.permissions
              WHERE slug = 'visitpad-templates-catalog-write' AND NOT is_deleted
          )
          AND NOT EXISTS (
              SELECT 1 FROM master_global.module_permissions
              WHERE slug = 'visitpad-templates-catalog-write' AND NOT is_deleted
          );
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        UPDATE master_global.module_permissions SET is_deleted = true, updated_at = now()
        WHERE id IN ('{MP_READ_ID}'::uuid, '{MP_WRITE_ID}'::uuid);
        """
    )
    op.execute(
        f"""
        UPDATE master_global.permissions SET is_deleted = true, updated_at = now()
        WHERE id IN ('{PERM_CATALOG_READ_ID}'::uuid, '{PERM_CATALOG_WRITE_ID}'::uuid);
        """
    )
    op.execute(
        f"""
        UPDATE master_global.modules SET is_deleted = true, updated_at = now()
        WHERE id = '{MODULE_VISITPAD_ID}'::uuid;
        """
    )
