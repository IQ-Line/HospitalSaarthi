"""Wire-contract safety net for the end-of-consultation -> ABDM-M2 pipeline.

WHY THIS EXISTS
---------------
The ABDM-M2 automation is the platform's integration USP, and the consolidation
plan (docs/architecture/cleanup/opd-prescription-api-comparison.md §4 step 2) will
*re-point* the bundle source from the JSONB ``effective_form_data`` merge to the
normalized ``PrescriptionModel`` repo. Before that re-point, the pipeline had no
test that asserted the actual HTTP payloads Record Foundation and the integration
hub receive: ``test_abdm_m2_multi_hi_type`` mocks **every** ``_persist_*`` function,
so the care-context POST body, the bundle POST body, and the M2 orchestration body
were never pinned.

This module pins exactly that. It drives the **real** pipeline
(``trigger_m2_after_end_consultation`` -> ``persist_visit_abdm_bundles`` -> real
``_persist_*`` -> real ``fhir_bundle_mappers`` -> real ``hims_sdk_fhir`` builders)
from a fixed clinical snapshot, mocking only the genuine boundaries:

  * ``_load_visit_clinical_snapshot`` -- the snapshot SOURCING.
  * ``_http_json`` -- care-context + bundle POST transport (captured).
  * ``urllib.request.urlopen`` -- the M2 orchestration POST transport (captured).
  * ``_render_report_pdf_base64`` -- the external PDF-platform call.
  * ``HealthDocumentRepository`` -- the blob/health-document boundary.

SCOPE (read before trusting this as a re-point safety net)
----------------------------------------------------------
This pins the persist/bundle/HTTP contract **below the snapshot boundary** only.
``_load_visit_clinical_snapshot`` is mocked *wholesale* and fed a hand-built
``_VisitClinicalSnapshot`` -- but that loader is exactly the code step 3 rewrites
(JSONB ``effective_form_data`` merge -> normalized ``PrescriptionModel`` sourcing).
So this test proves the persist side is preserved; it proves **nothing** about
whether normalized rows produce an equivalent snapshot. It does NOT exercise the
sourcing chain step 3 touches (``effective_form_data`` / ``_merge_form_data`` /
immunization dedup / gender-abha-birthdate derivation / visit_number lookup).

Consequences, stated honestly:
  * The safety net is **only half-built** until step 3 adds its complementary
    sourcing-equivalence test: seed normalized child tables, run the REAL
    ``_load_visit_clinical_snapshot`` (no sourcing mock), and assert the produced
    snapshot -> same care_refs / resource types / clinical strings asserted here.
    Per the plan (§5), the ``form_data`` column drop is gated on that test passing.
  * This test survives the re-point unchanged **only if** step 3 keeps
    ``_VisitClinicalSnapshot.form_data`` form-shaped. Plan §4.2 ("delete the
    form_data round-trip converters") may change that field's shape; if so this
    test's ``RICH_FORM_DATA`` + the mappers' consumption must change in lockstep --
    treat that as a forced re-examination signal, not a silent break.

The SDK builders mint non-deterministic resource ids + timestamps, so assertions
target stable facts: the deterministic ``identifier.value`` (== care_ref), the
NRCES profile URLs, the resource types present, and the clinical-content strings
(``"Paracetamol" in json.dumps(bundle)``) -- the last is what turns this into a
real mutation net rather than a skeleton check.
"""

from __future__ import annotations

import json
from contextlib import ExitStack
from typing import Any
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from hims_sdk_fhir import NRCES_PROFILES

from opd.integrations import abdm_m2
from opd.integrations.abdm_m2 import (
    HI_TYPE_IMMUNIZATION,
    HI_TYPE_OP_CONSULT,
    HI_TYPE_PRESCRIPTION,
    _VisitClinicalSnapshot,
    trigger_m2_after_end_consultation,
)

RF_BASE = "http://rf.test"
HUB_BASE = "http://hub.test"
CARE_CONTEXTS_URL = f"{RF_BASE}/api/record-foundation/v1/care-contexts"
BUNDLES_URL = f"{RF_BASE}/api/record-foundation/v1/bundles"
M2_URL = f"{HUB_BASE}/api/abdm/v1/m2/orchestrate/after-care-contexts"

