"""Top-level OPD router — mounts handler sub-routers."""

from fastapi import APIRouter

from opd.http_handlers.health import router as health_router

router = APIRouter()
router.include_router(health_router)
