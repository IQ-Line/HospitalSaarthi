from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, Request


async def resolve_doctor_id(request: Request) -> UUID:
    """Acting doctor from the VERIFIED principal (JWT ``sub``), never a raw header.

    Replaces the former ``SYSTEM_DOCTOR_ID`` all-zeros fallback: an unauthenticated caller
    is rejected by the identity gate before reaching here, so the actor is always known.
    """
    identity = await request.app.state.authz.get_identity(request)
    try:
        return UUID(identity.user_id)
    except ValueError as exc:  # pragma: no cover — verified tokens carry a UUID subject
        raise HTTPException(status_code=400, detail="Invalid subject") from exc
