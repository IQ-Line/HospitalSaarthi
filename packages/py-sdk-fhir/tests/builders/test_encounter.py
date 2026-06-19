"""Unit tests for ``build_encounter``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_encounter
from hims_sdk_fhir.inputs import EncounterInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Encounter"
SUBJECT = {"reference": "Patient/pat-1"}
NOW = "2026-06-12T10:00:00+05:30"


def test_encounter_defaults() -> None:
    enc = build_encounter(EncounterInput(), resource_id="enc-1", subject=SUBJECT, now=NOW)
    assert enc["resourceType"] == "Encounter"
    assert enc["id"] == "enc-1"
    assert enc["meta"]["profile"] == [PROFILE]
    assert enc["status"] == "finished"
    # Literal "class" JSON key, never "class_".
    assert "class" in enc
    assert "class_" not in enc
    assert enc["class"]["system"] == "http://terminology.hl7.org/CodeSystem/v3-ActCode"
    assert enc["class"]["code"] == "AMB"
    assert enc["class"]["display"] == "ambulatory"
    # visit_number falls back to resource_id.
    assert enc["identifier"][0] == {"system": "https://ndhm.in", "value": "enc-1"}
    assert enc["period"]["start"] == NOW
    assert enc["subject"] == SUBJECT


def test_encounter_visit_number_and_start() -> None:
    enc = build_encounter(
        EncounterInput(visit_number="V-100", start="2026-06-01T09:00:00+05:30"),
        resource_id="enc-1",
        subject=SUBJECT,
        now=NOW,
    )
    assert enc["identifier"][0]["value"] == "V-100"
    assert enc["period"]["start"] == "2026-06-01T09:00:00+05:30"
