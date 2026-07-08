"""Sourcing-equivalence test for the ABDM-M2 JSONB->normalized re-point (step 3).

WHAT THIS PROVES (the complement to ``test_abdm_m2_wire_contract.py``)
---------------------------------------------------------------------
The wire-contract test mocks ``_load_visit_clinical_snapshot`` *wholesale* and feeds
the pipeline a hand-built snapshot — it anchors the persist/HTTP/orchestration contract
but says nothing about where the snapshot's ``form_data`` comes from.

This test exercises the **real sourcing chain** that step 3 introduced:

    seed normalized PrescriptionModel + children (via the real repo.create)
      -> REAL ``_load_visit_clinical_snapshot``  (no sourcing mock)
        -> REAL ``build_form_data_from_prescription_model``  (the re-point)
          -> REAL fhir_bundle_mappers + hims_sdk_fhir builders
            -> capture the Record-Foundation POST bodies

No ``form_data`` override is passed (this is the normalized ``/finalize`` path), so the
ONLY possible source of clinical content in the bundles is the normalized child tables.
The strongest assertions below are on **diagnosis** and **allergy** content: the legacy
``effective_form_data`` 5-table reconstruction silently dropped both, so their presence
here proves the bundles are now sourced from the full normalized aggregate.

Boundaries mocked (genuinely external to sourcing): patient/practitioner/visit lookups,
the Record-Foundation HTTP transport, PDF render, the health-document blob repo, and the
session factory (so the pipeline reads the same real-Postgres session we seeded).
The clinical sourcing itself is entirely real.
"""

from __future__ import annotations

import json
from contextlib import ExitStack
from datetime import date
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from opd.integrations import abdm_m2
from opd.schemas.prescription.prescription import PrescriptionCreate
from tests.conftest import DOCTOR_ID, TENANT_A

RF_BASE = "http://rf.test"
CARE_CONTEXTS_URL = f"{RF_BASE}/api/record-foundation/v1/care-contexts"
BUNDLES_URL = f"{RF_BASE}/api/record-foundation/v1/bundles"

PATIENT_ABHA = "asha@sbx"
PATIENT_NAME = "Asha Devi"
VISIT_NUMBER = "V-001"
PRACTITIONER_NAME = "Dr. Asha Rao"

# Clinical content seeded ONLY into normalized child tables (no JSONB blob, no override).
DIAGNOSIS_TEXT = "Viral fever"
MEDICINE_NAME = "Paracetamol"
COMPLAINT_TEXT = "Productive cough"
ALLERGEN_TEXT = "Penicillin"
VACCINE_NAME = "BCG"


def _expected_refs(visit_id: UUID) -> dict[str, str]:
    """Literal care-context ref formats (pinned, NOT imported from the module under test)."""
    return {
        abdm_m2.HI_TYPE_OP_CONSULT: f"{visit_id}_OPConsultNote",
        abdm_m2.HI_TYPE_PRESCRIPTION: f"{visit_id}_Prescription",
        abdm_m2.HI_TYPE_IMMUNIZATION: f"{visit_id}_ImmunizationRecord",
    }


def _rich_clinical_payload() -> dict:
    """A clinical aggregate spanning sections the legacy 5-table path dropped (dx/allergy/plan)."""
    return {
        "chief_complaints": [
            {
                "line_no": 1,
                "complaint_text": COMPLAINT_TEXT,
                "duration_value": "3",
                "duration_unit": "days",
                "severity": "moderate",
            }
        ],
        "diagnoses": [{"line_no": 1, "notes": DIAGNOSIS_TEXT, "certainty": "confirmed"}],
        "medicines": [
            {
                "line_no": 1,
                "name": MEDICINE_NAME,
                "strength": "500mg",
                "dosage": "1 tablet",
                "frequency": "BD",
                "duration": "5",
            }
        ],
        "medical_history_allergies": [
            {
                "line_no": 1,
                "allergen_text": ALLERGEN_TEXT,
                "reaction_text": "rash",
                "severity": "mild",
            }
        ],
        "vaccines_required": [{"line_no": 1, "name": VACCINE_NAME}],
        "legacy_vitals": {"pulse_bpm": 80, "bp_systolic": 120, "bp_diastolic": 80},
        "medical_history": {"smoking_status": "never", "other_notes": "History of present illness"},
        "care_plan": {"advice": "Rest and hydration", "refer_to": "Cardiology"},
    }


