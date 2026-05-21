"""FastAPI app factory for the OPD module.

The factory accepts dependency overrides (``deps``) so the service wrapper
can inject concrete adapters at the composition root. The module never
instantiates DB engines or event bus clients itself.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from opd.core.config import get_settings
from opd.router import router as api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("OPD module listening under prefix %s", settings.api_prefix)
    yield


def create_app(deps: dict[str, Any] | None = None) -> FastAPI:
    """Build the OPD FastAPI app.

    ``deps`` is reserved for the composition root to pass concrete adapters
    (repositories, event publishers, etc.). At scaffold time it is unused.
    """
    settings = get_settings()
    app = FastAPI(
        title="HIMS OPD API",
        version="0.1.0",
        description="Out-Patient Department module API.",
        lifespan=_lifespan,
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app
