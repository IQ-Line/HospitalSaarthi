from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, Request


async def require_tenant_id(request: Request) -> UUID:
    """Tenant scope from the VERIFIED principal (JWT ``iq_tenant_id``), never a raw header.

    The identity gate verified the JWT in-process before the handler ran; this reads that
    verified identity (fail-closed — a request without a valid token never reaches here).
    """
    identity = await request.app.state.authz.get_identity(request)
    try:
        return UUID(identity.tenant_id)
    except ValueError as exc:  # pragma: no cover — verified tokens carry a UUID tenant
        raise HTTPException(status_code=400, detail="Invalid iq_tenant_id") from exc