def _seed_normalized_prescription(
    session: Session, *, visit_id: UUID, patient_id: UUID, clinical: dict
):
    """Create a normalized prescription aggregate via the REAL repo write path; return it."""
    from opd.data_access.prescription_repository import PrescriptionRepository

    repo = PrescriptionRepository(session)
    payload = PrescriptionCreate.model_validate(
        {
            "visit_id": str(visit_id),
            "patient_id": str(patient_id),
            "clinical": clinical,
        }
    )
    rx = repo.create(TENANT_A, DOCTOR_ID, payload)
    session.flush()
    return rx


class _CapturedPosts:
    """Splits the captured Record-Foundation POSTs into care-contexts and bundles."""

    def __init__(self) -> None:
        self.care_contexts: list[dict] = []
        self.bundles: list[dict] = []

    def record(self, *, url: str, body: dict | None) -> None:
        if url == CARE_CONTEXTS_URL:
            self.care_contexts.append(body or {})
        elif url == BUNDLES_URL:
            self.bundles.append(body or {})

    def care_refs_by_hi_type(self) -> dict[str, str]:
        return {cc["source_record_type"]: cc["source_record_id"] for cc in self.care_contexts}

    def bundle_for_care_ref(self, care_ref: str) -> dict:
        for body in self.bundles:
            bundle_json = body.get("bundle_json") or {}
            if bundle_json.get("identifier", {}).get("value") == care_ref:
                return bundle_json
        raise AssertionError(f"no stored bundle for care_ref={care_ref}")


def _run_pipeline_capture(
    session: Session,
    *,
    visit_id: UUID,
    patient_id: UUID,
) -> _CapturedPosts:
    """Single source of pipeline wiring: run the REAL persist pipeline, capture RF POSTs.

    Seeding is the caller's job (so soft-delete / sparse / rich variants compose freely).
    The pipeline sources clinical content solely from the normalized aggregate.
    """
    captured = _CapturedPosts()

    def _http_json_capture(*, method: str, url: str, tenant_id, body=None, timeout=30):
        captured.record(url=url, body=body)
        return {"data": {"id": str(uuid4())}}

    health_repo = MagicMock()
    health_repo.list_active_for_visit.return_value = []

    with ExitStack() as stack:

        def patch_abdm(name: str, **kwargs):
            return stack.enter_context(patch.object(abdm_m2, name, **kwargs))

        patch_abdm("get_settings", return_value=MagicMock(abdm_m2_enabled=True))
        patch_abdm("_record_foundation_base_url", return_value=RF_BASE)
        patch_abdm("get_session_factory", return_value=lambda: session)
        patch_abdm(
            "load_op_consult_patient_fields",
            return_value={
                "patient_name": PATIENT_NAME,
                "gender": "female",
                "abha_address": PATIENT_ABHA,
                "patient_date_of_birth": date(1990, 1, 1),
            },
        )
        patch_abdm("load_visit_patient_source", return_value=MagicMock(visit_number=VISIT_NUMBER))
        patch_abdm("_resolve_practitioner_name", return_value=PRACTITIONER_NAME)
        patch_abdm("_render_report_pdf_base64", return_value=None)
        patch_abdm("HealthDocumentRepository", return_value=health_repo)
        patch_abdm("_http_json", side_effect=_http_json_capture)

        abdm_m2.persist_visit_abdm_bundles(
            tenant_id=TENANT_A,
            patient_id=patient_id,
            visit_id=visit_id,
        )

    return captured


def _run_normalized_pipeline(
    session: Session, *, visit_id: UUID, patient_id: UUID, clinical: dict | None = None
) -> _CapturedPosts:
    """Seed a normalized aggregate (rich by default), then run the no-override pipeline."""
    _seed_normalized_prescription(
        session,
        visit_id=visit_id,
        patient_id=patient_id,
        clinical=clinical if clinical is not None else _rich_clinical_payload(),
    )
    return _run_pipeline_capture(session, visit_id=visit_id, patient_id=patient_id)


