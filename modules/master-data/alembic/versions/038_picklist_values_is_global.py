"""Rename picklist_values.is_default → is_global and align role-types seeds.

Revision ID: 038_picklist_values_is_global
Revises: 037_module_visibility_scope

- Column ``is_global``: platform-wide role types (super_admin, tenant_admin) vs tenant staff types.
- Normalizes legacy ``superadmin`` / ``super-admin`` → ``super_admin``.
- Inserts ``tenant_admin`` when missing.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "038_picklist_values_is_global"
down_revision: str | Sequence[str] | None = "037_module_visibility_scope"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        ALTER TABLE master_global.picklist_values
        RENAME COLUMN is_default TO is_global;
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET value = 'super_admin', is_global = true
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value IN ('superadmin', 'super-admin', 'super_admin');
        """
    )

    op.execute(
        """
        INSERT INTO master_global.picklist_values (
            id, category_id, value, label, description, metadata,
            is_active, is_global, display_order, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            p.id,
            'tenant_admin',
            'Tenant Admin',
            NULL,
            NULL,
            true,
            true,
            9,
            now(),
            now()
        FROM master_global.picklist p
        WHERE p.slug = 'role-types'
          AND NOT p.is_deleted
          AND NOT EXISTS (
              SELECT 1 FROM master_global.picklist_values pv
              WHERE pv.category_id = p.id
                AND pv.value = 'tenant_admin'
          );
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_global = true
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value IN ('super_admin', 'tenant_admin');
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_global = false
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value NOT IN ('super_admin', 'tenant_admin');
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        DELETE FROM master_global.picklist_values pv
        USING master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND pv.value = 'tenant_admin';
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET value = 'superadmin'
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND pv.value = 'super_admin';
        """
    )

    op.execute(
        """
        ALTER TABLE master_global.picklist_values
        RENAME COLUMN is_global TO is_default;
        """
    )
