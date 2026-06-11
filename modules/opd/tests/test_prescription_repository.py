"""Repository tests for prescription lifecycle and tenant/visit constraints."""

from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

import pytest

from opd.data_access.prescription_repository import (
    PrescriptionConflictError,
    PrescriptionNotFoundError,
    PrescriptionRepository,
)
from opd.models.prescription.enums import PrescriptionStatus
from opd.schemas.prescription.prescription import PrescriptionCreate, PrescriptionUpdate
from opd.services.prescription_mapper import prescription_to_detail
from tests.conftest import DOCTOR_ID, PATIENT_ID, TENANT_A, TENANT_B, make_create_payload


def _create_payload(**kwargs) -> PrescriptionCreate:
    return PrescriptionCreate.model_validate(make_create_payload(**kwargs))


def test_create_includes_initial_status_history(prescription_repo: PrescriptionRepository) -> None:
    row = prescription_repo.create(_create_payload())
    assert row.status == PrescriptionStatus.DRAFT
    assert len(row.status_history) == 1
    assert row.status_history[0].to_status == PrescriptionStatus.DRAFT
    assert row.status_history[0].from_status is None


def test_duplicate_active_visit_raises_conflict(prescription_repo: PrescriptionRepository) -> None:
    visit_id = uuid4()
    prescription_repo.create(_create_payload(visit_id=visit_id))
    with pytest.raises(PrescriptionConflictError, match="already exists"):
        prescription_repo.create(_create_payload(visit_id=visit_id))


def test_same_visit_id_allowed_across_tenants(prescription_repo: PrescriptionRepository) -> None:
    visit_id = uuid4()
    prescription_repo.create(_create_payload(tenant_id=TENANT_A, visit_id=visit_id))
    other = prescription_repo.create(_create_payload(tenant_id=TENANT_B, visit_id=visit_id))
    assert other.tenant_id == TENANT_B


def test_soft_delete_then_create_same_visit_succeeds(
    prescription_repo: PrescriptionRepository,
) -> None:
    visit_id = uuid4()
    created = prescription_repo.create(_create_payload(visit_id=visit_id))
    prescription_repo.soft_delete(TENANT_A, created.id)
    replacement = prescription_repo.create(_create_payload(visit_id=visit_id))
    assert replacement.id != created.id
    assert replacement.visit_id == visit_id


def test_update_draft_replaces_clinical(prescription_repo: PrescriptionRepository) -> None:
    created = prescription_repo.create(_create_payload())
    updated = prescription_repo.update(
        TENANT_A,
        created.id,
        PrescriptionUpdate.model_validate(
            {"clinical": {"symptoms": [{"line_no": 1, "symptom_text": "Cough"}]}}
        ),
    )
    detail = prescription_to_detail(updated)
    assert len(detail.clinical.symptoms) == 1
    assert detail.clinical.symptoms[0].symptom_text == "Cough"


def test_update_draft_replaces_chief_complaints_same_line_no(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = prescription_repo.create(_create_payload())
    updated = prescription_repo.update(
        TENANT_A,
        created.id,
        PrescriptionUpdate.model_validate(
            {
                "clinical": {
                    "chief_complaints": [{"line_no": 1, "complaint_text": "Headache"}],
                }
            }
        ),
    )
    detail = prescription_to_detail(updated)
    assert len(detail.clinical.chief_complaints) == 1
    assert detail.clinical.chief_complaints[0].complaint_text == "Headache"


def test_finalize_and_cancel_append_status_history(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = prescription_repo.create(_create_payload())
    finalized = prescription_repo.finalize(TENANT_A, created.id, changed_by=None)
    assert finalized.status == PrescriptionStatus.FINAL
    assert any(h.to_status == PrescriptionStatus.FINAL for h in finalized.status_history)

    cancelled_rx = prescription_repo.create(_create_payload())
    cancelled = prescription_repo.cancel(
        TENANT_A,
        cancelled_rx.id,
        changed_by=None,
        reason="Patient left",
    )
    assert cancelled.status == PrescriptionStatus.CANCELLED
    assert cancelled.status_history[-1].reason == "Patient left"


def test_finalize_rejects_non_draft(prescription_repo: PrescriptionRepository) -> None:
    created = prescription_repo.create(_create_payload())
    prescription_repo.finalize(TENANT_A, created.id, changed_by=None)
    with pytest.raises(PrescriptionConflictError, match="Only draft"):
        prescription_repo.finalize(TENANT_A, created.id, changed_by=None)


def test_soft_deleted_prescription_not_found_by_id(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = prescription_repo.create(_create_payload())
    prescription_repo.soft_delete(TENANT_A, created.id)
    with pytest.raises(PrescriptionNotFoundError):
        prescription_repo.get_by_id(TENANT_A, created.id)


def test_finalize_uses_root_lookup_before_detail_reload(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = prescription_repo.create(_create_payload())
    with (
        patch.object(
            prescription_repo,
            "_get_root_by_id",
            wraps=prescription_repo._get_root_by_id,
        ) as root_get,
        patch.object(
            prescription_repo,
            "get_by_id",
            wraps=prescription_repo.get_by_id,
        ) as detail_get,
    ):
        prescription_repo.finalize(TENANT_A, created.id, changed_by=None)

    root_get.assert_called_once()
    detail_get.assert_called_once()


def test_cancel_uses_root_lookup_before_detail_reload(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = prescription_repo.create(_create_payload())
    with (
        patch.object(
            prescription_repo,
            "_get_root_by_id",
            wraps=prescription_repo._get_root_by_id,
        ) as root_get,
        patch.object(
            prescription_repo,
            "get_by_id",
            wraps=prescription_repo.get_by_id,
        ) as detail_get,
    ):
        prescription_repo.cancel(TENANT_A, created.id, changed_by=None, reason=None)

    root_get.assert_called_once()
    detail_get.assert_called_once()
