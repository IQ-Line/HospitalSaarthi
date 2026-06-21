"""Link L2+ catalog modules to platform permissions in ``master_global.module_permissions``.

Revision ID: 028_core_module_permissions_catalog
Revises: 027_core_modules_catalog

L1 modules have no junction rows. Every active module with ``level >= 2`` gets
``read``, ``create``, ``edit``, and ``delete`` links (from ``026``).

Junction slug: ``{module_slug}:{permission_slug}``.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "028_core_module_permissions_catalog"
down_revision: str | Sequence[str] | None = "027_core_modules_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for permission_slug in _PERMISSION_SLUGS:
        op.execute(
            f"""
            INSERT INTO master_global.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                m.slug || ':' || '{permission_slug}',
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
              AND p.slug = '{permission_slug}'
              AND NOT p.is_deleted
              AND NOT EXISTS (
                  SELECT 1 FROM master_global.module_permissions mp
                  WHERE mp.slug = m.slug || ':' || '{permission_slug}'
                    AND NOT mp.is_deleted
              );
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    permission_slugs_sql = ", ".join(f"'{slug}'" for slug in _PERMISSION_SLUGS)
    op.execute(
        f"""
        UPDATE master_global.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM master_global.modules m, master_global.permissions p
        WHERE mp.module_id = m.id
          AND mp.permission_id = p.id
          AND m.level >= 2
          AND NOT mp.is_deleted
          AND p.slug IN ({permission_slugs_sql})
          AND NOT p.is_deleted;
        """
    )
