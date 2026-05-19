"""Catalog: global in ``global_master`` (no ``iq_tenant_id``); per-tenant in ``tenant_master``."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA

TENANT_MASTER_SCHEMA = TENANT_SCHEMA
GLOBAL_MASTER_SCHEMA = GLOBAL_SCHEMA
# Single header for catalog tenant scope: UUID string (matches platform ``iq_tenant_id`` / ``ts-sdk-db``).
CATALOG_TENANT_HEADER = "iq_tenant_id"


@dataclass(frozen=True, slots=True)
class CatalogScope:
    """Resolved per request from optional ``iq_tenant_id`` (UUID string in the HTTP header)."""

    iq_tenant_id: UUID | None

    @property
    def is_tenant(self) -> bool:
        return self.iq_tenant_id is not None