# A %PDF-prefixed payload so DocumentReference/Binary attachments are exercised.
PDF_BASE64 = "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp0cmFpbGVyPDw+PgolJUVPRgo="

RICH_FORM_DATA: dict[str, Any] = {
    "chiefComplaints": [{"complaint": "Fever", "duration": "3", "durationUnit": "days"}],
    "medicalHistory": {"historyOfPresentIllness": "Intermittent fever since 3 days"},
    "diagnosis": [{"notes": "Viral fever", "certainty": "presumed"}],
    "medicines": [
        {"medicine": "Paracetamol", "dosage": "500mg", "frequency": "BD", "days": "5"}
    ],
    "allergyDetails": [{"allergen": "Penicillin", "reaction": "Rash", "severity": "moderate"}],
    "vitals": {"systolic_bp": "120", "diastolic_bp": "80", "pulse_rate": "78"},
    "carePlan": {"advice": "Rest and fluids"},
    "immunizations": [{"vaccineName": "BCG", "dateOfDose": "2020-01-01", "doseNumber": 1}],
}


def _expected_refs(visit_id: UUID) -> dict[str, str]:
    """The literal care-context reference formats (legacy ABDM linking ids).

    Pinned as literals -- NOT via the source helpers -- so an accidental change to
    a care_ref suffix (which would silently break ABDM linkage) fails these tests.
    """
    return {
        HI_TYPE_OP_CONSULT: f"{visit_id}_OPConsultNote",
        HI_TYPE_PRESCRIPTION: f"{visit_id}_Prescription",
        HI_TYPE_IMMUNIZATION: f"{visit_id}_ImmunizationRecord",
    }


def _snapshot(patient_id: UUID, *, form_data: dict[str, Any]) -> _VisitClinicalSnapshot:
    return _VisitClinicalSnapshot(
        patient_id=patient_id,
        patient_name="Asha Devi",
        patient_gender="female",
        patient_birth_date=None,
        patient_abha_address="asha@sbx",
        practitioner_name="Dr. Rao",
        practitioner_registration_id="21-1521-3828-3227",
        clinical_summary="Viral fever; Paracetamol",
        form_data=form_data,
        visit_number="V-001",
    )


class _PipelineRun:
    """Captured side effects of one ``trigger_m2_after_end_consultation`` call."""

    def __init__(self, http_json: MagicMock, urlopen: MagicMock) -> None:
        self._http_json = http_json
        self._urlopen = urlopen

    def _bodies(self, url: str) -> list[dict[str, Any]]:
        return [
            call.kwargs["body"]
            for call in self._http_json.call_args_list
            if call.kwargs.get("url") == url and call.kwargs.get("body") is not None
        ]

    @property
    def care_context_posts(self) -> list[dict[str, Any]]:
        return self._bodies(CARE_CONTEXTS_URL)

    @property
    def bundle_posts(self) -> list[dict[str, Any]]:
        return self._bodies(BUNDLES_URL)

    @property
    def m2_post(self) -> dict[str, Any] | None:
        if not self._urlopen.call_args_list:
            return None
        request = self._urlopen.call_args_list[0].args[0]
        assert request.full_url == M2_URL
        assert request.method == "POST"
        return json.loads(request.data.decode("utf-8"))

    @property
    def urlopen_call_count(self) -> int:
        return self._urlopen.call_count


