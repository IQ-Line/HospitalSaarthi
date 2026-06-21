"""Retire legacy ``visitpad-templates`` L1 catalog; anchor Visitpad under ``visitpad-master``.

Revision ID: 035_retire_visitpad_templates_catalog
Revises: 034_product_l2_catalog_modules

Soft-deletes the duplicate L1 module seeded in ``024`` / ``025`` and re-homes demo shell
permissions (``visitpad.view``, ``visitpad.create``) on ``visitpad-master`` (L2 under
``master-data``). Units, conversions, and other Visitpad catalogs remain L3+ children of
``visitpad-master`` (see ``027_core_modules_catalog``).

Also remaps ``configurator.tenant_modules`` rows that still reference the retired module id,
and rewrites ``user_management.capabilities`` keys that used the ``visitpad-templates:`` prefix.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "035_retire_visitpad_templates_catalog"
down_revision: str | Sequence[str] | None = "034_product_l2_catalog_modules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Stable ids from 024 / 025 / 030 (do not edit prior revisions).
MODULE_VISITPAD_TEMPLATES_ID = "55555555-5555-4555-8555-555555555501"
PERM_VP_CATALOG_READ_ID = "55555555-5555-4555-8555-555555555502"
PERM_VP_CATALOG_WRITE_ID = "55555555-5555-4555-8555-555555555503"
MP_VP_CATALOG_READ_ID = "55555555-5555-4555-8555-555555555504"
MP_VP_CATALOG_WRITE_ID = "55555555-5555-4555-8555-555555555505"
PERM_VP_CATALOG_MANAGE_ID = "55555555-5555-4555-8555-555555555506"
MP_VP_CATALOG_MANAGE_ID = "55555555-5555-4555-8555-555555555507"

_LEGACY_MODULE_SLUG = "visitpad-templates"
_LEGACY_PERMISSION_SLUGS: tuple[str, ...] = (
    "visitpad-templates-catalog-read",
    "visitpad-templates-catalog-write",
    "visitpad-templates-catalog-manage",
)
_SHELL_PERMISSION_SLUGS: tuple[str, ...] = ("visitpad.view", "visitpad.create")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    # L3 catalog row used by /visitpad/conversions (manifest catalogModuleSlug).
    op.execute(
        """
        INSERT INTO master_global.modules (
            id, parent_id, name, slug, description, category, version, level, icon,
            is_active, is_deleted, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            (SELECT id FROM master_global.modules
             WHERE slug = 'visitpad-master' AND NOT is_deleted
             LIMIT 1),
            'Unit conversions',
            'unit-conversions',
            'Measurement unit conversion rules.',
            'clinical',
            '1.0.0',
            3,
            NULL,
            true,
            false,
            now(),
            now()
        WHERE EXISTS (
            SELECT 1 FROM master_global.modules
            WHERE slug = 'visitpad-master' AND NOT is_deleted
        )
          AND NOT EXISTS (
            SELECT 1 FROM master_global.modules
            WHERE slug = 'unit-conversions' AND NOT is_deleted
        );
        """
    )

    for permission_slug in ("read", "create", "edit", "delete"):
        op.execute(
            f"""
            INSERT INTO master_global.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                'unit-conversions:' || '{permission_slug}',
                m.id,
                p.id,
                true,
                true,
                false,
                now(),
                now()
            FROM master_global.modules m
            CROSS JOIN master_global.permissions p
            WHERE m.slug = 'unit-conversions'
              AND NOT m.is_deleted
              AND p.slug = '{permission_slug}'
              AND NOT p.is_deleted
              AND NOT EXISTS (
                  SELECT 1 FROM master_global.module_permissions mp
                  WHERE mp.slug = 'unit-conversions:' || '{permission_slug}'
                    AND NOT mp.is_deleted
              );
            """
        )

    # Demo shell permissions (030) → visitpad-master instead of visitpad-templates.
    for perm_slug in _SHELL_PERMISSION_SLUGS:
        junction_slug = f"visitpad-master:{perm_slug}"
        op.execute(
            f"""
            UPDATE master_global.module_permissions mp
            SET is_deleted = true, updated_at = now()
            WHERE mp.permission_id IN (
                SELECT id FROM master_global.permissions
                WHERE slug = '{perm_slug}' AND NOT is_deleted
            )
              AND mp.module_id = '{MODULE_VISITPAD_TEMPLATES_ID}'::uuid
              AND NOT mp.is_deleted;
            """
        )
        op.execute(
            f"""
            INSERT INTO master_global.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                '{junction_slug}',
                vm.id,
                p.id,
                false,
                true,
                false,
                now(),
                now()
            FROM master_global.modules vm
            INNER JOIN master_global.permissions p
              ON p.slug = '{perm_slug}' AND NOT p.is_deleted
            WHERE vm.slug = 'visitpad-master' AND NOT vm.is_deleted
              AND NOT EXISTS (
                SELECT 1 FROM master_global.module_permissions mp
                WHERE mp.slug = '{junction_slug}' AND NOT mp.is_deleted
              );
            """
        )

    legacy_mp_ids = ", ".join(
        f"'{mp_id}'::uuid"
        for mp_id in (
            MP_VP_CATALOG_READ_ID,
            MP_VP_CATALOG_WRITE_ID,
            MP_VP_CATALOG_MANAGE_ID,
        )
    )
    op.execute(
        f"""
        UPDATE master_global.module_permissions
        SET is_deleted = true, updated_at = now()
        WHERE id IN ({legacy_mp_ids})
           OR module_id = '{MODULE_VISITPAD_TEMPLATES_ID}'::uuid
          AND NOT is_deleted;
        """
    )

    legacy_perm_ids = ", ".join(
        f"'{perm_id}'::uuid"
        for perm_id in (
            PERM_VP_CATALOG_READ_ID,
            PERM_VP_CATALOG_WRITE_ID,
            PERM_VP_CATALOG_MANAGE_ID,
        )
    )
    legacy_perm_slugs_sql = ", ".join(f"'{slug}'" for slug in _LEGACY_PERMISSION_SLUGS)
    op.execute(
        f"""
        UPDATE master_global.permissions
        SET is_deleted = true, updated_at = now()
        WHERE id IN ({legacy_perm_ids})
           OR slug IN ({legacy_perm_slugs_sql})
          AND NOT is_deleted;
        """
    )

    op.execute(
        f"""
        UPDATE master_global.modules
        SET is_deleted = true, updated_at = now()
        WHERE id = '{MODULE_VISITPAD_TEMPLATES_ID}'::uuid
           OR slug = '{_LEGACY_MODULE_SLUG}'
          AND NOT is_deleted;
        """
    )

    op.execute(
        f"""
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'configurator' AND table_name = 'tenant_modules'
          ) THEN
            UPDATE configurator.tenant_modules tm
            SET is_active = false, updated_at = now()
            WHERE tm.module_id = '{MODULE_VISITPAD_TEMPLATES_ID}'::uuid
              AND tm.is_active = true;

            INSERT INTO configurator.tenant_modules (
                iq_tenant_id, module_id, is_active, is_core_override, created_at, updated_at
            )
            SELECT
                legacy.iq_tenant_id,
                vm.id,
                true,
                false,
                now(),
                now()
            FROM configurator.tenant_modules legacy
            INNER JOIN master_global.modules vm
              ON vm.slug = 'visitpad-master' AND NOT vm.is_deleted
            WHERE legacy.module_id = '55555555-5555-4555-8555-555555555501'::uuid
              AND NOT legacy.is_active
              AND NOT EXISTS (
                SELECT 1 FROM configurator.tenant_modules existing
                WHERE existing.iq_tenant_id = legacy.iq_tenant_id
                  AND existing.module_id = vm.id
              );
          END IF;
        END $$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'user_management' AND table_name = 'capabilities'
          ) THEN
            UPDATE user_management.capabilities
            SET capability_key = replace(capability_key, 'visitpad-templates:', 'visitpad-master:'),
                module = CASE
                  WHEN module = 'visitpad-templates' THEN 'visitpad-master'
                  ELSE module
                END,
                updated_at = now()
            WHERE capability_key LIKE 'visitpad-templates:%';
          END IF;
        END $$;
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        UPDATE master_global.modules
        SET is_deleted = false, updated_at = now()
        WHERE id = '{MODULE_VISITPAD_TEMPLATES_ID}'::uuid
           OR slug = '{_LEGACY_MODULE_SLUG}';
        """
    )

    op.execute(
        f"""
        UPDATE master_global.permissions
        SET is_deleted = false, updated_at = now()
        WHERE id IN (
            '{PERM_VP_CATALOG_READ_ID}'::uuid,
            '{PERM_VP_CATALOG_WRITE_ID}'::uuid,
            '{PERM_VP_CATALOG_MANAGE_ID}'::uuid
        );
        """
    )

    op.execute(
        f"""
        UPDATE master_global.module_permissions
        SET is_deleted = false, updated_at = now()
        WHERE id IN (
            '{MP_VP_CATALOG_READ_ID}'::uuid,
            '{MP_VP_CATALOG_WRITE_ID}'::uuid,
            '{MP_VP_CATALOG_MANAGE_ID}'::uuid
        );
        """
    )

    op.execute(
        """
        UPDATE master_global.modules
        SET is_deleted = true, updated_at = now()
        WHERE slug = 'unit-conversions' AND NOT is_deleted;
        """
    )
