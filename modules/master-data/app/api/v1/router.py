from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.meta import router as meta_router
from app.api.v1.modules import router as modules_router
from app.api.v1.permissions import router as permissions_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(meta_router)
api_router.include_router(modules_router)
api_router.include_router(permissions_router)
