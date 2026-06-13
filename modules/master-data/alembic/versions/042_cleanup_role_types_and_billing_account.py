"""Deactivate legacy role-type picklist values and hide billing-account module.

Revision ID: 042_cleanup_role_types_and_billing_account
Revises: 041_merge_pharmacy_master_data_heads, 041_opd_free_follow_up_picklist

- Retire superseded role-types picklist keys (admin, tenant-admin, superadmin).
- Re-assert is_global only on super_admin and tenant_admin.
- Set billing-account catalog module to inactive (not yet product-ready).
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "042_cleanup_role_types_and_billing_account"
down_revision: str | Sequence[str] | None = (
    "041_merge_pharmacy_master_data_heads",
    "041_opd_free_follow_up_picklist",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        UPDATE global_master.picklist_values pv
        SET is_active = false, updated_at = now()
        FROM global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value IN ('admin', 'tenant-admin', 'superadmin');
        """
    )

    op.execute(
        """
        UPDATE global_master.picklist_values pv
        SET is_global = true
        FROM global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.is_active = true
          AND pv.value IN ('super_admin', 'tenant_admin');
        """
    )

    op.execute(
        """
        UPDATE global_master.picklist_values pv
        SET is_global = false
        FROM global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.is_active = true
          AND pv.value NOT IN ('super_admin', 'tenant_admin');
        """
    )

    op.execute(
        """
        UPDATE global_master.modules
        SET is_active = false, updated_at = now()
        WHERE slug = 'billing-account'
          AND is_deleted = false;
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        UPDATE global_master.modules
        SET is_active = true, updated_at = now()
        WHERE slug = 'billing-account'
          AND is_deleted = false;
        """
    )

    op.execute(
        """
        UPDATE global_master.picklist_values pv
        SET is_active = true, updated_at = now()
        FROM global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value IN ('admin', 'tenant-admin', 'superadmin');
        """
    )
