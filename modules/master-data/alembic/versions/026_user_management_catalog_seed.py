"""Seed User Management module catalog (public + tenant_master for dev tenant).

Revision ID: 026_um_catalog_seed
Revises: 025_visitpad_templates_catalog_manage

Idempotent. Aligns with:
- ``001_initial_schema`` module UUID for user_management
- ``@hims/dev-bootstrap`` tenant ``f47ac10b-58cc-4372-a567-0e02b2c3d480``
- UM runtime keys ``um:user:*``, ``um:role:*``, ``um:capability:read`` (catalog slugs use ``user.*`` / ``role.*``)
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "026_um_catalog_seed"
down_revision: str | Sequence[str] | None = "025_visitpad_templates_catalog_manage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MODULE_UM_ID = "11111111-1111-4111-8111-111111111111"
DEV_TENANT_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d480"

_PERMISSIONS: tuple[tuple[str, str, str, str], ...] = (
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01", "user.create", "create", "Create user"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02", "user.read", "read", "Read user"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03", "user.update", "update", "Update user"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04", "user.deactivate", "delete", "Deactivate user"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05", "role.create", "create", "Create role"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa06", "role.read", "read", "Read role"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa07", "role.update", "update", "Update role"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa08", "role.assign", "manage", "Assign role"),
    ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa09", "capability.read", "read", "Read capability catalog"),
)

_MODULE_PERMISSIONS: tuple[tuple[str, str, str], ...] = tuple(
    (f"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb{idx:02d}", perm_id, slug)
    for idx, (perm_id, slug, _action, _name) in enumerate(_PERMISSIONS, start=1)
)


def _upgrade_public() -> None:
    op.execute(
        f"""
        INSERT INTO public.modules (
            id, parent_id, name, slug, description, category, version, level,
            is_active, is_deleted, created_at, updated_at
        )
        SELECT
            '{MODULE_UM_ID}'::uuid,
            NULL,
            'user_management',
            'user-management',
            'User Management — platform users, roles, and runtime capabilities.',
            'core',
            '1.0.0',
            1,
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.modules
            WHERE id = '{MODULE_UM_ID}'::uuid OR (slug = 'user-management' AND NOT is_deleted)
        );
        """
    )

    for perm_id, slug, action, name in _PERMISSIONS:
        op.execute(
            f"""
            INSERT INTO public.permissions (
                id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
            )
            SELECT
                '{perm_id}'::uuid,
                '{name.replace("'", "''")}',
                '{slug}',
                '{action}',
                'User Management catalog permission ({slug}).',
                true,
                false,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM public.permissions
                WHERE slug = '{slug}' AND NOT is_deleted
            );
            """
        )

    for mp_id, perm_id, slug in _MODULE_PERMISSIONS:
        op.execute(
            f"""
            INSERT INTO public.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                '{mp_id}'::uuid,
                '{slug}',
                '{MODULE_UM_ID}'::uuid,
                (SELECT id FROM public.permissions WHERE slug = '{slug}' AND NOT is_deleted LIMIT 1),
                true,
                true,
                false,
                now(),
                now()
            WHERE EXISTS (
                SELECT 1 FROM public.modules WHERE id = '{MODULE_UM_ID}'::uuid AND NOT is_deleted
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.module_permissions
                WHERE module_id = '{MODULE_UM_ID}'::uuid
                  AND permission_id = (
                    SELECT id FROM public.permissions WHERE slug = '{slug}' AND NOT is_deleted LIMIT 1
                  )
                  AND NOT is_deleted
            );
            """
        )


def _upgrade_tenant_master() -> None:
    op.execute(
        f"""
        INSERT INTO tenant_master.modules (
            id, iq_tenant_id, parent_id, name, slug, description, category, version, level,
            is_active, is_deleted, created_at, updated_at
        )
        SELECT
            '{MODULE_UM_ID}'::uuid,
            '{DEV_TENANT_ID}'::uuid,
            NULL,
            'user_management',
            'user-management',
            'User Management — tenant catalog copy for local dev.',
            'core',
            '1.0.0',
            1,
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM tenant_master.modules
            WHERE iq_tenant_id = '{DEV_TENANT_ID}'::uuid
              AND slug = 'user-management'
              AND NOT is_deleted
        );
        """
    )

    for perm_id, slug, action, name in _PERMISSIONS:
        op.execute(
            f"""
            INSERT INTO tenant_master.permissions (
                id, iq_tenant_id, name, slug, action, description,
                is_active, is_deleted, created_at, updated_at
            )
            SELECT
                '{perm_id}'::uuid,
                '{DEV_TENANT_ID}'::uuid,
                '{name.replace("'", "''")}',
                '{slug}',
                '{action}',
                'User Management tenant catalog permission ({slug}).',
                true,
                false,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM tenant_master.permissions
                WHERE iq_tenant_id = '{DEV_TENANT_ID}'::uuid
                  AND slug = '{slug}'
                  AND NOT is_deleted
            );
            """
        )

    for mp_id, perm_id, slug in _MODULE_PERMISSIONS:
        op.execute(
            f"""
            INSERT INTO tenant_master.module_permissions (
                id, iq_tenant_id, slug, module_id, permission_id,
                is_default, is_active, is_deleted, created_at, updated_at
            )
            SELECT
                '{mp_id}'::uuid,
                '{DEV_TENANT_ID}'::uuid,
                '{slug}',
                '{MODULE_UM_ID}'::uuid,
                (SELECT id FROM tenant_master.permissions
                 WHERE iq_tenant_id = '{DEV_TENANT_ID}'::uuid AND slug = '{slug}' AND NOT is_deleted
                 LIMIT 1),
                true,
                true,
                false,
                now(),
                now()
            WHERE EXISTS (
                SELECT 1 FROM tenant_master.modules
                WHERE iq_tenant_id = '{DEV_TENANT_ID}'::uuid
                  AND id = '{MODULE_UM_ID}'::uuid
                  AND NOT is_deleted
            )
            AND NOT EXISTS (
                SELECT 1 FROM tenant_master.module_permissions
                WHERE iq_tenant_id = '{DEV_TENANT_ID}'::uuid
                  AND slug = '{slug}'
                  AND NOT is_deleted
            );
            """
        )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    _upgrade_public()
    _upgrade_tenant_master()


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for mp_id, _perm_id, _slug in reversed(_MODULE_PERMISSIONS):
        op.execute(f"DELETE FROM tenant_master.module_permissions WHERE id = '{mp_id}'::uuid")
        op.execute(f"DELETE FROM public.module_permissions WHERE id = '{mp_id}'::uuid")

    for perm_id, slug, _action, _name in reversed(_PERMISSIONS):
        op.execute(
            f"DELETE FROM tenant_master.permissions WHERE iq_tenant_id = '{DEV_TENANT_ID}'::uuid AND slug = '{slug}'"
        )
        op.execute(f"DELETE FROM public.permissions WHERE slug = '{slug}'")

    op.execute(
        f"""
        DELETE FROM tenant_master.modules
        WHERE iq_tenant_id = '{DEV_TENANT_ID}'::uuid AND id = '{MODULE_UM_ID}'::uuid
        """
    )
