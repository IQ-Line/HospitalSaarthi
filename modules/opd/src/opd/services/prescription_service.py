"""Prescription application service."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from opd.data_access.prescription_repository import (
    PrescriptionConflictError,
    PrescriptionNotFoundError,
    PrescriptionRepository,
)
from opd.data_access.visit_status import (
    resolve_visit_status_for_prescription,
    resolve_visit_statuses_for_prescriptions,
)
from opd.schemas.prescription.prescription import (
    PrescriptionCancelRequest,
    PrescriptionCreate,
    PrescriptionDetailResponse,
    PrescriptionEncounterOverlay,
    PrescriptionFinalizeRequest,
    PrescriptionListItem,
    PrescriptionUpdate,
)
from opd.services.prescription_mapper import prescription_to_detail


class PrescriptionService:
    def __init__(self, repository: PrescriptionRepository, session: Session) -> None:
        self._repository = repository
        self._session = session

    def create(
        self,
        tenant_id: UUID,
        doctor_id: UUID,
        payload: PrescriptionCreate,
    ) -> PrescriptionDetailResponse:
        row = self._repository.create(tenant_id, doctor_id, payload)
        return prescription_to_detail(row)

    def _with_visit_status(
        self,
        tenant_id: UUID,
        visit_id: UUID,
        detail: PrescriptionDetailResponse,
    ) -> PrescriptionDetailResponse:
        visit_status = resolve_visit_status_for_prescription(
            self._session,
            tenant_id,
            visit_id,
            str(detail.status),
        )
        return detail.model_copy(update={"visit_status": visit_status})

    def get_by_id(self, tenant_id: UUID, prescription_id: UUID) -> PrescriptionDetailResponse:
        row = self._repository.get_by_id(tenant_id, prescription_id)
        detail = prescription_to_detail(row)
        return self._with_visit_status(tenant_id, row.visit_id, detail)

    def get_by_visit_id(self, tenant_id: UUID, visit_id: UUID) -> PrescriptionDetailResponse:
        row = self._repository.get_by_visit_id(tenant_id, visit_id)
        detail = prescription_to_detail(row)
        return self._with_visit_status(tenant_id, visit_id, detail)

    def get_overlays_by_visit_ids(
        self,
        tenant_id: UUID,
        visit_ids: list[UUID],
    ) -> dict[str, PrescriptionEncounterOverlay]:
        rows = self._repository.list_status_by_visit_ids(tenant_id, visit_ids)
        if not rows:
            return {}

        visit_status_by_id = resolve_visit_statuses_for_prescriptions(
            self._session,
            tenant_id,
            [(row.visit_id, str(row.status)) for row in rows],
            rx_by_visit_id={row.visit_id: row for row in rows},
        )
        return {
            str(row.visit_id): PrescriptionEncounterOverlay(
                status=row.status,
                visit_status=visit_status_by_id.get(row.visit_id, "registered"),
                reports=None,
            )
            for row in rows
        }

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
        *,
        doctor_id: UUID,
    ) -> PrescriptionDetailResponse:
        # The doctor who ends the consultation is the prescriber of record — finalize
        # stamps the prescription's doctor_id with the finalizing actor, overriding
        # whoever created the draft (e.g. a nurse capturing pre-consult vitals).
        row = self._repository.finalize(
            tenant_id, prescription_id, changed_by=payload.changed_by, doctor_id=doctor_id
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
    repository = PrescriptionRepository(session)
    return PrescriptionService(repository, session)


__all__ = [
    "PrescriptionConflictError",
    "PrescriptionNotFoundError",
    "PrescriptionService",
    "get_prescription_service",
]
