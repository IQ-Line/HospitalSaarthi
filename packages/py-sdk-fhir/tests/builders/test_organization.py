"""Unit tests for ``build_organization``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_organization
from hims_sdk_fhir.inputs import OrganizationInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Organization"


def test_minimal_organization() -> None:
    org = build_organization(OrganizationInput(name="City Hospital"), resource_id="org-1")
    assert org["resourceType"] == "Organization"
    assert org["id"] == "org-1"
    assert org["meta"]["profile"] == [PROFILE]
    assert org["name"] == "City Hospital"
    assert "identifier" not in org
    assert "telecom" not in org


def test_identifier_default_system_and_telecom() -> None:
    org = build_organization(
        OrganizationInput(
            name="City Hospital",
            facility_id="FAC-9",
            phone="0801234567",
            email="contact@city.example",
        ),
        resource_id="org-1",
    )
    idn = org["identifier"][0]
    assert idn["system"] == "https://facility.ndhm.gov.in"
    assert idn["value"] == "FAC-9"
    assert idn["type"]["coding"][0]["code"] == "PRN"
    assert {"system": "phone", "value": "0801234567", "use": "work"} in org["telecom"]
    assert {"system": "email", "value": "contact@city.example", "use": "work"} in org["telecom"]


def test_identifier_system_override() -> None:
    org = build_organization(
        OrganizationInput(
            name="City Hospital", facility_id="FAC-9", identifier_system="https://custom.example"
        ),
        resource_id="org-1",
    )
    assert org["identifier"][0]["system"] == "https://custom.example"
