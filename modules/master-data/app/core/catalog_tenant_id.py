"""Parse catalog tenant headers for scope routing (UUID tenant key, matches ``ts-sdk-db``)."""

from __future__ import annotations

from collections.abc import Mapping
from uuid import UUID

# Canonical platform tenant headers (aligned with ``@hims/ts-sdk-tenant`` and user-management).
IQ_TENANT_ID_HEADER = "iq_tenant_id"
X_TENANT_ID_HEADER = "x-tenant-id"

# Backward-compatible alias used by OpenAPI / docs.
CATALOG_TENANT_HEADER = IQ_TENANT_ID_HEADER


class CatalogTenantIdError(ValueError):
    """Invalid non-empty tenant header value for catalog scope."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def as_single_header_value(value: str | None) -> str | None:
    """Normalize a single header value (strip; empty → ``None``)."""
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


def resolve_catalog_tenant_header_raw(headers: Mapping[str, str]) -> str | None:
    """Resolve tenant id from request headers.

    Prefer ``iq_tenant_id``, then ``x-tenant-id`` — same order as TypeScript services.
    Blank values are treated as absent so a hyphenated header can win when the
    underscore header was stripped by a proxy.
    """
    iq = as_single_header_value(headers.get(IQ_TENANT_ID_HEADER))
    if iq is not None:
        return iq
    return as_single_header_value(headers.get(X_TENANT_ID_HEADER))


def parse_iq_tenant_id(raw: str) -> UUID:
    """Return tenant id from non-empty header value (canonical UUID string)."""
    s = raw.strip()
    if not s:
        raise CatalogTenantIdError("empty")
    try:
        return UUID(s)
    except ValueError as exc:
        raise CatalogTenantIdError("invalid_uuid") from exc


def try_parse_iq_tenant_id(raw: str | None) -> UUID | None:
    """``None`` if absent/blank; raises :class:`CatalogTenantIdError` on invalid non-blank input."""
    if raw is None or not raw.strip():
        return None
    return parse_iq_tenant_id(raw)
