"""Dedupe role-types picklist values to hyphenated platform role codes.

Revision ID: 039_picklist_role_types_hyphen_dedupe
Revises: 038_picklist_values_is_global

Fixes databases that already ran an earlier 038 revision that inserted ``tenant_admin``
while 033 had seeded ``tenant-admin``, and renamed ``super-admin`` → ``super_admin``.
Idempotent: safe on fresh installs after the corrected 038.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "039_picklist_role_types_hyphen_dedupe"
down_revision: str | Sequence[str] | None = "038_picklist_values_is_global"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        """
        DELETE FROM global_master.picklist_values pv
        USING global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value IN ('superadmin', 'super_admin')
          AND EXISTS (
              SELECT 1 FROM global_master.picklist_values pv2
              WHERE pv2.category_id = p.id
                AND pv2.value = 'super-admin'
          );
        """
    )

    op.execute(
        """
        UPDATE global_master.picklist_values pv
        SET value = 'super-admin', is_global = true
        FROM global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value IN ('superadmin', 'super_admin');
        """
    )

    op.execute(
        """
        DELETE FROM global_master.picklist_values pv
        USING global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value = 'tenant_admin'
          AND EXISTS (
              SELECT 1 FROM global_master.picklist_values pv2
              WHERE pv2.category_id = p.id
                AND pv2.value = 'tenant-admin'
          );
        """
    )

    op.execute(
        """
        UPDATE global_master.picklist_values pv
        SET value = 'tenant-admin', is_global = true
        FROM global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = 'role-types'
          AND NOT p.is_deleted
          AND pv.value = 'tenant_admin';
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
          AND pv.value IN ('super-admin', 'tenant-admin');
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
          AND pv.value NOT IN ('super-admin', 'tenant-admin');
        """
    )


def downgrade() -> None:
    pass
