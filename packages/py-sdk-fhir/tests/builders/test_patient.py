"""Unit tests for ``build_patient``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_patient
from hims_sdk_fhir.identifiers import (
    ABHA_ADDRESS_SYSTEM_URI,
    ABHA_NUMBER_SYSTEM_URI,
    MRN_SYSTEM_URI,
)
from hims_sdk_fhir.inputs import PatientInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"


def test_minimal_patient() -> None:
    patient = build_patient(PatientInput(full_name="Asha Rao"), resource_id="pat-1")
    assert patient["resourceType"] == "Patient"
    assert patient["id"] == "pat-1"
    assert patient["meta"]["profile"] == [PROFILE]
    assert patient["name"] == [{"text": "Asha Rao"}]
    assert patient["gender"] == "unknown"
    # No optional fields -> omitted, no null keys.
    assert "identifier" not in patient
    assert "telecom" not in patient
    assert "birthDate" not in patient


def test_full_patient_identifiers_and_telecom() -> None:
    patient = build_patient(
        PatientInput(
            full_name="Asha Rao",
            gender="female",
            birth_date="1990-04-01",
            phone="9999999999",
            mrn="UHID-1",
            abha_number="12-3456-7890-1234",
            abha_address="asha@abdm",
        ),
        resource_id="pat-1",
    )
    systems = {idn["system"]: idn for idn in patient["identifier"]}
    assert systems[MRN_SYSTEM_URI]["value"] == "UHID-1"
    assert systems[MRN_SYSTEM_URI]["type"]["coding"][0]["code"] == "MR"
    assert systems[ABHA_NUMBER_SYSTEM_URI]["value"] == "12-3456-7890-1234"
    assert systems[ABHA_NUMBER_SYSTEM_URI]["type"]["coding"][0]["code"] == "MR"
    assert systems[ABHA_ADDRESS_SYSTEM_URI]["value"] == "asha@abdm"
    assert systems[ABHA_ADDRESS_SYSTEM_URI]["type"]["coding"][0]["code"] == "MR"
    assert patient["birthDate"] == "1990-04-01"
    assert patient["telecom"] == [{"system": "phone", "value": "9999999999", "use": "home"}]


def test_unparseable_birth_date_omitted() -> None:
    patient = build_patient(
        PatientInput(full_name="X", birth_date="not-a-date"), resource_id="pat-1"
    )
    assert "birthDate" not in patient
