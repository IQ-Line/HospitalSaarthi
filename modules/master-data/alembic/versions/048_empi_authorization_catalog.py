"""EMPI authorization catalog: golden-record write capabilities (``master_global``).

Revision ID: 048_empi_authorization_catalog
Revises: 047_configurator_authorization_catalog

Seeds the Master Data catalog permissions whose UM-synced runtime capability keys the EMPI
Cerbos policy gates on (``infra/cerbos/policies/empi/patient.yaml``):

    empi:patient:{update,delete}

``empi:patient:read`` and ``empi:patient:create`` are already seeded upstream by
``030_demo_authorization_catalog`` (``empi.patient.read`` / ``empi.patient.create``); this
revision only adds the two write capabilities that complete the CRUD set the golden-record PEP
enforces. ``patient.update`` gates demographic/status/identifier-link/address writes;
``patient.delete`` gates identifier removal (severing an identifier from the record).

The runtime key is ``mapMasterDataPermissionToRuntimeCapability`` of a ``module_permissions`` row:
``<moduleSlug>:<feature>:<action>`` where ``feature`` = the resource slug segments joined with
``-`` (so ``empi.patient.update`` -> ``empi:patient:update``). The ``empi`` module row is seeded
upstream (``027``); this revision only adds permissions + module_permission junctions. Idempotent
(INSERT ... WHERE NOT EXISTS). Additive — dev/pre-prod DB is disposable, no backfill.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "048_empi_authorization_catalog"
down_revision: str | Sequence[str] | None = "047_configurator_authorization_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (permission_id, permission_slug, display_name, action, module_slug)
# permission_slug -> runtime capability key (see module docstring):
#   empi.patient.update -> empi:patient:update
#   empi.patient.delete -> empi:patient:delete
_PERMISSION_SEEDS: tuple[tuple[str, str, str, str, str], ...] = (
    (
        "f1000004-0003-4001-8001-000000000003",
        "empi.patient.update",
        "Update patient",
        "update",
        "empi",
    ),
    (
        "f1000004-0004-4001-8001-000000000004",
        "empi.patient.delete",
        "Remove patient identifier",
        "delete",
        "empi",
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
                'EMPI authorization catalog ({slug}).',
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
