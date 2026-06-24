"""Demo authorization catalog: frontdesk, opd, shell permissions (``master_global``).

Revision ID: 030_demo_authorization_catalog
Revises: 029_add_delete_permission_catalog

Idempotent. Replaces dev-seed catalog inserts — run via ``make db-migrate`` before ``make seed``.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "030_demo_authorization_catalog"
down_revision: str | Sequence[str] | None = "029_add_delete_permission_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MODULE_FRONTDESK_ID = "66666666-6666-4666-8666-666666666601"
MODULE_OPD_ID = "a1000001-0001-4001-8001-000000000001"

_MODULE_SEEDS: tuple[tuple[str, str, str, str, str, int], ...] = (
    (
        MODULE_FRONTDESK_ID,
        "Frontdesk",
        "frontdesk",
        "Front desk registration and OPD workflows.",
        "clinical",
        1,
    ),
    (
        MODULE_OPD_ID,
        "opd",
        "opd",
        "Outpatient department visits and patients.",
        "clinical",
        1,
    ),
)

# UM user/role/capability CRUD comes from ``028`` on L2 modules (``users:read``, …).
# Demo-only product permissions (shell, visitpad, OPD, EMPI, role.assign).
# ``permissions.action`` must satisfy ``permissions_action_check``
# (create/read/update/delete/manage).
# Runtime capability actions (assign, view, access) are derived from ``permission_slug`` on UM sync.
_PERMISSION_SEEDS: tuple[tuple[str, str, str, str, str], ...] = (
    ("b1000002-0005-4001-8001-000000000005", "role.assign", "Assign role", "manage", "user-roles"),
    (
        "c1000001-0001-4001-8001-000000000001",
        "opd.visit.create",
        "Create OPD visit",
        "create",
        "opd",
    ),
    ("c1000001-0002-4001-8001-000000000002", "opd.visit.read", "Read OPD visit", "read", "opd"),
    ("c1000001-0003-4001-8001-000000000003", "opd.patient.read", "Read OPD patient", "read", "opd"),
    (
        "f1000001-0001-4001-8001-000000000001",
        "shell.access",
        "Master Data shell",
        "read",
        "master-data",
    ),
    (
        "f1000001-0002-4001-8001-000000000002",
        "visitpad.view",
        "Visitpad view",
        "read",
        "visitpad-templates",
    ),
    (
        "f1000001-0003-4001-8001-000000000003",
        "visitpad.create",
        "Visitpad create",
        "create",
        "visitpad-templates",
    ),
    (
        "f1000002-0001-4001-8001-000000000001",
        "shell.access",
        "Configurator shell",
        "read",
        "configurator",
    ),
    (
        "f1000003-0001-4001-8001-000000000001",
        "shell.access",
        "Frontdesk shell",
        "read",
        "frontdesk",
    ),
    ("f1000004-0001-4001-8001-000000000001", "empi.patient.read", "Read patient", "read", "empi"),
    (
        "f1000004-0002-4001-8001-000000000002",
        "empi.patient.create",
        "Register patient",
        "create",
        "empi",
    ),
)


def _esc(value: str) -> str:
    return value.replace("'", "''")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for module_id, name, slug, description, category, level in _MODULE_SEEDS:
        op.execute(
            f"""
            INSERT INTO master_global.modules (
                id, parent_id, name, slug, description, category, version, level,
                is_active, is_deleted, created_at, updated_at
            )
            SELECT
                '{module_id}'::uuid,
                NULL,
                '{_esc(name)}',
                '{slug}',
                '{_esc(description)}',
                '{category}',
                '1.0.0',
                {level},
                true,
                false,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM master_global.modules
                WHERE slug = '{slug}' AND NOT is_deleted
            );
            """
        )

    for perm_id, slug, name, action, module_slug in _PERMISSION_SEEDS:
        op.execute(
            f"""
            INSERT INTO master_global.permissions (
                id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
            )
            SELECT
                '{perm_id}'::uuid,
                '{_esc(name)}',
                '{slug}',
                '{action}',
                'Platform demo authorization catalog ({slug}).',
                true,
                false,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM master_global.permissions
                WHERE slug = '{slug}' AND NOT is_deleted
            );
            """
        )

        junction_slug = f"{module_slug}:{slug}"
        op.execute(
            f"""
            INSERT INTO master_global.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                '{_esc(junction_slug)}',
                m.id,
                p.id,
                false,
                true,
                false,
                now(),
                now()
            FROM master_global.modules m
            INNER JOIN master_global.permissions p
              ON p.slug = '{slug}' AND NOT p.is_deleted
            WHERE m.slug = '{module_slug}' AND NOT m.is_deleted
              AND NOT EXISTS (
                SELECT 1 FROM master_global.module_permissions mp
                WHERE mp.slug = '{_esc(junction_slug)}'
                  AND NOT mp.is_deleted
              );
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    perm_slugs = ", ".join(f"'{slug}'" for _, slug, _, _, _ in _PERMISSION_SEEDS)
    module_slugs = ", ".join(f"'{slug}'" for _, _, slug, _, _, _ in _MODULE_SEEDS)

    op.execute(
        f"""
        UPDATE master_global.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM master_global.permissions p
        WHERE mp.permission_id = p.id
          AND p.slug IN ({perm_slugs})
          AND NOT mp.is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE master_global.permissions
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({perm_slugs}) AND NOT is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE master_global.modules
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({module_slugs}) AND NOT is_deleted;
        """
    )
