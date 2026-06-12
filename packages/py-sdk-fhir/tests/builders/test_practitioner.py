"""Unit tests for ``build_practitioner``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_practitioner
from hims_sdk_fhir.inputs import PractitionerInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner"


def test_minimal_practitioner() -> None:
    prac = build_practitioner(PractitionerInput(full_name="Dr Sen"), resource_id="prac-1")
    assert prac["resourceType"] == "Practitioner"
    assert prac["id"] == "prac-1"
    assert prac["meta"]["profile"] == [PROFILE]
    assert prac["name"] == [{"text": "Dr Sen"}]
    assert "identifier" not in prac


def test_registration_identifier() -> None:
    prac = build_practitioner(
        PractitionerInput(full_name="Dr Sen", registration_id="MCI-42"), resource_id="prac-1"
    )
    idn = prac["identifier"][0]
    assert idn["value"] == "MCI-42"
    assert idn["system"] == "https://doctor.ndhm.gov.in"
    assert idn["type"]["coding"][0]["code"] == "MD"
