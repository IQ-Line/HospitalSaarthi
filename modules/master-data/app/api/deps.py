from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.catalog_scope import CatalogScope
from app.core.catalog_tenant_id import (
    CatalogTenantIdError,
    resolve_catalog_tenant_header_raw,
    try_parse_iq_tenant_id,
)
from app.core.database import get_db_session
from app.repositories.department_repository import DepartmentRepository
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.repositories.permission_repository import PermissionRepository
from app.repositories.picklist_repository import PicklistRepository
from app.repositories.system_role_repository import SystemRoleRepository
from app.repositories.visitpad.allergen import VisitpadAllergenRepository
from app.repositories.visitpad.allergy_reaction import VisitpadAllergyReactionRepository
from app.repositories.visitpad.chief_complaint import VisitpadChiefComplaintRepository
from app.repositories.visitpad.chronic_illness import VisitpadChronicIllnessRepository
from app.repositories.visitpad.diagnosis import VisitpadDiagnosisRepository
from app.repositories.visitpad.medicine import VisitpadMedicineRepository
from app.repositories.visitpad.procedure import VisitpadProcedureRepository
from app.repositories.visitpad.rx_column import VisitpadRxColumnRepository
from app.repositories.visitpad.conversion import VisitpadUnitConversionRepository
from app.repositories.visitpad.unit import VisitpadUnitRepository
from app.repositories.visitpad.manufacturer import VisitpadManufacturerRepository
from app.repositories.visitpad.vaccine import VisitpadVaccineRepository
from app.repositories.visitpad.vital import VisitpadVitalRepository


def get_session() -> Generator[Session, None, None]:
    yield from get_db_session()


def catalog_scope_from_tenant_header_raw(catalog_tenant_header: str | None) -> CatalogScope:
    """Build :class:`CatalogScope` from a resolved raw tenant header string."""
    try:
        tid = try_parse_iq_tenant_id(catalog_tenant_header)
    except CatalogTenantIdError as exc:
        if exc.code == "empty":
            detail = "Invalid iq_tenant_id: empty value. Omit the header for the shared global catalog."
        elif exc.code == "invalid_uuid":
            detail = (
                "Invalid iq_tenant_id: expected a canonical UUID string "
                "(e.g. 550e8400-e29b-41d4-a716-446655440000). "
                "Numeric-only legacy keys are not accepted. Omit the header for the global catalog (master_global schema)."
            )
        else:
            detail = "Invalid iq_tenant_id. Omit the header for the shared global catalog."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    return CatalogScope(iq_tenant_id=tid)


def get_catalog_scope(request: Request) -> CatalogScope:
    """Resolve where catalog CRUD goes for this request.

    - No / blank tenant header → ``CatalogScope(iq_tenant_id=None)`` → ``master_global`` models.
    - Valid UUID in ``iq_tenant_id`` or ``x-tenant-id`` → ``master_tenant`` models.
    """
    raw = resolve_catalog_tenant_header_raw(request.headers)
    return catalog_scope_from_tenant_header_raw(raw)


def get_department_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> DepartmentRepository:
    return DepartmentRepository(session, scope)


def get_module_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> ModuleRepository:
    return ModuleRepository(session, scope)


def get_permission_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> PermissionRepository:
    return PermissionRepository(session, scope)


def get_picklist_repository(
    session: Annotated[Session, Depends(get_session)],
) -> PicklistRepository:
    """Platform picklists live in ``master_global`` only; tenant header is ignored."""
    return PicklistRepository(session)


def get_system_role_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> SystemRoleRepository:
    return SystemRoleRepository(session, scope)


def get_module_permission_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> ModulePermissionRepository:
    return ModulePermissionRepository(session, scope)


def get_visitpad_unit_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadUnitRepository:
    return VisitpadUnitRepository(session, scope)


def get_visitpad_unit_conversion_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadUnitConversionRepository:
    return VisitpadUnitConversionRepository(session, scope)


def get_visitpad_rx_column_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadRxColumnRepository:
    return VisitpadRxColumnRepository(session, scope)


def get_visitpad_allergen_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadAllergenRepository:
    return VisitpadAllergenRepository(session, scope)


def get_visitpad_allergy_reaction_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadAllergyReactionRepository:
    return VisitpadAllergyReactionRepository(session, scope)


def get_visitpad_chief_complaint_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadChiefComplaintRepository:
    return VisitpadChiefComplaintRepository(session, scope)


def get_visitpad_diagnosis_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadDiagnosisRepository:
    return VisitpadDiagnosisRepository(session, scope)


def get_visitpad_chronic_illness_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadChronicIllnessRepository:
    return VisitpadChronicIllnessRepository(session, scope)


def get_visitpad_vital_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadVitalRepository:
    return VisitpadVitalRepository(session, scope)


def get_visitpad_medicine_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadMedicineRepository:
    return VisitpadMedicineRepository(session, scope)


def get_visitpad_procedure_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadProcedureRepository:
    return VisitpadProcedureRepository(session, scope)


def get_visitpad_vaccine_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadVaccineRepository:
    return VisitpadVaccineRepository(session, scope)


def get_visitpad_manufacturer_repository(
    session: Annotated[Session, Depends(get_session)],
    scope: Annotated[CatalogScope, Depends(get_catalog_scope)],
) -> VisitpadManufacturerRepository:
    return VisitpadManufacturerRepository(session, scope)
