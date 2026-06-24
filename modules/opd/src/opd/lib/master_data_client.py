from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any
from uuid import UUID

from opd.core.config import get_settings


def fetch_visitpad_vitals_catalog(tenant_id: UUID) -> list[dict[str, Any]]:
    """Load active tenant visitpad vitals from master-data (admin-configured codes/labels)."""
    settings = get_settings()
    base_url = settings.master_data_url.strip()
    if not base_url:
        return []

    query = urllib.parse.urlencode({"is_active": "true", "limit": "200", "offset": "0"})
    url = f"{base_url.rstrip('/')}/api/v1/master-data/visitpad/vitals?{query}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "x-tenant-id": str(tenant_id),
            "iq_tenant_id": str(tenant_id),
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(
            request, timeout=settings.master_data_timeout_seconds
        ) as response:
            body = response.read().decode("utf-8")
    except urllib.error.URLError:
        return []

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return []

    data = parsed.get("data") if isinstance(parsed, dict) else None
    if not isinstance(data, list):
        return []
    return [row for row in data if isinstance(row, dict)]
