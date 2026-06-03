"""FastAPI dependencies for OPD HTTP handlers."""

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from opd.core.database import get_db_session
from opd.data_access.prescription_repository import PrescriptionRepository
from opd.services.prescription_service import PrescriptionService


def get_session() -> Generator[Session, None, None]:
    yield from get_db_session()


def get_prescription_repository(
    session: Annotated[Session, Depends(get_session)],
) -> PrescriptionRepository:
    return PrescriptionRepository(session)


def get_prescription_service(
    repository: Annotated[PrescriptionRepository, Depends(get_prescription_repository)],
) -> PrescriptionService:
    return PrescriptionService(repository)
