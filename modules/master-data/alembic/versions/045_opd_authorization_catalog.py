"""OPD authorization catalog: prescription + health-document capabilities (``master_global``).

Revision ID: 045_opd_authorization_catalog
Revises: 044_rename_catalog_schemas

Seeds the Master Data catalog permissions whose UM-synced runtime capability keys the new
OPD Cerbos policies gate on (``infra/cerbos/policies/opd/*.yaml``):

    opd:prescription:{create,read,update,delete}   opd:health-document:{create,read}

The runtime key is ``mapMasterDataPermissionToRuntimeCapability`` of a ``module_permissions``
row: ``<moduleSlug>:<feature>:<action>`` where ``feature`` = the resource slug segments joined
with ``-`` (so ``opd.health.document.read`` -> ``opd:health-document:read``). ``finalize``/
``cancel`` are update-class transitions and reuse ``opd:prescription:update`` (no own key).

The ``opd`` module row is seeded by ``030_demo_authorization_catalog`` (upstream); this revision
only adds permissions + module_permission junctions. Idempotent (INSERT ... WHERE NOT EXISTS).
Additive — dev/pre-prod DB is disposable, no backfill.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "045_opd_authorization_catalog"
down_revision: str | Sequence[str] | None = "044_rename_catalog_schemas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (permission_id, permission_slug, display_name, action, module_slug)
# permission_slug -> runtime capability key (see module docstring):
#   opd.prescription.read      -> opd:prescription:read
#   opd.health.document.read   -> opd:health-document:read
_PERMISSION_SEEDS: tuple[tuple[str, str, str, str, str], ...] = (
    (
        "d1000001-0001-4001-8001-000000000001",
        "opd.prescription.create",
        "Create OPD prescription",
        "create",
        "opd",
    ),
    (
        "d1000001-0002-4001-8001-000000000002",
        "opd.prescription.read",
        "Read OPD prescription",
        "read",
        "opd",
    ),
    (
        "d1000001-0003-4001-8001-000000000003",
        "opd.prescription.update",
        "Update OPD prescription",
        "update",
        "opd",
    ),
    (
        "d1000001-0004-4001-8001-000000000004",
        "opd.prescription.delete",
        "Delete OPD prescription",
        "delete",
        "opd",
    ),
    (
        "d1000002-0001-4001-8001-000000000001",
        "opd.health.document.create",
        "Upload OPD health document",
        "create",
        "opd",
    ),
    (
        "d1000002-0002-4001-8001-000000000002",
        "opd.health.document.read",
        "Read OPD health document",
        "read",
        "opd",
    ),
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
                'OPD authorization catalog ({slug}).',
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
