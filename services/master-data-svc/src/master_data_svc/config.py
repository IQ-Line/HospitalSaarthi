"""Service-level configuration (composition-root concerns).

The Master Data module owns its own ``MASTER_DATA_*`` settings and the auth env
(see ``app.core.config``); this wrapper only reads vars that belong to
deployment — currently just the listen port.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceConfig:
    port: int = int(os.getenv("MASTER_DATA_SVC_PORT", "8010"))


def get_service_config() -> ServiceConfig:
    return ServiceConfig()