def _run_pipeline(
    snapshot: _VisitClinicalSnapshot,
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
    abdm_enabled: bool = True,
    rf_base: str | None = RF_BASE,
    hub_base: str | None = HUB_BASE,
) -> _PipelineRun:
    """Drive the real pipeline with only the genuine boundaries mocked."""
    settings = MagicMock()
    settings.abdm_m2_enabled = abdm_enabled

    health_repo_instance = MagicMock()
    health_repo_instance.list_active_for_visit.return_value = []

    def _http_json_response(**_kwargs: Any) -> dict[str, Any]:
        # Both the care-context create and the bundle store read ["data"]["id"].
        return {"data": {"id": str(uuid4())}}

    urlopen_response = MagicMock()
    urlopen_response.status = 200
    urlopen_response.__enter__.return_value = urlopen_response
    urlopen_response.__exit__.return_value = None

    with ExitStack() as stack:

        def patch_abdm(name: str, **kwargs: Any) -> MagicMock:
            return stack.enter_context(patch.object(abdm_m2, name, **kwargs))

        patch_abdm("get_settings", return_value=settings)
        patch_abdm("get_session_factory", return_value=MagicMock(return_value=MagicMock()))
        patch_abdm("_record_foundation_base_url", return_value=rf_base)
        patch_abdm("_integration_hub_base_url", return_value=hub_base)
        patch_abdm("_load_visit_clinical_snapshot", return_value=snapshot)
        patch_abdm("_render_report_pdf_base64", return_value=PDF_BASE64)
        patch_abdm("HealthDocumentRepository", return_value=health_repo_instance)
        http_json = patch_abdm("_http_json", side_effect=_http_json_response)
        urlopen = stack.enter_context(
            patch.object(abdm_m2.urllib.request, "urlopen", return_value=urlopen_response)
        )

        trigger_m2_after_end_consultation(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
        )
        return _PipelineRun(http_json, urlopen)


@pytest.fixture()
def ids() -> tuple[UUID, UUID, UUID]:
    return uuid4(), uuid4(), uuid4()  # tenant, patient, visit


def test_hi_type_wire_literals_are_stable() -> None:
    """Downstream ABDM consumers key on these literal hiType values, and they are the
    care-context ``source_record_type``. A coordinated rename of the constants would keep
    the set/join assertions green, so pin the literals directly.
    """
    assert HI_TYPE_OP_CONSULT == "OPCONSULTATION"
    assert HI_TYPE_PRESCRIPTION == "PRESCRIPTION"
    assert HI_TYPE_IMMUNIZATION == "IMMUNIZATIONRECORD"


