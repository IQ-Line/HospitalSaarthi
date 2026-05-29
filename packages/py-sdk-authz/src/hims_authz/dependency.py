from __future__ import annotations

from functools import lru_cache
from uuid import UUID

from fastapi import HTTPException, Request, status

from hims_authz.client import AuthzClient
from hims_authz.types import EnrichedPrincipal


def _default_cerbos_url() -> str:
    return "localhost:3593"


@lru_cache(maxsize=1)
def _get_client(cerbos_url: str) -> AuthzClient:
    return AuthzClient(host=cerbos_url)


def _auto_infer_id(request: Request) -> str:
    for name, value in request.path_params.items():
        if name.endswith("_id") or name == "id":
            if isinstance(value, UUID):
                return str(value)
            if isinstance(value, str) and value:
                return value
    return "__new__"


def require_authz(kind: str, action: str):
    def _check(request: Request) -> None:
        authz_enabled: bool = getattr(request.state, "authz_enabled", False)
        if not authz_enabled:
            return

        principal: EnrichedPrincipal | None = getattr(
            request.state, "cerbos_principal", None
        )
        if principal is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authenticated principal.",
            )

        cerbos_url: str = getattr(
            request.state, "cerbos_url", _default_cerbos_url()
        )
        client = _get_client(cerbos_url)
        resource_id = _auto_infer_id(request)
        resource_attr = {"iq_tenant_id": principal.iq_tenant_id}
        ok = client.check(
            principal=principal,
            kind=kind,
            action=action,
            resource_id=resource_id,
            resource_attr=resource_attr,
        )
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )

    return _check
