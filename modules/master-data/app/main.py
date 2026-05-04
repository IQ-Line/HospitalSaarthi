from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title="HIMS Master Data API",
        version="0.1.0",
        description="Python Master Data service learning slice.",
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
