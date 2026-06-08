"""Repository interfaces (Protocol classes)."""

from typing import Protocol
from uuid import UUID

from opd.schemas.prescription.prescription import PrescriptionCreate, PrescriptionUpdate


class PrescriptionRepositoryPort(Protocol):
    def visit_has_prescription(self, tenant_id: UUID, visit_id: UUID) -> bool: ...

    def create(self, payload: PrescriptionCreate): ...

    def update(self, tenant_id: UUID, prescription_id: UUID, payload: PrescriptionUpdate): ...
