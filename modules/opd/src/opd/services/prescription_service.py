"""Prescription application service."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from opd.data_access.prescription_repository import (
    PrescriptionConflictError,
    PrescriptionNotFoundError,
    PrescriptionRepository,
)
from opd.schemas.prescription.prescription import (
    PrescriptionCancelRequest,
    PrescriptionCreate,
    PrescriptionDetailResponse,
    PrescriptionFinalizeRequest,
    PrescriptionListItem,
    PrescriptionUpdate,
)
from opd.services.prescription_mapper import prescription_to_detail


class PrescriptionService:
    def __init__(self, repository: PrescriptionRepository) -> None:
        self._repository = repository

    def create(self, payload: PrescriptionCreate) -> PrescriptionDetailResponse:
        row = self._repository.create(payload)
        return prescription_to_detail(row)

    def get_by_id(self, tenant_id: UUID, prescription_id: UUID) -> PrescriptionDetailResponse:
        row = self._repository.get_by_id(tenant_id, prescription_id)
        return prescription_to_detail(row)

    def get_by_visit_id(self, tenant_id: UUID, visit_id: UUID) -> PrescriptionDetailResponse:
        row = self._repository.get_by_visit_id(tenant_id, visit_id)
        return prescription_to_detail(row)

    def list_by_patient(
        self,
        tenant_id: UUID,
        patient_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PrescriptionListItem], int]:
        rows, total = self._repository.list_by_patient(
            tenant_id, patient_id, limit=limit, offset=offset
        )
        items = [PrescriptionListItem.model_validate(r) for r in rows]
        return items, total

    def update(
        self, tenant_id: UUID, prescription_id: UUID, payload: PrescriptionUpdate
    ) -> PrescriptionDetailResponse:
        row = self._repository.update(tenant_id, prescription_id, payload)
        return prescription_to_detail(row)

    def finalize(
        self,
        tenant_id: UUID,
        prescription_id: UUID,
        payload: PrescriptionFinalizeRequest,
    ) -> PrescriptionDetailResponse:
        row = self._repository.finalize(
            tenant_id, prescription_id, changed_by=payload.changed_by
        )
        return prescription_to_detail(row)

    def cancel(
        self,
        tenant_id: UUID,
        prescription_id: UUID,
        payload: PrescriptionCancelRequest,
    ) -> PrescriptionDetailResponse:
        row = self._repository.cancel(
            tenant_id,
            prescription_id,
            changed_by=payload.changed_by,
            reason=payload.reason,
        )
        return prescription_to_detail(row)

    def soft_delete(self, tenant_id: UUID, prescription_id: UUID) -> None:
        self._repository.soft_delete(tenant_id, prescription_id)


def get_prescription_service(session: Session) -> PrescriptionService:
    return PrescriptionService(PrescriptionRepository(session))


__all__ = [
    "PrescriptionConflictError",
    "PrescriptionNotFoundError",
    "PrescriptionService",
    "get_prescription_service",
]
