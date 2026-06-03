"""Top-level OPD router — mounts handler sub-routers."""

from fastapi import APIRouter

from opd.http_handlers.health import router as health_router
from opd.http_handlers.prescription import router as prescription_router
from opd.http_handlers.prescriptions import router as prescriptions_router

router = APIRouter()
router.include_router(health_router)
# Phase-0 JSONB routes must register before the normalized ``/prescriptions`` router
# (both expose ``GET /prescriptions/{id}``).
router.include_router(prescriptions_router)
router.include_router(prescription_router)
