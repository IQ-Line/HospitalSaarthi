import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from hims_authz import Authz, IdentityGateMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.errors import register_exception_handlers
from app.api.v1.router import api_router
from app.core.authz import build_authz
from app.core.config import get_settings
from app.core.database import (
    database_target_label,
    reset_database_engine,
    verify_database_connection,
)
from app.core.logging import configure_logging
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings.cache_clear()
    reset_database_engine()
    settings = get_settings()
    try:
        verify_database_connection()
    except SQLAlchemyError:
        logger.warning(
            "Master Data started without a working catalog database (%s); "
            "read routes such as /modules will return 503 until the DB is reachable",
            database_target_label(settings.database_url),
        )
    else:
        logger.info(
            "Master Data catalog database ready at %s",
            database_target_label(settings.database_url),
        )
    logger.info("Master Data listening under prefix %s", settings.api_prefix)
    authz: Authz = app.state.authz
    await authz.assert_reachable()  # fail fast if the Cerbos PDP is unreachable
    try:
        yield
    finally:
        await authz.aclose()
        reset_database_engine()


def create_app(deps: dict[str, Any] | None = None) -> FastAPI:
    """Build the Master Data app with the in-process authorization PEP wired in.

    ``deps`` lets tests (or a composition root) inject a stub ``Authz``; otherwise the real
    PEP is built from Master Data's settings (JWKS/issuer/audience/Cerbos/UM).
    """
    configure_logging()
    settings = get_settings()
    deps = deps or {}
    authz: Authz = deps.get("authz") or build_authz()

    app = FastAPI(
        title="HIMS Master Data API",
        version="0.1.0",
        description=(
            "Platform catalog and reference data for HIMS. "
            "API version is carried in the URL path (`/api/v1/master-data`)."
        ),
        lifespan=lifespan,
    )
    app.state.authz = authz
    # Order: last added is outermost. RequestContextMiddleware must run first so the
    # request_id ContextVar is bound before RequestLoggingMiddleware emits any logs; the
    # fail-closed identity gate sits innermost (closest to the routes) so a 401 is still
    # logged with a request_id. Per-route guards then authorize via Cerbos.
    app.add_middleware(
        IdentityGateMiddleware,
        verifier=authz.verifier,
        public_path_prefixes=(f"{settings.api_prefix}/health",),
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestContextMiddleware)
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
