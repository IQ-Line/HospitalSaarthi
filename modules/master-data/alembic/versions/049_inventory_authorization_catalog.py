"""Inventory authorization catalog: L1 module + operational capabilities (``master_global``).

Revision ID: 049_inventory_authorization_catalog
Revises: 048_empi_authorization_catalog

Seeds the Master Data catalog rows whose UM-synced runtime capability keys the inventory
Cerbos policies (``infra/cerbos/policies/inventory/*.yaml``) gate on::

    inventory:store:{read,create,update}      inventory:item:{read,create}
    inventory:grn:{read,create,update}        inventory:stock:{read}
    inventory:indent:{read,create,update}     inventory:transfer:{read,create}

Runtime-key derivation (``mapMasterDataPermissionToRuntimeCapability``): a
``module_permissions`` row maps to ``<moduleSlug>:<feature>:<action>`` where ``feature`` is the
resource slug segments joined with ``-`` (so ``inventory.store.read`` -> ``inventory:store:read``).
Workflow transitions (indent submit/approve/reject/cancel/fulfill, GRN submit/line-replace/
document-upload) are update-class and reuse the resource ``.update`` capability — no bespoke key,
mirroring the OPD ``prescription.finalize``/``cancel`` convention.

RE-EXPRESSED CONTENT — the inventory L1/L2 module tree originally shipped by origin/dev
(alembic 044-047, ``git rm``'d during the dev--improved-v1 reconciliation because they targeted the
pre-rename ``global_master`` schema; see
``docs/architecture/cleanup/absorbed-inventory-catalog-migrations.md``) is NOT restored verbatim
here. This revision seeds only what the PEP needs today: the L1 ``inventory`` module plus
**feature-scoped** permissions hung directly off it (the OPD/master-data house pattern of
``045``/``046``), rather than origin/dev's L2 workflow sub-modules with generic CRUD junctions.
That keeps capability sync honest (one module the junctions reference) and the capability keys
clean. The Wave-4 squash-to-baseline will consolidate the full module tree + reference masters.

Idempotent (INSERT ... WHERE NOT EXISTS). Additive — dev/pre-prod DB is disposable, no backfill.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "049_inventory_authorization_catalog"
down_revision: str | Sequence[str] | None = "048_empi_authorization_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_MODULE_SLUG = "inventory"
_MODULE_ID = "a9000000-0000-4001-8001-000000000001"

# (module_id, name, slug, description, category, level)
_MODULE_SEEDS: tuple[tuple[str, str, str, str, str, int], ...] = (
    (
        _MODULE_ID,
        "Inventory",
        _MODULE_SLUG,
        "Operational inventory — stores, items, GRN, stock, indents, and transfers.",
        "administrative",
        1,
    ),
)

# (permission_id, permission_slug, display_name, action) — module is always ``inventory``.
# permission_slug -> runtime capability key (see module docstring):
#   inventory.store.read     -> inventory:store:read
#   inventory.transfer.create -> inventory:transfer:create
_PERMISSION_SEEDS: tuple[tuple[str, str, str, str], ...] = (
    (
        "a9000001-0001-4001-8001-000000000001",
        "inventory.store.read",
        "Read inventory store",
        "read",
    ),
    (
        "a9000001-0002-4001-8001-000000000002",
        "inventory.store.create",
        "Create inventory store",
        "create",
    ),
    (
        "a9000001-0003-4001-8001-000000000003",
        "inventory.store.update",
        "Update inventory store",
        "update",
    ),
    (
        "a9000002-0001-4001-8001-000000000001",
        "inventory.item.read",
        "Read inventory item",
        "read",
    ),
    (
        "a9000002-0002-4001-8001-000000000002",
        "inventory.item.create",
        "Create inventory item",
        "create",
    ),
    (
        "a9000003-0001-4001-8001-000000000001",
        "inventory.grn.read",
        "Read inventory GRN",
        "read",
    ),
    (
        "a9000003-0002-4001-8001-000000000002",
        "inventory.grn.create",
        "Create inventory GRN",
        "create",
    ),
    (
        "a9000003-0003-4001-8001-000000000003",
        "inventory.grn.update",
        "Update inventory GRN",
        "update",
    ),
    (
        "a9000004-0001-4001-8001-000000000001",
        "inventory.stock.read",
        "Read inventory stock",
        "read",
    ),
    (
        "a9000005-0001-4001-8001-000000000001",
        "inventory.indent.read",
        "Read inventory indent",
        "read",
    ),
    (
        "a9000005-0002-4001-8001-000000000002",
        "inventory.indent.create",
        "Create inventory indent",
        "create",
    ),
    (
        "a9000005-0003-4001-8001-000000000003",
        "inventory.indent.update",
        "Update inventory indent",
        "update",
    ),
    (
        "a9000006-0001-4001-8001-000000000001",
        "inventory.transfer.read",
        "Read inventory transfer",
        "read",
    ),
    (
        "a9000006-0002-4001-8001-000000000002",
        "inventory.transfer.create",
        "Create inventory transfer",
        "create",
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

    for perm_id, slug, name, action in _PERMISSION_SEEDS:
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
                'Inventory authorization catalog ({slug}).',
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

        junction_slug = f"{_MODULE_SLUG}:{slug}"
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
            WHERE m.slug = '{_MODULE_SLUG}' AND NOT m.is_deleted
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

    perm_slugs = ", ".join(f"'{slug}'" for _, slug, _, _ in _PERMISSION_SEEDS)
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
