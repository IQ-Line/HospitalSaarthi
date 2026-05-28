import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.exc import SQLAlchemyError

from app.api.errors import register_exception_handlers
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import database_target_label, reset_database_engine, verify_database_connection
from app.core.logging import configure_logging
from app.middleware.auth_middleware import BearerAuthContextMiddleware
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware
from hims_authz.middleware import BearerPrincipalMiddleware

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
    yield
    reset_database_engine()


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title="HIMS Master Data API",
        version="0.1.0",
        description=(
            "Platform catalog and reference data for HIMS. "
            "API version is carried in the URL path (`/api/v1/master-data`)."
        ),
        lifespan=lifespan,
    )
    # Order: last added is outermost. RequestContextMiddleware must run first so the
    # request_id ContextVar is bound before RequestLoggingMiddleware emits any logs.
    app.add_middleware(BearerAuthContextMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestContextMiddleware)
    if settings.authz_enabled and settings.cerbos_url:
        app.add_middleware(
            BearerPrincipalMiddleware,
            user_management_url=settings.user_management_url,
            cerbos_url=settings.cerbos_url,
            jwt_secret=settings.jwt_secret,
            authz_enabled=settings.authz_enabled,
        )
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
