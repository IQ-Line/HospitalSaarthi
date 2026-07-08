"""Unit tests for OPD visit queue-status resolution (data_access/visit_status.py).

Ported from the deleted ``test_registration_visit_repo.py``: the
``registration_visit_repo`` symbol tests went with that retired module; these cover
the KEPT, live ``visit_status.py`` resolvers used by every ``by-visit`` / ``by-visits``
response.

After the legacy JSONB retirement, a draft's clinical content is detected SOLELY from
the normalized child tables (``prescription_form_data_has_content`` -> child-exists
check), not a ``form_data`` blob. So these seed real ``PrescriptionModel`` rows via the
repo and assert the empty-draft -> ``registered`` vs content-draft -> ``in_progress``
gate that the JSONB retirement made load-bearing.
"""

from __future__ import annotations

from uuid import uuid4

from opd.data_access.prescription_form_data import prescription_form_data_has_content
from opd.data_access.prescription_repository import PrescriptionRepository
from opd.data_access.visit_status import (
    resolve_visit_status_for_prescription,
    resolve_visit_statuses_for_prescriptions,
)
from opd.models.visit import Visit
from opd.schemas.prescription.prescription import PrescriptionCreate
from tests.conftest import DOCTOR_ID, TENANT_A


def _create_draft(repo: PrescriptionRepository, *, visit_id, with_content: bool):
    clinical = (
        {"chief_complaints": [{"line_no": 1, "complaint_text": "Fever"}]} if with_content else {}
    )
    payload = PrescriptionCreate.model_validate(
        {"visit_id": str(visit_id), "patient_id": str(uuid4()), "clinical": clinical}
    )
    return repo.create(TENANT_A, DOCTOR_ID, payload)


def test_has_content_false_for_empty_normalized_draft(prescription_repo, db_session) -> None:
    rx = _create_draft(prescription_repo, visit_id=uuid4(), with_content=False)
    db_session.flush()
    assert prescription_form_data_has_content(rx, session=db_session) is False


def test_has_content_true_for_draft_with_normalized_child(prescription_repo, db_session) -> None:
    rx = _create_draft(prescription_repo, visit_id=uuid4(), with_content=True)
    db_session.flush()
    assert prescription_form_data_has_content(rx, session=db_session) is True


def test_empty_draft_without_visit_row_resolves_registered(prescription_repo, db_session) -> None:
    visit_id = uuid4()
    rx = _create_draft(prescription_repo, visit_id=visit_id, with_content=False)
    db_session.flush()
    resolved = resolve_visit_statuses_for_prescriptions(
        db_session, TENANT_A, [(visit_id, "draft")], rx_by_visit_id={visit_id: rx}
    )
    assert resolved[visit_id] == "registered"


def test_draft_with_content_without_visit_row_resolves_in_progress(
    prescription_repo, db_session
) -> None:
    visit_id = uuid4()
    rx = _create_draft(prescription_repo, visit_id=visit_id, with_content=True)
    db_session.flush()
    resolved = resolve_visit_statuses_for_prescriptions(
        db_session, TENANT_A, [(visit_id, "draft")], rx_by_visit_id={visit_id: rx}
    )
    assert resolved[visit_id] == "in_progress"


def test_in_progress_visit_with_empty_draft_downgrades_to_registered(
    prescription_repo, db_session
) -> None:
    """visit row says in_progress, but an empty draft (no child content) downgrades it."""
    visit_id = uuid4()
    rx = _create_draft(prescription_repo, visit_id=visit_id, with_content=False)
    db_session.add(
        Visit(id=visit_id, tenant_id=TENANT_A, patient_id=uuid4(), status="in_progress")
    )
    db_session.flush()
    resolved = resolve_visit_statuses_for_prescriptions(
        db_session, TENANT_A, [(visit_id, "draft")], rx_by_visit_id={visit_id: rx}
    )
    assert resolved[visit_id] == "registered"


def test_reads_opd_visit_row_pre_consulted(db_session) -> None:
    visit_id = uuid4()
    db_session.add(
        Visit(id=visit_id, tenant_id=TENANT_A, patient_id=uuid4(), status="pre_consulted")
    )
    db_session.flush()
    assert (
        resolve_visit_status_for_prescription(db_session, TENANT_A, visit_id, "draft")
        == "pre_consulted"
    )


def test_batch_pre_consulted_in_progress_and_missing_final(db_session) -> None:
    visit_pre = uuid4()
    visit_progress = uuid4()
    db_session.add_all(
        [
            Visit(id=visit_pre, tenant_id=TENANT_A, patient_id=uuid4(), status="pre_consulted"),
            Visit(
                id=visit_progress, tenant_id=TENANT_A, patient_id=uuid4(), status="in_progress"
            ),
        ]
    )
    db_session.flush()
    missing_visit = uuid4()
    resolved = resolve_visit_statuses_for_prescriptions(
        db_session,
        TENANT_A,
        [(visit_pre, "draft"), (visit_progress, "draft"), (missing_visit, "final")],
    )
    assert resolved[visit_pre] == "pre_consulted"
    assert resolved[visit_progress] == "in_progress"
    assert resolved[missing_visit] == "completed"


def test_registered_visit_with_draft_stays_registered(db_session) -> None:
    visit_id = uuid4()
    db_session.add(
        Visit(id=visit_id, tenant_id=TENANT_A, patient_id=uuid4(), status="registered")
    )
    db_session.flush()
    resolved = resolve_visit_statuses_for_prescriptions(
        db_session, TENANT_A, [(visit_id, "draft")]
    )
    assert resolved[visit_id] == "registered"
