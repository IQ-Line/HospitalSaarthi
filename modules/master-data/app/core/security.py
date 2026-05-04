from dataclasses import dataclass


@dataclass(frozen=True)
class Principal:
    id: str
    tenant_id: str
    roles: tuple[str, ...]


def get_current_principal_placeholder() -> Principal:
    """Temporary boundary for JWT/Cerbos wiring in the learning slice."""
    return Principal(id="dev-user", tenant_id="platform-operations", roles=("platform-admin",))
