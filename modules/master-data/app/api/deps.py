from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.catalog_scope import CATALOG_TENANT_HEADER, CatalogScope
from app.core.catalog_tenant_id import CatalogTenantIdError, try_parse_iq_tenant_id
from app.core.database import get_db_session
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.repositories.permission_repository import PermissionRepository
from app.repositories.system_role_repository import SystemRoleRepository
from app.repositories.visitpad_allergen_repository import VisitpadAllergenRepository
from app.repositories.visitpad_allergy_reaction_repository import VisitpadAllergyReactionRepository
from app.repositories.visitpad_chief_complaint_repository import VisitpadChiefComplaintRepository
from app.repositories.visitpad_chronic_illness_repository import VisitpadChronicIllnessRepository
from app.repositories.visitpad_diagnosis_repository import VisitpadDiagnosisRepository
from app.repositories.visitpad_medicine_repository import VisitpadMedicineRepository
from app.repositories.visitpad_procedure_repository import VisitpadProcedureRepository
from app.repositories.visitpad_rx_column_repository import VisitpadRxColumnRepository
from app.repositories.visitpad_unit_conversion_repository import VisitpadUnitConversionRepository
from app.repositories.visitpad_unit_repository import VisitpadUnitRepository
from app.repositories.visitpad_vital_repository import VisitpadVitalRepository


def get_session() -> Generator[Session, None, None]:
    yield from get_db_session()


def get_catalog_scope(
    catalog_tenant_header: Annotated[str | None, Header(alias=CATALOG_TENANT_HEADER)] = None,
) -> CatalogScope:
    """Resolve where catalog CRUD goes for this request.

    - No / blank header → ``CatalogScope(iq_tenant_id=None)`` → ORM uses ``public`` models (**no** ``iq_tenant_id`` column).
    - Valid integer string → ``CatalogScope(iq_tenant_id=n)`` → ORM uses ``tenant_master`` models (**every** row carries ``iq_tenant_id``).
    """
    try:
        tid = try_parse_iq_tenant_id(catalog_tenant_header)
    except CatalogTenantIdError as exc:
        if exc.code == "uuid_shape":
            detail = (
                "Invalid iq_tenant_id: master-data catalog routing uses a numeric tenant key "
                "(digits only, e.g. 1, 12, 98), not a UUID. Omit the header to read the shared "
                "global catalog in schema public."
            )
        elif exc.code == "not_integer_string":
            detail = (
                "Invalid iq_tenant_id: use digits only for a positive whole number "
                "(examples: 1, 12, 98). Slugs or labels such as tenant-001 are not accepted here. "
                "Omit the header to use the shared global catalog."
            )
        else:
            detail = (
                "Invalid iq_tenant_id: expected a positive whole number within the 32-bit range "
                "(digits only, e.g. 1, 12, 98). Omit the header for the shared global catalog."
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    return CatalogScope(iq_tenant_id=tid)


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