def test_end_consult_creates_three_care_contexts(ids: tuple[UUID, UUID, UUID]) -> None:
    tenant_id, patient_id, visit_id = ids
    run = _run_pipeline(
        _snapshot(patient_id, form_data=RICH_FORM_DATA),
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    posts = run.care_context_posts
    assert len(posts) == 3

    by_type = {p["source_record_type"]: p for p in posts}
    assert set(by_type) == {HI_TYPE_OP_CONSULT, HI_TYPE_PRESCRIPTION, HI_TYPE_IMMUNIZATION}

    expected = _expected_refs(visit_id)
    for hi_type, ref in expected.items():
        assert by_type[hi_type]["source_record_id"] == ref

    for body in posts:
        assert body["patient_id"] == str(patient_id)
        assert body["encounter_id"] == str(visit_id)
        assert body["source_origin"] == "platform_module"
        assert body["source_system_id"] == "opd"
        assert body["status"] == "active"


def test_end_consult_stores_three_bundles_with_clinical_content(
    ids: tuple[UUID, UUID, UUID],
) -> None:
    tenant_id, patient_id, visit_id = ids
    run = _run_pipeline(
        _snapshot(patient_id, form_data=RICH_FORM_DATA),
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    posts = run.bundle_posts
    assert len(posts) == 3
    for body in posts:
        assert body["bundle_kind"] == "document"
        assert body["producer_kind"] == "platform_module"
        assert body["producer_id"] == "opd"

    expected = _expected_refs(visit_id)
    by_identifier = {p["bundle_json"]["identifier"]["value"]: p for p in posts}
    assert set(by_identifier) == set(expected.values())

    op = by_identifier[expected[HI_TYPE_OP_CONSULT]]
    rx = by_identifier[expected[HI_TYPE_PRESCRIPTION]]
    imm = by_identifier[expected[HI_TYPE_IMMUNIZATION]]

    # Each bundle is stamped with its NRCES profile (so a wrong-profile re-point fails).
    assert op["fhir_profile_url"] == NRCES_PROFILES["OpConsultRecord"].canonical_url
    assert rx["fhir_profile_url"] == NRCES_PROFILES["Prescription"].canonical_url
    assert imm["fhir_profile_url"] == NRCES_PROFILES["ImmunizationRecord"].canonical_url

    # Resource types + clinical content actually round-trip into the FHIR bundles
    # (a re-point that drops diagnoses/medicines/immunizations breaks these).
    op_types = _resource_types(op)
    assert "Composition" in op_types
    assert "Condition" in op_types  # chief complaint + diagnosis
    assert "MedicationRequest" in op_types
    assert "DocumentReference" in op_types  # the rendered PDF attachment
    op_blob = json.dumps(op["bundle_json"])
    assert "Viral fever" in op_blob
    assert "Paracetamol" in op_blob
    # ABDM linkage + attribution are regulatorily load-bearing: the patient's ABHA
    # address, the practitioner's registration id, and the encounter's visit number
    # must reach the FHIR resources (a mapper that silently drops any of these would
    # otherwise pass). These are stable snapshot literals, not SDK-minted ids.
    assert "asha@sbx" in op_blob  # patient ABHA address (Patient identifier)
    assert "21-1521-3828-3227" in op_blob  # practitioner registration id
    assert "V-001" in op_blob  # encounter visit number

    rx_types = _resource_types(rx)
    assert "Composition" in rx_types
    assert "MedicationRequest" in rx_types
    assert "Condition" in rx_types
    assert "Binary" in rx_types  # the rendered prescription PDF
    assert "Paracetamol" in json.dumps(rx["bundle_json"])

    imm_types = _resource_types(imm)
    assert "Composition" in imm_types
    assert "Immunization" in imm_types
    assert "BCG" in json.dumps(imm["bundle_json"])


def test_end_consult_posts_m2_orchestration_with_all_care_contexts(
    ids: tuple[UUID, UUID, UUID],
) -> None:
    tenant_id, patient_id, visit_id = ids
    run = _run_pipeline(
        _snapshot(patient_id, form_data=RICH_FORM_DATA),
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    body = run.m2_post
    assert body is not None
    assert body["patientId"] == str(patient_id)

    contexts = body["careContexts"]
    assert len(contexts) == 3
    assert {c["hiType"] for c in contexts} == {
        HI_TYPE_OP_CONSULT,
        HI_TYPE_PRESCRIPTION,
        HI_TYPE_IMMUNIZATION,
    }
    refs = {c["referenceNumber"] for c in contexts}
    assert refs == set(_expected_refs(visit_id).values())


def test_empty_clinical_content_emits_only_op_consult(ids: tuple[UUID, UUID, UUID]) -> None:
    """The content gates are real: no diagnosis/medicines/immunizations -> no Rx/Imm bundle."""
    tenant_id, patient_id, visit_id = ids
    empty = {"diagnosis": [], "medicines": [], "immunizations": []}
    run = _run_pipeline(
        _snapshot(patient_id, form_data=empty),
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    care_types = {p["source_record_type"] for p in run.care_context_posts}
    assert care_types == {HI_TYPE_OP_CONSULT}
    assert len(run.bundle_posts) == 1

    body = run.m2_post
    assert body is not None
    assert {c["hiType"] for c in body["careContexts"]} == {HI_TYPE_OP_CONSULT}


def test_pipeline_skipped_when_abdm_disabled(ids: tuple[UUID, UUID, UUID]) -> None:
    tenant_id, patient_id, visit_id = ids
    run = _run_pipeline(
        _snapshot(patient_id, form_data=RICH_FORM_DATA),
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
        abdm_enabled=False,
    )
    assert run.care_context_posts == []
    assert run.bundle_posts == []
    assert run.urlopen_call_count == 0


def test_m2_orchestration_skipped_when_hub_url_missing(ids: tuple[UUID, UUID, UUID]) -> None:
    """Bundles still persist to Record Foundation, but no hub URL -> no M2 POST."""
    tenant_id, patient_id, visit_id = ids
    run = _run_pipeline(
        _snapshot(patient_id, form_data=RICH_FORM_DATA),
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
        hub_base=None,
    )
    assert len(run.care_context_posts) == 3
    assert len(run.bundle_posts) == 3
    assert run.urlopen_call_count == 0


def _resource_types(bundle_post: dict[str, Any]) -> list[str]:
    return [entry["resource"]["resourceType"] for entry in bundle_post["bundle_json"]["entry"]]
