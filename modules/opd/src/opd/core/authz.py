"""Cerbos authorization for OPD mutation routes (mirrors TS authzPlugin + UM principal enrichment)."""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Annotated, Any
from uuid import UUID

import httpx
import jwt
from fastapi import Header, HTTPException, Depends
from jwt import PyJWKClient

from opd.core.tenant import require_tenant_id

logger = logging.getLogger(__name__)

CERBOS_ROLELESS_FALLBACK_ROLE = "__hims_authenticated__"
AUTH_FORBIDDEN = "AUTHZ_FORBIDDEN"


def _auth_policy() -> str:
    return (os.environ.get("AUTH_POLICY") or "optional").strip().lower()


def _node_env() -> str:
    return (os.environ.get("NODE_ENV") or "").strip().lower()


def _auth_required() -> bool:
    """Match pharmacy-svc: enforce in production without a separate AUTH_POLICY env var."""
    if _auth_policy() == "required":
        return True
    if _auth_policy() == "disabled":
        return False
    return _node_env() == "production"


@lru_cache(maxsize=1)
def _jwt_settings() -> tuple[str, str, str]:
    jwks_url = (os.environ.get("JWKS_URL") or "").strip()
    issuer = (os.environ.get("JWT_ISSUER") or "").strip()
    audience = (os.environ.get("JWT_AUDIENCE") or "").strip()
    if not jwks_url or not issuer or not audience:
        raise RuntimeError(
            "AUTH_CONFIG_INVALID: JWKS_URL, JWT_ISSUER, and JWT_AUDIENCE are required "
            "when OPD authorization is enforced (AUTH_POLICY=required or NODE_ENV=production)",
        )
    return jwks_url, issuer, audience


@lru_cache(maxsize=1)
def _jwk_client() -> PyJWKClient:
    jwks_url, _, _ = _jwt_settings()
    return PyJWKClient(jwks_url)


def _cerbos_http_url() -> str:
    explicit = (os.environ.get("CERBOS_HTTP_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    vite_url = (os.environ.get("VITE_CERBOS_URL") or "").strip()
    if vite_url:
        return vite_url.rstrip("/")
    cerbos = (os.environ.get("CERBOS_URL") or "").strip()
    if cerbos:
        normalized = cerbos.removeprefix("grpc://").removeprefix("http://").removeprefix("https://")
        host = normalized
        port = 3593
        if ":" in normalized:
            host, _, port_str = normalized.rpartition(":")
            try:
                port = int(port_str)
            except ValueError:
                host = normalized
        http_port = 3592 if port == 3593 else port
        return f"http://{host}:{http_port}"
    return "http://localhost:3592"


def _user_management_base_url() -> str:
    return (os.environ.get("USER_MANAGEMENT_URL") or "http://localhost:3005").rstrip("/")


def _read_bearer(authorization: str | None) -> str:
    raw = (authorization or "").strip()
    if not raw.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization bearer token")
    token = raw[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization bearer token")
    return token


def _decode_access_token(token: str) -> dict[str, Any]:
    jwks_url, issuer, audience = _jwt_settings()
    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256", "EdDSA"],
            audience=audience,
            issuer=issuer,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired bearer token") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=401, detail="Invalid or expired bearer token")
    return payload


async def _fetch_um_principal(
    bearer_token: str,
    tenant_id: UUID,
) -> dict[str, Any]:
    url = f"{_user_management_base_url()}/api/user-management/auth/principal"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "iq_tenant_id": str(tenant_id),
        "x-tenant-id": str(tenant_id),
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        logger.exception("Failed to fetch UM principal for OPD authorization")
        raise HTTPException(status_code=503, detail="Authorization service unavailable") from exc

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid or expired bearer token")
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Authorization service unavailable")
    body = response.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=503, detail="Authorization service unavailable")
    return body


def _principal_wire(principal: dict[str, Any]) -> dict[str, Any]:
    attributes = principal.get("attributes")
    if not isinstance(attributes, dict):
        attributes = {}
    roles_raw = principal.get("roles")
    roles = [str(role) for role in roles_raw] if isinstance(roles_raw, list) else []
    if not roles:
        roles = [CERBOS_ROLELESS_FALLBACK_ROLE]
    principal_id = principal.get("id")
    if not isinstance(principal_id, str) or not principal_id.strip():
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "id": principal_id,
        "roles": roles,
        "attr": attributes,
    }


async def _cerbos_is_allowed(
    principal: dict[str, Any],
    *,
    resource_kind: str,
    resource_id: str,
    action: str,
    tenant_id: UUID,
) -> bool:
    wire = _principal_wire(principal)
    payload = {
        "requestId": f"opd-{resource_kind}-{resource_id}-{action}",
        "principal": {
            "id": wire["id"],
            "roles": wire["roles"],
            "attr": wire["attr"],
        },
        "resources": [
            {
                "resource": {
                    "kind": resource_kind,
                    "id": resource_id,
                    "attr": {"iq_tenant_id": str(tenant_id)},
                },
                "actions": [action],
            }
        ],
    }
    url = f"{_cerbos_http_url()}/api/check/resources"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
    except httpx.HTTPError as exc:
        logger.exception("Cerbos check failed for OPD route")
        raise HTTPException(status_code=503, detail="Authorization service unavailable") from exc

    if response.status_code >= 400:
        logger.error("Cerbos HTTP error %s: %s", response.status_code, response.text)
        raise HTTPException(status_code=503, detail="Authorization service unavailable")

    body = response.json()
    results = body.get("results") if isinstance(body, dict) else None
    if not isinstance(results, list) or not results:
        return False
    first = results[0]
    if not isinstance(first, dict):
        return False
    actions = first.get("actions")
    if not isinstance(actions, dict):
        return False
    effect = actions.get(action)
    return effect == "EFFECT_ALLOW"


async def require_opd_patient_update(
    tenant_id: Annotated[UUID, Depends(require_tenant_id)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """FastAPI dependency: enforce ``opd:patient:update`` via Cerbos before mutation handlers."""
    if not _auth_required():
        return

    bearer = _read_bearer(authorization)
    _decode_access_token(bearer)
    principal = await _fetch_um_principal(bearer, tenant_id)
    allowed = await _cerbos_is_allowed(
        principal,
        resource_kind="opd_patient",
        resource_id="clinical-mutation",
        action="patient.update",
        tenant_id=tenant_id,
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
