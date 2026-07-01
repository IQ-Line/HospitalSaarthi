"""Master Data authorization catalog: catalog-admin write capabilities (``master_global``).

Revision ID: 046_master_data_authorization_catalog
Revises: 045_opd_authorization_catalog

Seeds the catalog permissions whose UM-synced runtime keys the master-data Cerbos policies
(``infra/cerbos/policies/master_data/*.yaml``) gate on:

    master-data:{module,permission,system-role,module-permission,department}:{create,update,delete}

Only WRITE capabilities are seeded — catalog reads are identity-gate-only (authenticated, not
capability-gated), so no read cap is needed. Runtime key derivation
(``mapMasterDataPermissionToRuntimeCapability``): ``<module>:<feature>:<action>`` where the
resource slug segments join with ``-`` (e.g. ``master-data.system.role.create`` ->
``master-data:system-role:create``). The ``master-data`` module row is seeded upstream (``027``);
this revision adds permissions + module_permission junctions only. Idempotent, additive.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "046_master_data_authorization_catalog"
down_revision: str | Sequence[str] | None = "045_opd_authorization_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_MODULE_SLUG = "master-data"

# (uuid_block, permission_slug_prefix, display_noun) — one per catalog.
_CATALOGS: tuple[tuple[str, str, str], ...] = (
    ("e1000001", "master-data.module", "module"),
    ("e1000002", "master-data.permission", "permission"),
    ("e1000003", "master-data.system.role", "system role"),
    ("e1000004", "master-data.module.permission", "module-permission"),
    ("e1000005", "master-data.department", "department"),
)
# (uuid_digit, action, display_verb)
_ACTIONS: tuple[tuple[str, str, str], ...] = (
    ("1", "create", "Create"),
    ("2", "update", "Update"),
    ("3", "delete", "Delete"),
)

# (permission_id, permission_slug, display_name, action, module_slug)
_PERMISSION_SEEDS: tuple[tuple[str, str, str, str, str], ...] = tuple(
    (
        f"{block}-000{digit}-4001-8001-00000000000{digit}",
        f"{prefix}.{action}",
        f"{verb} {noun}",
        action,
        _MODULE_SLUG,
    )
    for (block, prefix, noun) in _CATALOGS
    for (digit, action, verb) in _ACTIONS
)


def _esc(value: str) -> str:
    return value.replace("'", "''")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

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
                'Master Data authorization catalog ({slug}).',
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
