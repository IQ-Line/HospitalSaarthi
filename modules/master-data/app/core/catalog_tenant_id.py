"""Parse ``iq_tenant_id`` header for catalog routing (UUID tenant key, matches ``ts-sdk-db``)."""

from __future__ import annotations

from uuid import UUID


class CatalogTenantIdError(ValueError):
    """Invalid non-empty ``iq_tenant_id`` for catalog scope."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


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
