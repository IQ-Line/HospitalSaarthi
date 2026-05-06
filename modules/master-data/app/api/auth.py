"""Superadmin JWT / dev-bearer FastAPI dependency (optional on routes).

Catalog routes may later ``Depends(require_superadmin)``; global context is prepared in
``app.utils.auth_middleware.BearerAuthContextMiddleware`` without rejecting requests today.
"""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.utils.auth_policy import AuthResolutionError, resolve_superadmin_actor

bearer_scheme = HTTPBearer(auto_error=False)


def require_superadmin(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> UUID | None:
    """Return actor id for audit columns when this dependency is wired back onto routes."""
    settings = get_settings()
    raw = credentials.credentials if credentials is not None else None
    try:
        return resolve_superadmin_actor(settings, raw)
    except AuthResolutionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
