"""Configurator authorization catalog: platform-provisioning capabilities (``master_global``).

Revision ID: 047_configurator_authorization_catalog
Revises: 046_master_data_authorization_catalog

Seeds the catalog permissions whose UM-synced runtime keys the configurator Cerbos policies
(``infra/cerbos/policies/configurator/*.yaml``) gate on. Configurator exposes cross-tenant
platform-admin data, so READS are authorization decisions too and are capability-gated
(unlike master-data's broadly-readable reference catalog whose reads are identity-only).

Runtime key derivation (``mapMasterDataPermissionToRuntimeCapability``): the leading module
segment is dropped and the remaining resource segments join with ``-`` ->
``configurator:<feature>:<action>``. e.g. ``configurator.tenant.module.create`` ->
``configurator:tenant-module:create``; ``configurator.sequence.configuration.update`` ->
``configurator:sequence-configuration:update``. The ``configurator`` module row is seeded
upstream (``027``); this revision adds permissions + module_permission junctions only.
Idempotent, additive.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "047_configurator_authorization_catalog"
down_revision: str | Sequence[str] | None = "046_master_data_authorization_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_MODULE_SLUG = "configurator"

# (dotted_permission_prefix, display_noun, actions)
#   the dotted prefix is chosen so the UM mapper yields the exact runtime capability key the
#   Cerbos policy gates on. Permission ids are gen_random_uuid() (the slug is the natural key the
#   module_permissions junction + UM sync join on — no hardcoded id is ever referenced, and a
#   hardcoded block risks colliding with an existing catalog permission's primary key).
_ACTION_VERB: dict[str, str] = {
    "create": "Create",
    "read": "Read",
    "update": "Update",
    "delete": "Delete",
}

_RESOURCES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("configurator.organization", "organization", ("create", "read", "update")),
    ("configurator.tenant", "tenant", ("create", "update")),
    ("configurator.tenant.module", "tenant module", ("create", "read", "update", "delete")),
    (
        "configurator.tenant.integration.profile",
        "tenant integration profile",
        ("create", "read", "update", "delete"),
    ),
    ("configurator.sequence.configuration", "sequence configuration", ("read", "update")),
    ("configurator.tenant.api.key", "tenant api key", ("create", "read", "update")),
    ("configurator.branding", "branding", ("create",)),
    ("configurator.tenant.onboarding", "tenant onboarding", ("create",)),
)

# (permission_slug, display_name, action, module_slug)
_PERMISSION_SEEDS: tuple[tuple[str, str, str, str], ...] = tuple(
    (
        f"{prefix}.{action}",
        f"{_ACTION_VERB[action]} {noun}",
        action,
        _MODULE_SLUG,
    )
    for (prefix, noun, actions) in _RESOURCES
    for action in actions
)


def _esc(value: str) -> str:
    return value.replace("'", "''")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for slug, name, action, module_slug in _PERMISSION_SEEDS:
        op.execute(
            f"""
            INSERT INTO master_global.permissions (
                id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                '{_esc(name)}',
                '{slug}',
                '{action}',
                'Configurator authorization catalog ({slug}).',
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

    perm_slugs = ", ".join(f"'{slug}'" for slug, _, _, _ in _PERMISSION_SEEDS)

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
