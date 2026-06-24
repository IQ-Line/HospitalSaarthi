"""Add ``delete`` permission and L2+ module_permissions links (for DBs that ran \
``026``/``028`` before delete existed).

Revision ID: 029_add_delete_permission_catalog
Revises: 028_core_module_permissions_catalog

Idempotent: safe if ``026``/``028`` were updated and re-run, or if this is the only missing piece.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "029_add_delete_permission_catalog"
down_revision: str | Sequence[str] | None = "028_core_module_permissions_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        INSERT INTO master_global.permissions (
            id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            'Delete',
            'delete',
            'delete',
            'Soft-delete Master Data platform catalog rows.',
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM master_global.permissions
            WHERE slug = 'delete' AND NOT is_deleted
        );
        """
    )

    op.execute(
        """
        INSERT INTO master_global.module_permissions (
            id, slug, module_id, permission_id, is_default, is_active, is_deleted,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            m.slug || ':' || 'delete',
            m.id,
            p.id,
            true,
            true,
            false,
            now(),
            now()
        FROM master_global.modules m
        CROSS JOIN master_global.permissions p
        WHERE m.level >= 2
          AND NOT m.is_deleted
          AND p.slug = 'delete'
          AND NOT p.is_deleted
          AND NOT EXISTS (
              SELECT 1 FROM master_global.module_permissions mp
              WHERE mp.slug = m.slug || ':' || 'delete'
                AND NOT mp.is_deleted
          );
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        UPDATE master_global.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM master_global.modules m, master_global.permissions p
        WHERE mp.module_id = m.id
          AND mp.permission_id = p.id
          AND m.level >= 2
          AND NOT mp.is_deleted
          AND p.slug = 'delete'
          AND NOT p.is_deleted;
        """
    )
    op.execute(
        """
        UPDATE master_global.permissions SET is_deleted = true, updated_at = now()
        WHERE slug = 'delete' AND NOT is_deleted;
        """
    )
