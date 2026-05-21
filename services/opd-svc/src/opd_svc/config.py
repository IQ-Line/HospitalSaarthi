"""Service-level configuration (composition-root concerns).

The OPD module owns its own ``OPD_*`` settings; this wrapper only reads vars
that belong to deployment (port, future JWKS URL, future event-bus URL).
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceConfig:
    port: int = int(os.getenv("OPD_SVC_PORT", "8020"))


def get_service_config() -> ServiceConfig:
    return ServiceConfig()
