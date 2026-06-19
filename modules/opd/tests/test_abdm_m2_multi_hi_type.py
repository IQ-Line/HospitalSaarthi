"""Tests for multi-HI-Type ABDM persist + M2 orchestration."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch
from uuid import uuid4

from opd.integrations.abdm_m2 import (
    HI_TYPE_IMMUNIZATION,
    HI_TYPE_OP_CONSULT,
    HI_TYPE_PRESCRIPTION,
    immunization_care_context_ref,
    op_consult_care_context_ref,
    persist_visit_abdm_bundles,
    prescription_care_context_ref,
    trigger_m2_after_end_consultation,
)


def _snapshot():
    from opd.integrations.abdm_m2 import _VisitClinicalSnapshot

    return _VisitClinicalSnapshot(
        patient_id=uuid4(),
        patient_name="Patient",
        patient_gender="female",
        patient_birth_date=None,
        patient_abha_address="patient@sbx",
        practitioner_name="Dr. Rao",
        practitioner_registration_id="21-1521-3828-3227",
        clinical_summary="summary",
        form_data={
            "diagnosis": [{"notes": "Fever"}],
            "medicines": [{"medicine": "Paracetamol", "dosage": "500mg"}],
            "immunizations": [{"vaccineName": "BCG", "dateOfDose": "2020-01-01"}],
        },
        visit_number="V-001",
    )


@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2._record_foundation_base_url")
@patch("opd.integrations.abdm_m2.get_session_factory")
@patch("opd.integrations.abdm_m2._load_visit_clinical_snapshot")
@patch("opd.integrations.abdm_m2._persist_op_consult")
@patch("opd.integrations.abdm_m2._persist_prescription")
@patch("opd.integrations.abdm_m2._persist_immunization")
@patch("opd.integrations.abdm_m2._persist_health_documents")
def test_persist_visit_abdm_bundles_collects_all_contexts(
    mock_health_docs,
    mock_imm,
    mock_rx,
    mock_op,
    mock_load_snapshot,
    mock_session_factory,
    mock_rf_base,
    mock_settings,
) -> None:
    visit_id = uuid4()
    tenant_id = uuid4()
    patient_id = uuid4()

    mock_settings.return_value.abdm_m2_enabled = True
    mock_rf_base.return_value = "http://localhost:3009"
    mock_session_factory.return_value = MagicMock()
    mock_load_snapshot.return_value = _snapshot()

    mock_op.return_value = {
        "referenceNumber": op_consult_care_context_ref(visit_id),
        "display": "OP",
        "hiType": HI_TYPE_OP_CONSULT,
    }
    mock_rx.return_value = {
        "referenceNumber": prescription_care_context_ref(visit_id),
        "display": "Rx",
        "hiType": HI_TYPE_PRESCRIPTION,
    }
    mock_imm.return_value = {
        "referenceNumber": immunization_care_context_ref(visit_id),
        "display": "Imm",
        "hiType": HI_TYPE_IMMUNIZATION,
    }
    mock_health_docs.return_value = []

    contexts = persist_visit_abdm_bundles(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    assert len(contexts) == 3
    mock_op.assert_called_once()
    mock_rx.assert_called_once()
    mock_imm.assert_called_once()
    mock_health_docs.assert_called_once()


@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2._record_foundation_base_url")
@patch("opd.integrations.abdm_m2.get_session_factory")
@patch("opd.integrations.abdm_m2._load_visit_clinical_snapshot")
@patch("opd.integrations.abdm_m2._persist_op_consult")
@patch("opd.integrations.abdm_m2._persist_prescription")
def test_prescription_skipped_when_empty(
    mock_rx,
    mock_op,
    mock_load_snapshot,
    mock_session_factory,
    mock_rf_base,
    mock_settings,
) -> None:
    visit_id = uuid4()
    mock_settings.return_value.abdm_m2_enabled = True
    mock_rf_base.return_value = "http://localhost:3009"
    mock_session_factory.return_value = MagicMock()

    snap = _snapshot()
    snap = snap.__class__(
        **{
            **snap.__dict__,
            "form_data": {"diagnosis": [], "medicines": [], "immunizations": []},
        }
    )
    mock_load_snapshot.return_value = snap
    mock_op.return_value = {
        "referenceNumber": op_consult_care_context_ref(visit_id),
        "display": "OP",
        "hiType": HI_TYPE_OP_CONSULT,
    }
    mock_rx.return_value = None

    with patch("opd.integrations.abdm_m2._persist_immunization", return_value=None), patch(
        "opd.integrations.abdm_m2._persist_health_documents",
        return_value=[],
    ):
        contexts = persist_visit_abdm_bundles(
            tenant_id=uuid4(),
            patient_id=uuid4(),
            visit_id=visit_id,
        )

    assert len(contexts) == 1
    mock_rx.assert_called_once()


@patch("opd.integrations.abdm_m2.persist_visit_abdm_bundles")
@patch("opd.integrations.abdm_m2._integration_hub_base_url")
@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2.urllib.request.urlopen")
def test_trigger_m2_orchestrates_all_contexts(
    mock_urlopen,
    mock_settings,
    mock_hub_base,
    mock_persist,
) -> None:
    visit_id = uuid4()
    tenant_id = uuid4()
    patient_id = uuid4()

    mock_settings.return_value.abdm_m2_enabled = True
    mock_hub_base.return_value = "http://localhost:3007"
    mock_persist.return_value = [
        {
            "referenceNumber": op_consult_care_context_ref(visit_id),
            "display": "OP consult",
            "hiType": HI_TYPE_OP_CONSULT,
        },
        {
            "referenceNumber": prescription_care_context_ref(visit_id),
            "display": "Prescription",
            "hiType": HI_TYPE_PRESCRIPTION,
        },
    ]

    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.__enter__.return_value = mock_response
    mock_response.__exit__.return_value = None
    mock_urlopen.return_value = mock_response

    trigger_m2_after_end_consultation(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    mock_persist.assert_called_once()
    req = mock_urlopen.call_args[0][0]
    body = json.loads(req.data.decode("utf-8"))
    assert body["patientId"] == str(patient_id)
    assert len(body["careContexts"]) == 2
    hi_types = {ctx["hiType"] for ctx in body["careContexts"]}
    assert hi_types == {HI_TYPE_OP_CONSULT, HI_TYPE_PRESCRIPTION}
