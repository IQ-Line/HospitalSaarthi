"""HTTP client for pharmacy module (cross-module sync; Phase 0)."""

from __future__ import annotations

import logging
import os
from typing import Any
from uuid import UUID

import httpx

from opd.core.config import get_service_integration_settings

logger = logging.getLogger(__name__)
_gateway_warned_disabled = False
PHARMACY_INTERNAL_KEY_HEADER = "x-pharmacy-internal-key"


class HttpPharmacyGateway:
    def __init__(self, base_url: str | None = None) -> None:
        if base_url is not None:
            raw = base_url
        else:
            raw = os.getenv("PHARMACY_URL", "") or get_service_integration_settings().pharmacy_url
        self._base_url = raw.rstrip("/") if raw.strip() else None

    @property
    def enabled(self) -> bool:
        return self._base_url is not None

    def upsert_queue_projection(
        self,
        tenant_id: UUID | str,
        visit_id: UUID | str,
        payload: dict[str, Any],
    ) -> None:
        global _gateway_warned_disabled
        if not self._base_url:
            if not _gateway_warned_disabled:
                logger.warning(
                    "PHARMACY_URL is not configured; OPD will not push pharmacy queue projections"
                )
                _gateway_warned_disabled = True
            return

        url = f"{self._base_url}/api/pharmacy/v1/internal/opd-queue-projection/{visit_id}"
        headers = {
            "iq_tenant_id": str(tenant_id),
            "Content-Type": "application/json",
        }
        internal_key = (
            os.getenv("PHARMACY_INTERNAL_API_KEY", "").strip()
            or get_service_integration_settings().pharmacy_internal_api_key.strip()
        )
        if internal_key:
            headers[PHARMACY_INTERNAL_KEY_HEADER] = internal_key
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.put(url, json=payload, headers=headers)
                if response.status_code not in (200, 204):
                    response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning(
                "pharmacy queue projection upsert failed for visit %s: %s",
                visit_id,
                exc,
            )


_gateway: HttpPharmacyGateway | None = None


def get_pharmacy_gateway() -> HttpPharmacyGateway:
    global _gateway
    if _gateway is None:
        _gateway = HttpPharmacyGateway()
    return _gateway
