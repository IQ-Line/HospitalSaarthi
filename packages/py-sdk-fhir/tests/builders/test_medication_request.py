"""Unit tests for ``build_medication_request``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_medication_request
from hims_sdk_fhir.inputs import MedicineInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest"
SUBJECT = {"reference": "Patient/pat-1"}
REQUESTER = {"reference": "Practitioner/prac-1"}
AUTHORED = "2026-06-12T10:00:00+05:30"


def test_minimal_medication_request() -> None:
    req = build_medication_request(
        MedicineInput(name="Paracetamol"),
        resource_id="med-1",
        subject=SUBJECT,
        requester=REQUESTER,
        authored_on=AUTHORED,
    )
    assert req["resourceType"] == "MedicationRequest"
    assert req["id"] == "med-1"
    assert req["meta"]["profile"] == [PROFILE]
    assert req["status"] == "active"
    assert req["intent"] == "order"
    assert req["medicationCodeableConcept"]["text"] == "Paracetamol"
    assert req["dosageInstruction"][0]["text"] == "As directed"
    assert "dispenseRequest" not in req
    assert "reasonReference" not in req


def test_medication_text_form_and_strength() -> None:
    req = build_medication_request(
        MedicineInput(name="Paracetamol", form="tablet", strength="500mg"),
        resource_id="med-1",
        subject=SUBJECT,
        requester=REQUESTER,
        authored_on=AUTHORED,
    )
    assert req["medicationCodeableConcept"]["text"] == "Paracetamol (tablet) (500mg)"


def test_dosage_text_timing_and_dispense() -> None:
    req = build_medication_request(
        MedicineInput(
            name="Amoxicillin",
            form="capsule",
            frequency="twice daily",
            duration_days=5,
            dosage="1-0-1",
            route="oral",
            method="swallow",
            sos="if fever",
            quantity=10,
        ),
        resource_id="med-1",
        subject=SUBJECT,
        requester=REQUESTER,
        authored_on=AUTHORED,
    )
    dosage = req["dosageInstruction"][0]
    assert "1 morning" in dosage["text"]
    assert "1 evening" in dosage["text"]
    assert "twice daily" in dosage["text"]
    assert "for 5 days" in dosage["text"]
    assert dosage["route"] == {"text": "oral"}
    assert dosage["method"] == {"text": "swallow"}
    assert dosage["timing"]["repeat"]["frequency"] == 2
    assert dosage["timing"]["repeat"]["boundsDuration"]["value"] == 5
    assert dosage["additionalInstruction"] == [{"text": "if fever"}]
    assert req["dispenseRequest"]["quantity"] == {"value": 10, "unit": "capsule"}


def test_reason_reference() -> None:
    req = build_medication_request(
        MedicineInput(name="X"),
        resource_id="med-1",
        subject=SUBJECT,
        requester=REQUESTER,
        authored_on=AUTHORED,
        reason_reference={"reference": "Condition/cond-1"},
    )
    assert req["reasonReference"] == [{"reference": "Condition/cond-1"}]
