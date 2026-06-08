"""Catalog: global in ``global_master`` (no ``iq_tenant_id``); per-tenant in ``tenant_master``."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.core.catalog_tenant_id import (
    CATALOG_TENANT_HEADER,
    IQ_TENANT_ID_HEADER,
    X_TENANT_ID_HEADER,
)

TENANT_MASTER_SCHEMA = TENANT_SCHEMA
GLOBAL_MASTER_SCHEMA = GLOBAL_SCHEMA


@dataclass(frozen=True, slots=True)
class CatalogScope:
    """Resolved per request from optional tenant headers (``iq_tenant_id`` or ``x-tenant-id``)."""

    iq_tenant_id: UUID | None

    @property
    def is_tenant(self) -> bool:
        return self.iq_tenant_id is not None