def test_normalized_aggregate_yields_three_care_contexts_with_literal_refs(
    db_session: Session,
) -> None:
    visit_id = uuid4()
    patient_id = uuid4()
    captured = _run_normalized_pipeline(db_session, visit_id=visit_id, patient_id=patient_id)

    expected = _expected_refs(visit_id)
    refs = captured.care_refs_by_hi_type()

    # OP consult + prescription (dx/meds present) + immunization (vaccine present) all fire.
    assert set(refs) == set(expected)
    assert refs == expected


def test_normalized_diagnosis_and_meds_reach_the_prescription_bundle(
    db_session: Session,
) -> None:
    """Diagnosis is the load-bearing assertion: the legacy 5-table path dropped it entirely."""
    visit_id = uuid4()
    patient_id = uuid4()
    captured = _run_normalized_pipeline(db_session, visit_id=visit_id, patient_id=patient_id)

    rx_ref = _expected_refs(visit_id)[abdm_m2.HI_TYPE_PRESCRIPTION]
    rx_blob = json.dumps(captured.bundle_for_care_ref(rx_ref))

    assert DIAGNOSIS_TEXT in rx_blob
    assert MEDICINE_NAME in rx_blob


def test_normalized_clinical_content_reaches_the_op_consult_bundle(
    db_session: Session,
) -> None:
    visit_id = uuid4()
    patient_id = uuid4()
    captured = _run_normalized_pipeline(db_session, visit_id=visit_id, patient_id=patient_id)

    op_ref = _expected_refs(visit_id)[abdm_m2.HI_TYPE_OP_CONSULT]
    op_blob = json.dumps(captured.bundle_for_care_ref(op_ref))

    # Sections the legacy reconstruction dropped — only present if sourced from normalized children.
    assert DIAGNOSIS_TEXT in op_blob
    assert ALLERGEN_TEXT in op_blob
    # Sections the legacy path DID cover — must survive the re-point.
    assert MEDICINE_NAME in op_blob
    assert COMPLAINT_TEXT in op_blob
    # Identity carried by the snapshot/mappers (regulatorily load-bearing for ABDM).
    assert PATIENT_ABHA in op_blob
    assert VISIT_NUMBER in op_blob


def test_normalized_immunization_reaches_the_immunization_bundle(
    db_session: Session,
) -> None:
    visit_id = uuid4()
    patient_id = uuid4()
    captured = _run_normalized_pipeline(db_session, visit_id=visit_id, patient_id=patient_id)

    imm_ref = _expected_refs(visit_id)[abdm_m2.HI_TYPE_IMMUNIZATION]
    imm_blob = json.dumps(captured.bundle_for_care_ref(imm_ref))

    assert VACCINE_NAME in imm_blob


def test_empty_normalized_aggregate_emits_only_op_consult(db_session: Session) -> None:
    """No dx/meds/vaccine -> prescription + immunization gates close; OP consult still fires."""
    visit_id = uuid4()
    patient_id = uuid4()
    captured = _run_normalized_pipeline(
        db_session,
        visit_id=visit_id,
        patient_id=patient_id,
        clinical={"chief_complaints": [{"line_no": 1, "complaint_text": COMPLAINT_TEXT}]},
    )

    refs = captured.care_refs_by_hi_type()
    assert set(refs) == {abdm_m2.HI_TYPE_OP_CONSULT}
    assert refs[abdm_m2.HI_TYPE_OP_CONSULT] == f"{visit_id}_OPConsultNote"


def test_soft_deleted_prescription_yields_no_bundles(db_session: Session) -> None:
    """Lock the deliberate semantics change: a soft-deleted rx is excluded from M2 sourcing.

    The replaced JSONB get_prescription_by_visit_id had no deleted_at filter; the normalized
    get_by_visit_id does. This pins the chosen (more-correct) behavior so a future repo
    refactor cannot silently flip it back to pushing deleted records to ABDM.
    """
    from opd.data_access.prescription_repository import PrescriptionRepository

    visit_id = uuid4()
    patient_id = uuid4()
    rx = _seed_normalized_prescription(
        db_session, visit_id=visit_id, patient_id=patient_id, clinical=_rich_clinical_payload()
    )
    PrescriptionRepository(db_session).soft_delete(TENANT_A, rx.id)
    db_session.flush()

    captured = _run_pipeline_capture(db_session, visit_id=visit_id, patient_id=patient_id)

    assert captured.care_contexts == []
    assert captured.bundles == []
