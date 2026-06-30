"""Unit tests for ``build_observation``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_observation

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"
SUBJECT = {"reference": "Patient/pat-1"}
NOW = "2026-06-12T10:00:00+05:30"


def test_value_quantity() -> None:
    obs = build_observation(
        resource_id="obs-1",
        code_text="Pulse",
        subject=SUBJECT,
        effective=NOW,
        value_quantity=(72.0, "beats/minute", "/min"),
        category_vital_signs=True,
    )
    assert obs["resourceType"] == "Observation"
    assert obs["id"] == "obs-1"
    assert obs["meta"]["profile"] == [PROFILE]
    assert obs["status"] == "final"
    assert obs["valueQuantity"] == {
        "value": 72.0,
        "system": "http://unitsofmeasure.org",
        "unit": "beats/minute",
        "code": "/min",
    }
    assert obs["category"][0]["coding"][0]["code"] == "vital-signs"
    assert "valueString" not in obs
    assert "component" not in obs


def test_value_string() -> None:
    obs = build_observation(
        resource_id="obs-1",
        code_text="Note",
        subject=SUBJECT,
        effective=NOW,
        value_string="irregular",
    )
    assert obs["valueString"] == "irregular"
    assert "valueQuantity" not in obs
    assert "category" not in obs


def test_components() -> None:
    components = [{"code": {"text": "Systolic"}, "valueQuantity": {"value": 120}}]
    obs = build_observation(
        resource_id="obs-1",
        code_text="Blood Pressure",
        subject=SUBJECT,
        effective=NOW,
        components=components,
    )
    assert obs["component"] == components
    assert "valueQuantity" not in obs


def test_quantity_omits_missing_unit_and_code() -> None:
    obs = build_observation(
        resource_id="obs-1",
        code_text="X",
        subject=SUBJECT,
        effective=NOW,
        value_quantity=(5.0, None, None),
    )
    assert obs["valueQuantity"] == {"value": 5.0, "system": "http://unitsofmeasure.org"}
