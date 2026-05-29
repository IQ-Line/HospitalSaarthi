from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class AuthzAction(StrEnum):
    CATALOG_READ = "catalog.read"
    CATALOG_CREATE = "catalog.create"
    CATALOG_UPDATE = "catalog.update"
    CATALOG_DELETE = "catalog.delete"
    VISITPAD_READ = "visitpad.read"
    VISITPAD_CREATE = "visitpad.create"
    VISITPAD_UPDATE = "visitpad.update"
    VISITPAD_DELETE = "visitpad.delete"


class AuthzKind(StrEnum):
    PLATFORM = "master_data:platform"
    VISITPAD = "master_data:visitpad"


@dataclass(frozen=True)
class EnrichedPrincipal:
    id: str
    roles: list[str] = field(default_factory=list)
    iq_tenant_id: str = ""
    capabilities: list[str] = field(default_factory=list)
    delegated_capabilities: list[str] = field(default_factory=list)
    role_codes: list[str] = field(default_factory=list)
    department: str | None = None
    org_id: str | None = None


@dataclass(frozen=True)
class AuthzTarget:
    kind: str
    id: str
    action: str
    attr: dict | None = None
