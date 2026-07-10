"""Master Data in-process authorization (PEP) wiring.

Builds the shared :class:`hims_authz.Authz` from Master Data's settings and exposes the
per-route guards. Master Data is **dual-scoped**, so it needs two guard shapes:

- :func:`guard` — global catalogs (module/permission/system_role/module_permission). Writes
  authorize on capability only, with **no tenant equality** (the caps are platform-operator
  scoped). Resource attributes are empty.
- :func:`department_guard` — the tenant-isolated department catalog. The Cerbos resource
  carries the request's catalog **scope** tenant (from the ``iq_tenant_id`` header), so the
  policy's ``principal.iq_tenant_id == resource.iq_tenant_id`` check denies cross-tenant
  writes. In global scope the resource tenant is empty, so only the super-admin rule allows.

Both guards read the :class:`~hims_authz.Authz` off ``request.app.state`` (set in
``create_app``) at request time, so they can be declared at import in route decorators.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Request
from hims_authz import Authz, AuthzSettings

from app.api.deps import get_catalog_scope
from app.core.config import get_auth_env_settings

DEPARTMENT_KIND = "master_data:department"
# All 13 visitpad catalogs share ONE Cerbos resource kind (mirrors master_data_visitpad.yaml).
VISITPAD_KIND = "master_data:visitpad"


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
    """Global-catalog guard: capability-only Cerbos check (no tenant equality).

    Use in a global catalog route's ``dependencies=[...]``. Raises 401 (unauthenticated) /
    403 (denied). ``resource_attr`` is empty because the global policies gate on the
    capability alone.
    """

    async def _dependency(request: Request) -> None:
        authz: Authz = request.app.state.authz
        await authz.authorize(request, kind, action, resource_attr={})

    return _dependency


def tenant_scoped_guard(kind: str, action: str) -> Callable[[Request], Awaitable[None]]:
    """Tenant-isolated guard: the Cerbos resource carries the request's catalog **scope**
    tenant, so the policy's ``principal.iq_tenant_id == resource.iq_tenant_id`` check denies
    cross-tenant writes (global scope → empty tenant → super-admin only). Shared by the
    department and visitpad catalogs, which are both dual-scoped (``get_catalog_scope``).
    """

    async def _dependency(request: Request) -> None:
        authz: Authz = request.app.state.authz
        scope = get_catalog_scope(request)
        tenant = str(scope.iq_tenant_id) if scope.iq_tenant_id is not None else ""
        await authz.authorize(request, kind, action, resource_attr={"iq_tenant_id": tenant})

    return _dependency


def department_guard(action: str) -> Callable[[Request], Awaitable[None]]:
    """Tenant-isolated guard for the department catalog (``master_data:department``)."""
    return tenant_scoped_guard(DEPARTMENT_KIND, action)


def visitpad_guard(action: str) -> Callable[[Request], Awaitable[None]]:
    """Tenant-isolated guard for the visitpad catalogs (``master_data:visitpad``).

    Every visitpad catalog (units, medicines, diagnoses, …) maps to the one
    ``master_data:visitpad`` Cerbos resource; the write capability is shared across them.
    """
    return tenant_scoped_guard(VISITPAD_KIND, action)
