"""Repository tests for prescription lifecycle and tenant/visit constraints."""

from __future__ import annotations

from unittest.mock import patch
from uuid import UUID, uuid4

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


def _create(
    repo: PrescriptionRepository,
    *,
    tenant_id: UUID = TENANT_A,
    doctor_id: UUID = DOCTOR_ID,
    **kwargs,
):
    payload = PrescriptionCreate.model_validate(make_create_payload(**kwargs))
    return repo.create(tenant_id, doctor_id, payload)


def test_create_includes_initial_status_history(prescription_repo: PrescriptionRepository) -> None:
    row = _create(prescription_repo)
    assert row.status == PrescriptionStatus.DRAFT
    assert len(row.status_history) == 1
    assert row.status_history[0].to_status == PrescriptionStatus.DRAFT
    assert row.status_history[0].from_status is None


def test_duplicate_active_visit_raises_conflict(prescription_repo: PrescriptionRepository) -> None:
    visit_id = uuid4()
    _create(prescription_repo, visit_id=visit_id)
    with pytest.raises(PrescriptionConflictError, match="already exists"):
        _create(prescription_repo, visit_id=visit_id)


def test_same_visit_id_allowed_across_tenants(prescription_repo: PrescriptionRepository) -> None:
    visit_id = uuid4()
    _create(prescription_repo, tenant_id=TENANT_A, visit_id=visit_id)
    other = _create(prescription_repo, tenant_id=TENANT_B, visit_id=visit_id)
    assert other.tenant_id == TENANT_B


def test_soft_delete_then_create_same_visit_succeeds(
    prescription_repo: PrescriptionRepository,
) -> None:
    visit_id = uuid4()
    created = _create(prescription_repo, visit_id=visit_id)
    prescription_repo.soft_delete(TENANT_A, created.id)
    replacement = _create(prescription_repo, visit_id=visit_id)
    assert replacement.id != created.id
    assert replacement.visit_id == visit_id


def test_update_draft_replaces_clinical(prescription_repo: PrescriptionRepository) -> None:
    created = _create(prescription_repo)
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
    created = _create(prescription_repo)
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


def test_diet_type_and_imaging_when_text_round_trip(
    prescription_repo: PrescriptionRepository,
) -> None:
    """diet_type and imaging when_text are FE-edited fields that had no normalized
    column (they lived only in the legacy form_data blob). Prove they now survive
    create -> persist -> detail read so the FE cutover off the JSONB family is lossless.
    """
    payload = PrescriptionCreate.model_validate(
        {
            "visit_id": str(uuid4()),
            "patient_id": str(PATIENT_ID),
            "clinical": {
                "medical_history": {"diet_type": "Vegetarian"},
                "ordered_imaging": [
                    {"line_no": 1, "name": "Chest X-Ray", "when_text": "in 2 weeks"},
                ],
            },
        }
    )
    created = prescription_repo.create(TENANT_A, DOCTOR_ID, payload)
    detail = prescription_to_detail(prescription_repo.get_by_id(TENANT_A, created.id))

    assert detail.clinical.medical_history is not None
    assert detail.clinical.medical_history.diet_type == "Vegetarian"
    assert len(detail.clinical.ordered_imaging) == 1
    assert detail.clinical.ordered_imaging[0].when_text == "in 2 weeks"


def test_update_draft_preserves_diet_type_and_imaging_when_text(
    prescription_repo: PrescriptionRepository,
) -> None:
    """The draft-update path clears and re-applies clinical children; confirm the two
    new fields round-trip through that replace path too (not just initial create)."""
    created = _create(prescription_repo)
    updated = prescription_repo.update(
        TENANT_A,
        created.id,
        PrescriptionUpdate.model_validate(
            {
                "clinical": {
                    "medical_history": {"diet_type": "Vegan"},
                    "ordered_imaging": [
                        {"line_no": 1, "name": "MRI Brain", "when_text": "before next visit"},
                    ],
                }
            }
        ),
    )
    detail = prescription_to_detail(updated)
    assert detail.clinical.medical_history is not None
    assert detail.clinical.medical_history.diet_type == "Vegan"
    assert detail.clinical.ordered_imaging[0].when_text == "before next visit"


def test_finalize_and_cancel_append_status_history(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = _create(prescription_repo)
    finalized = prescription_repo.finalize(
        TENANT_A, created.id, changed_by=None, doctor_id=DOCTOR_ID
    )
    assert finalized.status == PrescriptionStatus.FINAL
    assert any(h.to_status == PrescriptionStatus.FINAL for h in finalized.status_history)

    cancelled_rx = _create(prescription_repo)
    cancelled = prescription_repo.cancel(
        TENANT_A,
        cancelled_rx.id,
        changed_by=None,
        reason="Patient left",
    )
    assert cancelled.status == PrescriptionStatus.CANCELLED
    assert cancelled.status_history[-1].reason == "Patient left"


def test_finalize_stamps_finalizing_doctor_as_prescriber(
    prescription_repo: PrescriptionRepository,
) -> None:
    """The doctor who finalizes is the prescriber of record, overriding the creator.

    Mirrors a nurse-created draft (doctor_id = the creating actor) finalized by the
    attending doctor: finalize must overwrite doctor_id with the finalizing actor.
    """
    finalizing_doctor = UUID("99999999-9999-9999-9999-999999999999")
    created = _create(prescription_repo, doctor_id=DOCTOR_ID)
    assert created.doctor_id == DOCTOR_ID

    finalized = prescription_repo.finalize(
        TENANT_A, created.id, changed_by=None, doctor_id=finalizing_doctor
    )

    assert finalized.doctor_id == finalizing_doctor


def test_finalize_with_unknown_actor_keeps_existing_prescriber(
    prescription_repo: PrescriptionRepository,
) -> None:
    """A finalize with no resolvable actor (doctor_id=None) must NOT clobber the existing
    prescriber — it is never worse than leaving doctor_id untouched."""
    created = _create(prescription_repo, doctor_id=DOCTOR_ID)
    finalized = prescription_repo.finalize(
        TENANT_A, created.id, changed_by=None, doctor_id=None
    )

    assert finalized.doctor_id == DOCTOR_ID


def test_finalize_rejects_non_draft(prescription_repo: PrescriptionRepository) -> None:
    created = _create(prescription_repo)
    prescription_repo.finalize(TENANT_A, created.id, changed_by=None, doctor_id=DOCTOR_ID)
    with pytest.raises(PrescriptionConflictError, match="Only draft"):
        prescription_repo.finalize(TENANT_A, created.id, changed_by=None, doctor_id=DOCTOR_ID)


def test_soft_deleted_prescription_not_found_by_id(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = _create(prescription_repo)
    prescription_repo.soft_delete(TENANT_A, created.id)
    with pytest.raises(PrescriptionNotFoundError):
        prescription_repo.get_by_id(TENANT_A, created.id)


def test_finalize_uses_root_lookup_before_detail_reload(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = _create(prescription_repo)
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
        prescription_repo.finalize(TENANT_A, created.id, changed_by=None, doctor_id=DOCTOR_ID)

    root_get.assert_called_once()
    detail_get.assert_called_once()


def test_cancel_uses_root_lookup_before_detail_reload(
    prescription_repo: PrescriptionRepository,
) -> None:
    created = _create(prescription_repo)
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
