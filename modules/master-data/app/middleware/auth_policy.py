"""Bearer resolution for superadmin-only routes (when ``require_superadmin`` is wired).

Policy is **centralized here** so FastAPI deps and tests share one implementation.

**Audit actors (`created_by` / `updated_by`):** we only persist a UUID when it comes from a
verified JWT claim ``sub``. Test-only disable, env bypass, and dev shared-secret matches do
**not** invent placeholder user ids — those paths return ``None`` so audit columns stay
``NULL`` (meaning “no identifiable principal”), which avoids misleading foreign keys to
``users`` later.
"""

from __future__ import annotations

import secrets
from uuid import UUID

import jwt

from app.core.config import Settings


class AuthResolutionError(Exception):
    """Raised when bearer cannot be turned into a superadmin actor."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def resolve_superadmin_actor(
    settings: Settings,
    raw_bearer_token: str | None,
) -> UUID | None:
    """Resolve who performed the mutation for optional audit columns.

    Returns:
        - ``UUID`` from JWT ``sub`` when signature/claims pass and the caller is superadmin.
        - ``None`` when ``auth_disabled`` (tests), ``auth_bypass``, or dev bearer matches
          (no real user id — audit stays null).
        - ``None`` when JWT decodes but ``sub`` is absent (caller still superadmin; audit null).

    Raises:
        ``AuthResolutionError``: missing/invalid token, or not superadmin.
    """
    if settings.auth_disabled:
        return None

    if settings.auth_bypass:
        return None

    if raw_bearer_token is None:
        raise AuthResolutionError(401, "Missing Authorization bearer token.")

    if settings.dev_bearer_token:
        try:
            if secrets.compare_digest(
                raw_bearer_token.encode("utf-8"),
                settings.dev_bearer_token.encode("utf-8"),
            ):
                return None
        except ValueError:
            # Length mismatch — fall through to JWT path.
            pass

    try:
        if settings.jwt_secret:
            payload = jwt.decode(raw_bearer_token, settings.jwt_secret, algorithms=["HS256"])
        else:
            payload = jwt.decode(raw_bearer_token, options={"verify_signature": False})
    except jwt.PyJWTError as exc:
        raise AuthResolutionError(401, "Invalid or expired bearer token.") from exc

    roles = payload.get("roles")
    if isinstance(roles, str):
        roles = [roles]
    elif not roles:
        roles = []

    role = payload.get("role")
    is_super = role == "superadmin" or "superadmin" in roles or "platform_superadmin" in roles
    if not is_super:
        raise AuthResolutionError(403, "This action requires a superadmin principal.")

    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        return UUID(str(sub))
    except ValueError as exc:
        raise AuthResolutionError(401, "Token subject (sub) must be a UUID.") from exc
