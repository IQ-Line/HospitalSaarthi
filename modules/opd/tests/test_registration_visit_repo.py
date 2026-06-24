from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from opd.data_access.registration_visit_repo import (
    effective_visit_status,
    opd_status_filter_to_registration,
    registration_status_to_opd_visit_status,
)
from opd.data_access.visit_status import (
    effective_encounter_status,
    resolve_visit_status_for_prescription,
    resolve_visit_statuses_for_prescriptions,
)
from opd.models.visit import Visit


def test_registration_status_maps_pending_to_registered() -> None:
    assert registration_status_to_opd_visit_status("pending") == "registered"
    assert registration_status_to_opd_visit_status("in_progress") == "in_progress"


def test_opd_status_filter_maps_registered_to_pending() -> None:
    assert opd_status_filter_to_registration("registered") == "pending"
    assert opd_status_filter_to_registration("in-progress") == "in_progress"


def test_effective_visit_status_overlays_final_prescription() -> None:
    assert effective_visit_status("in_progress", "final") == "completed"
    assert effective_visit_status("pending", "final") == "completed"
    assert effective_visit_status("in_progress", "draft") == "in_progress"
    assert effective_visit_status("pending", None) == "registered"


def test_registration_intake_complete_is_not_consulted() -> None:
    assert effective_visit_status("completed", None) == "registered"
    assert effective_visit_status("completed", "draft") == "registered"


def test_resolve_visit_status_for_prescription_reads_opd_visit_row(db_session) -> None:
    from tests.conftest import TENANT_A

    visit_id = uuid4()
    db_session.add(
        Visit(
            id=visit_id,
            tenant_id=TENANT_A,
            patient_id=uuid4(),
            status="pre_consulted",
        )
    )
    db_session.flush()

    assert (
        resolve_visit_status_for_prescription(db_session, TENANT_A, visit_id, "draft")
        == "pre_consulted"
    )


def test_resolve_visit_statuses_for_prescriptions_batch(db_session) -> None:
    from tests.conftest import TENANT_A

    visit_pre = uuid4()
    visit_progress = uuid4()
    db_session.add_all(
        [
            Visit(
                id=visit_pre,
                tenant_id=TENANT_A,
                patient_id=uuid4(),
                status="pre_consulted",
            ),
            Visit(
                id=visit_progress,
                tenant_id=TENANT_A,
                patient_id=uuid4(),
                status="in_progress",
            ),
        ]
    )
    db_session.flush()

    missing_visit = uuid4()
    resolved = resolve_visit_statuses_for_prescriptions(
        db_session,
        TENANT_A,
        [
            (visit_pre, "draft"),
            (visit_progress, "draft"),
            (missing_visit, "final"),
        ],
    )
    assert resolved[visit_pre] == "pre_consulted"
    assert resolved[visit_progress] == "in_progress"
    assert resolved[missing_visit] == "completed"


def test_resolve_visit_statuses_for_prescription_model_without_visit_row(db_session) -> None:
    """Batch overlays pass lean PrescriptionModel rows; must not assume form_data exists."""
    from opd.models.prescription import PrescriptionModel
    from opd.models.prescription.enums import PrescriptionStatus
    from tests.conftest import TENANT_A

    visit_id = uuid4()
    patient_id = uuid4()
    doctor_id = uuid4()
    rx = PrescriptionModel(
        tenant_id=TENANT_A,
        visit_id=visit_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        status=PrescriptionStatus.DRAFT,
    )
    db_session.add(rx)
    db_session.flush()

    resolved = resolve_visit_statuses_for_prescriptions(
        db_session,
        TENANT_A,
        [(visit_id, "draft")],
        rx_by_visit_id={visit_id: rx},
    )
    assert resolved[visit_id] == "registered"


def test_effective_encounter_status_empty_draft_stays_registered() -> None:
    visit = SimpleNamespace(status="in_progress")
    rx = SimpleNamespace(status="draft", form_data={})
    assert effective_encounter_status(visit, rx) == "registered"


def test_effective_encounter_status_draft_with_content_stays_in_progress() -> None:
    visit = SimpleNamespace(status="in_progress")
    rx = SimpleNamespace(
        status="draft",
        form_data={"chiefComplaints": [{"complaint": "Fever"}]},
    )
    assert effective_encounter_status(visit, rx) == "in_progress"


def test_registered_visit_with_draft_stays_registered(db_session) -> None:
    from tests.conftest import TENANT_A

    visit_id = uuid4()
    db_session.add(
        Visit(
            id=visit_id,
            tenant_id=TENANT_A,
            patient_id=uuid4(),
            status="registered",
        )
    )
    db_session.flush()

    resolved = resolve_visit_statuses_for_prescriptions(
        db_session,
        TENANT_A,
        [(visit_id, "draft")],
    )
    assert resolved[visit_id] == "registered"
