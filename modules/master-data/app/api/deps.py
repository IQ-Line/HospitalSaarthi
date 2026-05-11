from collections.abc import Generator
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
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


def get_module_repository(session: Annotated[Session, Depends(get_session)]) -> ModuleRepository:
    return ModuleRepository(session)


def get_permission_repository(
    session: Annotated[Session, Depends(get_session)],
) -> PermissionRepository:
    return PermissionRepository(session)


def get_system_role_repository(
    session: Annotated[Session, Depends(get_session)],
) -> SystemRoleRepository:
    return SystemRoleRepository(session)


def get_module_permission_repository(
    session: Annotated[Session, Depends(get_session)],
) -> ModulePermissionRepository:
    return ModulePermissionRepository(session)


def get_platform_tenant_id() -> UUID:
    """Fixed tenant for platform-global Visitpad catalog rows."""
    return get_settings().platform_tenant_id


def get_visitpad_unit_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitRepository:
    return VisitpadUnitRepository(session)


def get_visitpad_unit_conversion_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadUnitConversionRepository:
    return VisitpadUnitConversionRepository(session)


def get_visitpad_rx_column_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadRxColumnRepository:
    return VisitpadRxColumnRepository(session)


def get_visitpad_allergen_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergenRepository:
    return VisitpadAllergenRepository(session)


def get_visitpad_allergy_reaction_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergyReactionRepository:
    return VisitpadAllergyReactionRepository(session)


def get_visitpad_chief_complaint_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChiefComplaintRepository:
    return VisitpadChiefComplaintRepository(session)


def get_visitpad_diagnosis_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadDiagnosisRepository:
    return VisitpadDiagnosisRepository(session)


def get_visitpad_chronic_illness_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChronicIllnessRepository:
    return VisitpadChronicIllnessRepository(session)


def get_visitpad_vital_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVitalRepository:
    return VisitpadVitalRepository(session)


def get_visitpad_medicine_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadMedicineRepository:
    return VisitpadMedicineRepository(session)


def get_visitpad_procedure_repository(
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadProcedureRepository:
    return VisitpadProcedureRepository(session)
