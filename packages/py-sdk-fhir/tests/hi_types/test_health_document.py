"""Integration tests for ``build_health_document_bundle``."""

from __future__ import annotations

from hims_sdk_fhir import (
    DocumentInput,
    HealthDocumentInput,
    OrganizationInput,
    PatientInput,
    PractitionerInput,
    build_health_document_bundle,
)

from ._helpers import (
    assert_document_bundle_shape,
    assert_references_resolve,
    first_composition,
    resource_types,
)

_PATIENT = PatientInput(full_name="Asha Devi", gender="female", mrn="MRN-1")


def test_full_bundle_shape(uuid_factory, clock):
    inp = HealthDocumentInput(
        patient=_PATIENT,
        document=DocumentInput(title="Discharge Note", data_base64="ZGF0YQ=="),
        author=PractitionerInput(full_name="Dr. Rao", registration_id="REG-9"),
        organization=OrganizationInput(name="City Hospital", facility_id="FAC-1"),
        signature_base64="c2ln",
    )
    bundle = build_health_document_bundle(inp, uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    comp = first_composition(bundle)
    assert comp["meta"]["profile"] == [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord|2.0.0"
    ]
    assert comp["type"]["coding"][0]["code"] == "419891008"
    # Title comes from the document.
    assert comp["title"] == "Discharge Note"

    types = resource_types(bundle)
    assert "Patient" in types
    assert "Practitioner" in types
    assert "Organization" in types
    assert "DocumentReference" in types

    # The single section references the DocumentReference.
    assert len(comp["section"]) == 1
    assert comp["section"][0]["entry"][0]["reference"].startswith("urn:uuid:")

    # DocumentReference.created defaulted to now (the fixed clock).
    doc = next(
        e["resource"]
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "DocumentReference"
    )
    assert doc["content"][0]["attachment"]["creation"] == "2026-06-12T10:00:00+05:30"

    assert bundle["signature"]["data"] == "c2ln"


def test_minimal_bundle_no_author(uuid_factory, clock):
    minimal = HealthDocumentInput(
        patient=_PATIENT,
        document=DocumentInput(title="Lab Report"),
    )
    bundle = build_health_document_bundle(minimal, uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    types = resource_types(bundle)
    assert "Practitioner" not in types
    assert "Organization" not in types
    assert "DocumentReference" in types
    # No author -> no signature even if it were set (it is not here).
    assert "signature" not in bundle

    comp = first_composition(bundle)
    assert comp["title"] == "Lab Report"
    # Composition author omitted (empty list compacted away).
    assert "author" not in comp
