"""Catalog: global in ``public`` (no ``tenant_id``); per-tenant in ``tenant_master``."""

from __future__ import annotations

from dataclasses import dataclass

TENANT_MASTER_SCHEMA = "tenant_master"
PUBLIC_SCHEMA = "public"
# Single header for catalog tenant scope: positive integer as string (e.g. "1", "98").
# Name matches BFF / SPA allow-list.
CATALOG_TENANT_HEADER = "iq_tenant_id"


@dataclass(frozen=True, slots=True)
class CatalogScope:
    """Resolved per request from optional ``iq_tenant_id`` (positive int as string)."""

    tenant_id: int | None

    @property
    def is_tenant(self) -> bool:
        return self.tenant_id is not None
