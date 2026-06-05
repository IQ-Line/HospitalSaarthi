"""Integration Hub platform catalog (``global_master``).

Revision ID: 040_integration_hub_catalog
Revises: 039_registration_picklists_seed

Seeds L1 ``integration`` module and product permissions for control-plane administration.
Runtime capability keys (e.g. ``integration:integration:read``) are projected into UM via sync.

Idempotent by ``slug``.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "040_integration_hub_catalog"
down_revision: str | Sequence[str] | None = "039_registration_picklists_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MODULE_INTEGRATION_ID = "d1000001-0001-4001-8001-000000000001"

_MODULE_SEEDS: tuple[tuple[str, str, str, str, str, int], ...] = (
    (
        MODULE_INTEGRATION_ID,
        "Integration Hub",
        "integration",
        "Partner integrations, API keys, and inbound gateway administration.",
        "core",
        1,
    ),
)

# (id, slug, name, permissions.action, description_suffix)
# ``permissions.action`` must satisfy ``permissions_action_check``.
# Runtime actions (activate, issue, …) are derived from dotted ``slug`` on UM sync.
_PERMISSION_SEEDS: tuple[tuple[str, str, str, str, str], ...] = (
    ("d1000002-0001-4001-8001-000000000001", "integration.read", "Read integrations", "read", "integration"),
    ("d1000002-0002-4001-8001-000000000002", "integration.create", "Create integrations", "create", "integration"),
    ("d1000002-0003-4001-8001-000000000003", "integration.update", "Update integrations", "update", "integration"),
    ("d1000002-0004-4001-8001-000000000004", "integration.delete", "Delete integrations", "delete", "integration"),
    ("d1000002-0005-4001-8001-000000000005", "integration.activate", "Activate integrations", "manage", "integration"),
    ("d1000002-0006-4001-8001-000000000006", "integration.disable", "Disable integrations", "manage", "integration"),
    ("d1000002-0007-4001-8001-000000000007", "integration.reactivate", "Reactivate integrations", "manage", "integration"),
    ("d1000003-0001-4001-8001-000000000001", "api-key.read", "Read API keys", "read", "integration"),
    ("d1000003-0002-4001-8001-000000000002", "api-key.issue", "Issue API keys", "manage", "integration"),
    ("d1000003-0003-4001-8001-000000000003", "api-key.revoke", "Revoke API keys", "delete", "integration"),
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
            INSERT INTO global_master.modules (
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
                SELECT 1 FROM global_master.modules
                WHERE slug = '{slug}' AND NOT is_deleted
            );
            """
        )

    for perm_id, slug, name, action, module_slug in _PERMISSION_SEEDS:
        op.execute(
            f"""
            INSERT INTO global_master.permissions (
                id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
            )
            SELECT
                '{perm_id}'::uuid,
                '{_esc(name)}',
                '{slug}',
                '{action}',
                'Integration Hub control plane ({slug}).',
                true,
                false,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM global_master.permissions
                WHERE slug = '{slug}' AND NOT is_deleted
            );
            """
        )

        junction_slug = f"{module_slug}:{slug}"
        op.execute(
            f"""
            INSERT INTO global_master.module_permissions (
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
            FROM global_master.modules m
            INNER JOIN global_master.permissions p
              ON p.slug = '{slug}' AND NOT p.is_deleted
            WHERE m.slug = '{module_slug}' AND NOT m.is_deleted
              AND NOT EXISTS (
                SELECT 1 FROM global_master.module_permissions mp
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
        UPDATE global_master.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM global_master.permissions p
        WHERE mp.permission_id = p.id
          AND p.slug IN ({perm_slugs})
          AND NOT mp.is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE global_master.permissions
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({perm_slugs}) AND NOT is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE global_master.modules
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({module_slugs}) AND NOT is_deleted;
        """
    )
