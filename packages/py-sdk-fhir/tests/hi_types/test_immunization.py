"""Integration tests for ``build_immunization_bundle``."""

from __future__ import annotations

from hims_sdk_fhir import (
    DocumentInput,
    ImmunizationBundleInput,
    ImmunizationInput,
    OrganizationInput,
    PatientInput,
    PractitionerInput,
    build_immunization_bundle,
)

from ._helpers import (
    assert_document_bundle_shape,
    assert_references_resolve,
    first_composition,
    resource_types,
)

_PATIENT = PatientInput(full_name="Baby Devi", gender="female", mrn="MRN-2")
_DOCTOR = PractitionerInput(full_name="Dr. Rao", registration_id="REG-9")


def test_full_bundle_shape(uuid_factory, clock):
    inp = ImmunizationBundleInput(
        patient=_PATIENT,
        practitioner=_DOCTOR,
        immunizations=[
            ImmunizationInput(
                vaccine_name="BCG",
                dose_number=1,
                manufacturer="Acme",
                manufacturer_facility_id="FAC-ACME",
                next_due_date="2026-12-01",
            ),
            ImmunizationInput(
                vaccine_name="OPV",
                dose_number=2,
                manufacturer="Acme",
                manufacturer_facility_id="FAC-ACME",
            ),
        ],
        organization=OrganizationInput(name="City Hospital", facility_id="FAC-1"),
        document=DocumentInput(title="Vaccination card", data_base64="ZGF0YQ=="),
        signature_base64="c2ln",
    )
    bundle = build_immunization_bundle(inp, uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    comp = first_composition(bundle)
    assert comp["meta"]["profile"] == [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/ImmunizationRecord|2.0.0"
    ]
    assert comp["type"]["coding"][0]["code"] == "41000179103"
    assert comp["title"] == "Immunization record"

    types = resource_types(bundle)
    assert types.count("Immunization") == 2
    assert types.count("ImmunizationRecommendation") == 1  # only BCG has next_due_date
    assert "DocumentReference" in types

    # Shared "Acme" manufacturer is ONE Organization entry (plus the custodian org).
    org_names = [
        e["resource"]["name"]
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "Organization"
    ]
    assert org_names.count("Acme") == 1
    assert "City Hospital" in org_names

    assert bundle["signature"]["data"] == "c2ln"


def test_minimal_single_immunization(uuid_factory, clock):
    minimal = ImmunizationBundleInput(
        patient=_PATIENT,
        practitioner=_DOCTOR,
        immunizations=[ImmunizationInput(vaccine_name="BCG")],
    )
    bundle = build_immunization_bundle(minimal, uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    types = resource_types(bundle)
    assert types.count("Immunization") == 1
    assert "ImmunizationRecommendation" not in types
    assert "DocumentReference" not in types
    assert "Organization" not in types
    assert "signature" not in bundle


def test_manufacturer_without_facility_id_omits_organization(uuid_factory, clock):
    inp = ImmunizationBundleInput(
        patient=_PATIENT,
        practitioner=_DOCTOR,
        immunizations=[
            ImmunizationInput(vaccine_name="covid-19", manufacturer="Pfizer Inc"),
        ],
    )
    bundle = build_immunization_bundle(inp, uuid_factory=uuid_factory, clock=clock)

    assert "Organization" not in resource_types(bundle)
    imm = next(
        e["resource"]
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "Immunization"
    )
    assert imm["vaccineCode"]["text"] == "covid-19 — Pfizer Inc"
    assert "manufacturer" not in imm


def test_performer_dedup(uuid_factory, clock):
    administering = PractitionerInput(full_name="Nurse Joy", registration_id="NUR-1")
    inp = ImmunizationBundleInput(
        patient=_PATIENT,
        practitioner=_DOCTOR,
        immunizations=[
            ImmunizationInput(vaccine_name="BCG", administered_by=administering),
            ImmunizationInput(vaccine_name="OPV", administered_by=administering),
        ],
    )
    bundle = build_immunization_bundle(inp, uuid_factory=uuid_factory, clock=clock)

    assert_references_resolve(bundle)
    # Author practitioner + ONE deduped administering practitioner = 2 total.
    practitioner_names = [
        e["resource"]["name"][0]["text"]
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "Practitioner"
    ]
    assert practitioner_names.count("Nurse Joy") == 1
    assert practitioner_names.count("Dr. Rao") == 1
