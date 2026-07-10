"""OPD in-process authorization (PEP) wiring.

Builds the shared :class:`hims_authz.Authz` from OPD's settings and exposes a per-route
``guard(kind, action)`` dependency. The guard reads the ``Authz`` off ``request.app.state``
(set in ``create_app``) at request time, so it can be declared at import in route decorators
without the app existing yet.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Request
from hims_authz import Authz, AuthzSettings

from opd.core.config import get_auth_env_settings


def build_authz_settings() -> AuthzSettings:
    env = get_auth_env_settings()
    return AuthzSettings(
        jwks_url=env.jwks_url,
        issuer=env.jwt_issuer,
        audience=env.jwt_audience,
        cerbos_http_url=env.cerbos_http_url,
        principal_url=env.user_management_url.rstrip("/") + env.principal_path,
        max_token_age_seconds=env.max_token_age_seconds,
        clock_skew_seconds=env.clock_skew_seconds,
    )


def build_authz() -> Authz:
    return Authz.from_settings(build_authz_settings())


def guard(kind: str, action: str) -> Callable[[Request], Awaitable[None]]:
    """A FastAPI dependency that verifies + enriches + Cerbos-checks the request.

    Use in a route's ``dependencies=[...]``. Raises 401 (unauthenticated) / 403 (denied);
    tenant/doctor are read separately from the verified principal.
    """

    async def _dependency(request: Request) -> None:
        authz: Authz = request.app.state.authz
        await authz.authorize(request, kind, action)

    return _dependency
