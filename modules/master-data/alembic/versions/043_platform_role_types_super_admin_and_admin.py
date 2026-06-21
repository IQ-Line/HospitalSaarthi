"""Align platform role-types: super_admin + admin (not tenant_admin).

Revision ID: 043_platform_role_types_super_admin_and_admin
Revises: 042_cleanup_role_types_and_billing_account

Platform super-admin role creation uses ``super_admin`` and ``admin`` (Administrator).
``tenant_admin`` is a hospital-scoped type (tenant login), not a platform global type.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "043_platform_role_types_super_admin_and_admin"
down_revision: str | Sequence[str] | None = "042_cleanup_role_types_and_billing_account"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_active = true, is_global = true, updated_at = now()
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value = 'admin';
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_global = false, updated_at = now()
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value = 'tenant_admin';
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_active = false, updated_at = now()
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value IN ('tenant-admin', 'superadmin');
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_global = true, updated_at = now()
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.is_active = true
          AND pv.value IN ('super_admin', 'admin');
        """
    )

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_global = false, updated_at = now()
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.is_active = true
          AND pv.value NOT IN ('super_admin', 'admin');
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        UPDATE master_global.picklist_values pv
        SET is_global = true, updated_at = now()
        FROM master_global.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value = 'tenant_admin';
        """
    )
