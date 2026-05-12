from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.meta import router as meta_router
from app.api.v1.module_permissions import router as module_permissions_router
from app.api.v1.modules import router as modules_router
from app.api.v1.permissions import router as permissions_router
from app.api.v1.system_roles import router as system_roles_router
from app.api.v1.visitpad.allergies import allergens_router, reactions_router
from app.api.v1.visitpad.chief_complaints import router as visitpad_chief_complaints_router
from app.api.v1.visitpad.chronic_illnesses import router as visitpad_chronic_illnesses_router
from app.api.v1.visitpad.diagnoses import router as visitpad_diagnoses_router
from app.api.v1.visitpad.medicines import router as visitpad_medicines_router
from app.api.v1.visitpad.procedures import router as visitpad_procedures_router
from app.api.v1.visitpad.rx_columns import router as visitpad_rx_columns_router
from app.api.v1.visitpad.units import conversions_router, units_router
from app.api.v1.visitpad.vitals import router as visitpad_vitals_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(meta_router)
api_router.include_router(modules_router)
api_router.include_router(permissions_router)
api_router.include_router(system_roles_router)
api_router.include_router(module_permissions_router)
# Visitpad: one router file per domain (plan visitpad-master §11.5).
api_router.include_router(units_router)
api_router.include_router(conversions_router)
api_router.include_router(visitpad_vitals_router)
api_router.include_router(visitpad_chief_complaints_router)
api_router.include_router(visitpad_diagnoses_router)
api_router.include_router(allergens_router)
api_router.include_router(reactions_router)
api_router.include_router(visitpad_rx_columns_router)
api_router.include_router(visitpad_medicines_router)
api_router.include_router(visitpad_chronic_illnesses_router)
api_router.include_router(visitpad_procedures_router)
