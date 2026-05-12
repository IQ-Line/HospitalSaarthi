"""Parse ``iq_tenant_id`` header for catalog routing (positive integer tenant key)."""

from __future__ import annotations

import re

# Matches PostgreSQL / SQLAlchemy ``Integer`` / ``integer`` column range.
_MAX_TENANT_ID = 2_147_483_647

_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
)


class CatalogTenantIdError(ValueError):
    """Invalid non-empty ``iq_tenant_id`` for catalog scope."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def parse_iq_tenant_id(raw: str) -> int:
    """Return tenant id from non-empty header value."""
    s = raw.strip()
    if not s:
        raise CatalogTenantIdError("empty")
    if s.isdigit():
        n = int(s)
        if n < 1 or n > _MAX_TENANT_ID:
            raise CatalogTenantIdError("range")
        return n
    if _UUID_RE.fullmatch(s):
        raise CatalogTenantIdError("uuid_shape")
    raise CatalogTenantIdError("not_integer_string")


def try_parse_iq_tenant_id(raw: str | None) -> int | None:
    """``None`` if absent/blank; raises :class:`CatalogTenantIdError` on invalid non-blank input."""
    if raw is None or not raw.strip():
        return None
    return parse_iq_tenant_id(raw)
