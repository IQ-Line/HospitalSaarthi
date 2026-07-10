"""Catalog: global in ``master_global`` (no ``iq_tenant_id``); per-tenant in ``master_tenant``."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA

TENANT_MASTER_SCHEMA = TENANT_SCHEMA
GLOBAL_MASTER_SCHEMA = GLOBAL_SCHEMA


@dataclass(frozen=True, slots=True)
class CatalogScope:
    """Resolved per request from optional tenant headers (``iq_tenant_id`` or ``x-tenant-id``)."""

    iq_tenant_id: UUID | None

    @property
    def is_tenant(self) -> bool:
        return self.iq_tenant_id is not None
