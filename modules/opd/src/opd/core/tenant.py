from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException


def require_tenant_id(
    iq_tenant_id: str | None = Header(default=None, alias="iq_tenant_id"),
    x_tenant_id: str | None = Header(default=None, alias="x-tenant-id"),
) -> UUID:
    raw = (iq_tenant_id or x_tenant_id or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="iq_tenant_id header is required")
    try:
        return UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid iq_tenant_id") from exc
