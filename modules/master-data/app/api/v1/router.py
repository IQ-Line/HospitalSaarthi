from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.meta import router as meta_router
from app.api.v1.module_permissions import router as module_permissions_router
from app.api.v1.modules import router as modules_router
from app.api.v1.permissions import router as permissions_router
from app.api.v1.system_roles import router as system_roles_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(meta_router)
api_router.include_router(modules_router)
api_router.include_router(permissions_router)
api_router.include_router(system_roles_router)
api_router.include_router(module_permissions_router)
