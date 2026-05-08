import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.errors import register_exception_handlers
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.auth_middleware import BearerAuthContextMiddleware
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings.cache_clear()
    settings = get_settings()
    logger.info("Master Data listening under prefix %s", settings.api_prefix)
    yield


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
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
