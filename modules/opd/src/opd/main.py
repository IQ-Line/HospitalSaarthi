"""FastAPI app factory for the OPD module.

The factory accepts dependency overrides (``deps``) so the service wrapper (or tests) can
inject concrete adapters at the composition root — including the ``Authz`` PEP. When none
is supplied the app builds the real PEP from OPD's settings (JWKS/issuer/audience/Cerbos/UM).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from hims_authz import Authz, IdentityGateMiddleware

from opd.core.authz import build_authz
from opd.core.config import get_settings
from opd.router import router as api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("OPD module listening under prefix %s", settings.api_prefix)
    authz: Authz = app.state.authz
    await authz.assert_reachable()  # fail fast if the Cerbos PDP is unreachable
    try:
        yield
    finally:
        await authz.aclose()


def create_app(deps: dict[str, Any] | None = None) -> FastAPI:
    """Build the OPD FastAPI app with the in-process authorization PEP wired in."""
    settings = get_settings()
    deps = deps or {}
    authz: Authz = deps.get("authz") or build_authz()

    app = FastAPI(
        title="HIMS OPD API",
        version="0.1.0",
        description="Out-Patient Department module API.",
        lifespan=_lifespan,
    )
    app.state.authz = authz
    # Fail-closed identity gate: every non-public request must carry a JWT that verifies
    # in-process. Per-route guards then authorize the specific resource action via Cerbos.
    app.add_middleware(
        IdentityGateMiddleware,
        verifier=authz.verifier,
        public_path_prefixes=(f"{settings.api_prefix}/health",),
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app
