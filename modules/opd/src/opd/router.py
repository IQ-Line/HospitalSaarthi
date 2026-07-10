"""Top-level OPD router — mounts handler sub-routers."""

from fastapi import APIRouter

from opd.http_handlers.clinical_documents import router as clinical_documents_router
from opd.http_handlers.health import router as health_router
from opd.http_handlers.health_documents import router as health_documents_router
from opd.http_handlers.prescription import router as prescription_router

router = APIRouter()
router.include_router(health_router)
router.include_router(clinical_documents_router)
# Normalized ``/prescriptions`` REST API (create-rx; see specs/openapi/opd.v1.yaml).
router.include_router(prescription_router)
router.include_router(health_documents_router)
