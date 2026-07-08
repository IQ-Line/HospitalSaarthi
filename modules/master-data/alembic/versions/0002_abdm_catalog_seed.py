"""Seed the ABDM catalog module + capability permissions.

Adds the `abdm` module and its six user-facing platform capabilities so they exist
in the Master Data catalog for role assignment and are picked up by the UM capability
sync (`m.slug` + `p.slug` -> runtime `<module>:<feature>:<action>`):

    abdm:care-context:{create,read}   -- M2 care-context linking
    abdm:consent:{create,read}        -- M3 HIU consent requests
    abdm:health-data:{create,read}    -- M3 data-request + transferred records (PHI)

These gate the integration-hub-svc M2/M3 platform routes via the Cerbos `abdm`
resource policy (infra/cerbos/policies/abdm/abdm.yaml).

Ids are derived with the same uuid5 namespace as the 0001 baseline so the junction
rows resolve to the module/permission rows inserted here.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_abdm_catalog_seed"
down_revision: str | Sequence[str] | None = "0001_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Same deterministic namespace as 0001_baseline (natural-key-derived seed PKs).
_NS = uuid.UUID("0d442472-bf0a-5026-b2ee-4c8ab6671c9d")
_UUID = postgresql.UUID(as_uuid=True)

_MODULE_SLUG = "abdm"

# (permission slug, action, human name). Dotted product-permission style — the UM
# mapper strips the leading module segment and yields `abdm:<feature>:<action>`.
_PERMISSIONS: list[tuple[str, str, str]] = [
    ("abdm.care-context.create", "create", "Link ABDM care contexts"),
    ("abdm.care-context.read", "read", "Read ABDM care-context linking status"),
    ("abdm.consent.create", "create", "Request ABDM (HIU) consent"),
    ("abdm.consent.read", "read", "Read ABDM (HIU) consent requests"),
    ("abdm.health-data.create", "create", "Request ABDM health data"),
    ("abdm.health-data.read", "read", "Read ABDM health data (records/attachments)"),
]


def _uid(kind: str, natural_key: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"{kind}:{natural_key}")


def upgrade() -> None:
    modules = sa.table(
        "modules",
        sa.column("id", _UUID), sa.column("parent_id", _UUID),
        sa.column("name", sa.Text), sa.column("slug", sa.Text),
        sa.column("description", sa.Text), sa.column("category", sa.String),
        sa.column("version", sa.String), sa.column("level", sa.Integer),
        sa.column("module_kind", sa.String), sa.column("display_order", sa.Integer),
        sa.column("visibility_scope", sa.String), sa.column("icon", sa.Text),
        sa.column("is_active", sa.Boolean), sa.column("is_deleted", sa.Boolean),
        schema="master_global",
    )
    op.bulk_insert(modules, [
        {
            "id": _uid("module", _MODULE_SLUG), "parent_id": None,
            "name": "ABDM", "slug": _MODULE_SLUG,
            "description": "ABDM integration — ABHA linking (M2) and HIU consent/health-data (M3).",
            "category": "clinical", "version": "1.0.0", "level": 1,
            "module_kind": "product", "display_order": 130,
            "visibility_scope": "tenant", "icon": None,
            "is_active": True, "is_deleted": False,
        }
    ])

    permissions = sa.table(
        "permissions",
        sa.column("id", _UUID), sa.column("name", sa.Text), sa.column("slug", sa.Text),
        sa.column("action", sa.String), sa.column("description", sa.Text),
        sa.column("is_active", sa.Boolean), sa.column("is_deleted", sa.Boolean),
        schema="master_global",
    )
    op.bulk_insert(permissions, [
        {
            "id": _uid("permission", slug), "name": name, "slug": slug,
            "action": action,
            "description": f"ABDM platform authorization catalog ({slug}).",
            "is_active": True, "is_deleted": False,
        }
        for (slug, action, name) in _PERMISSIONS
    ])

    module_permissions = sa.table(
        "module_permissions",
        sa.column("id", _UUID), sa.column("slug", sa.Text),
        sa.column("module_id", _UUID), sa.column("permission_id", _UUID),
        sa.column("is_default", sa.Boolean),
        sa.column("is_active", sa.Boolean), sa.column("is_deleted", sa.Boolean),
        schema="master_global",
    )
    op.bulk_insert(module_permissions, [
        {
            "id": _uid("module_permission", f"{_MODULE_SLUG}:{slug}"),
            "slug": f"{_MODULE_SLUG}:{slug}",
            "module_id": _uid("module", _MODULE_SLUG),
            "permission_id": _uid("permission", slug),
            "is_default": False, "is_active": True, "is_deleted": False,
        }
        for (slug, _action, _name) in _PERMISSIONS
    ])


def downgrade() -> None:
    bind = op.get_bind()
    module_id = _uid("module", _MODULE_SLUG)
    perm_ids = [str(_uid("permission", slug)) for (slug, _a, _n) in _PERMISSIONS]
    perm_id_list = ", ".join(f"'{pid}'" for pid in perm_ids)
    bind.exec_driver_sql(
        f"DELETE FROM master_global.module_permissions WHERE module_id = '{module_id}'"
    )
    bind.exec_driver_sql(
        f"DELETE FROM master_global.permissions WHERE id IN ({perm_id_list})"
    )
    bind.exec_driver_sql(
        f"DELETE FROM master_global.modules WHERE id = '{module_id}'"
    )
