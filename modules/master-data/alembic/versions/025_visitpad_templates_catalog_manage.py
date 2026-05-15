"""Add optional `manage` permission for Visitpad templates catalog (public catalog vocabulary).

Revision ID: 025_visitpad_templates_catalog_manage
Revises: 024_visitpad_templates_module_catalog

Idempotent inserts. Does not replace 024 read/update rows; superadmin-style Cerbos rules may bind
to `visitpad-templates-catalog-manage` instead of listing every action.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "025_visitpad_templates_catalog_manage"
down_revision: str | Sequence[str] | None = "024_visitpad_templates_module_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERM_MANAGE_ID = "55555555-5555-4555-8555-555555555506"
MP_MANAGE_ID = "55555555-5555-4555-8555-555555555507"
MODULE_VISITPAD_ID = "55555555-5555-4555-8555-555555555501"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        INSERT INTO public.permissions (
            id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
        )
        SELECT
            '{PERM_MANAGE_ID}'::uuid,
            'Visitpad templates catalog manage',
            'visitpad-templates-catalog-manage',
            'manage',
            'Full Visitpad template catalog (scope resolved by Cerbos / tenant context).',
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.permissions
            WHERE slug = 'visitpad-templates-catalog-manage' AND NOT is_deleted
        );
        """
    )

    op.execute(
        f"""
        INSERT INTO public.module_permissions (
            id, slug, module_id, permission_id, is_default, is_active, is_deleted,
            created_at, updated_at
        )
        SELECT
            '{MP_MANAGE_ID}'::uuid,
            'visitpad-templates-catalog-manage',
            '{MODULE_VISITPAD_ID}'::uuid,
            (SELECT id FROM public.permissions WHERE slug = 'visitpad-templates-catalog-manage' AND NOT is_deleted LIMIT 1),
            false,
            true,
            false,
            now(),
            now()
        WHERE EXISTS (SELECT 1 FROM public.modules WHERE id = '{MODULE_VISITPAD_ID}'::uuid AND NOT is_deleted)
          AND EXISTS (
              SELECT 1 FROM public.permissions
              WHERE slug = 'visitpad-templates-catalog-manage' AND NOT is_deleted
          )
          AND NOT EXISTS (
              SELECT 1 FROM public.module_permissions
              WHERE slug = 'visitpad-templates-catalog-manage' AND NOT is_deleted
          );
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        UPDATE public.module_permissions SET is_deleted = true, updated_at = now()
        WHERE id = '{MP_MANAGE_ID}'::uuid;
        """
    )
    op.execute(
        f"""
        UPDATE public.permissions SET is_deleted = true, updated_at = now()
        WHERE id = '{PERM_MANAGE_ID}'::uuid;
        """
    )
