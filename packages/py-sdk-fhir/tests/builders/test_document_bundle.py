"""Unit tests for ``build_document_bundle``."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime

from hims_sdk_fhir.builders import build_document_bundle
from hims_sdk_fhir.profile_registry import (
    CONFIDENTIALITY_SECURITY,
    DOCUMENT_BUNDLE_PROFILE,
    DOCUMENT_BUNDLE_PROFILE_VERSION,
)


def _composition() -> dict:
    return {
        "resourceType": "Composition",
        "status": "final",
        "subject": {"reference": "Patient/pat-1"},
        "author": [{"reference": "Practitioner/prac-1"}],
        "section": [{"entry": [{"reference": "Patient/pat-1"}]}],
    }


def _patient() -> dict:
    return {"resourceType": "Patient", "id": "pat-1", "name": [{"text": "Asha"}]}


def _practitioner() -> dict:
    return {"resourceType": "Practitioner", "id": "prac-1", "name": [{"text": "Dr Sen"}]}


def test_bundle_shape(uuid_factory: Callable[[], str], clock: Callable[[], datetime]) -> None:
    bundle = build_document_bundle(
        composition=_composition(),
        entries=[_patient()],
        uuid_factory=uuid_factory,
        clock=clock,
    )
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "document"
    # First entry is the Composition.
    assert bundle["entry"][0]["resource"]["resourceType"] == "Composition"
    # All fullUrls are urn:uuid:.
    for entry in bundle["entry"]:
        assert entry["fullUrl"].startswith("urn:uuid:")
        assert entry["resource"]["id"]
        assert entry["fullUrl"] == f"urn:uuid:{entry['resource']['id']}"
    # Default identifier system + clock-derived timestamp.
    assert bundle["identifier"]["system"] == "http://hip.in"
    assert bundle["identifier"]["value"].startswith("urn:uuid:")
    assert bundle["timestamp"] == "2026-06-12T10:00:00+05:30"
    # No meta by default.
    assert "meta" not in bundle


def test_references_are_rewritten_to_urn_uuid(
    uuid_factory: Callable[[], str], clock: Callable[[], datetime]
) -> None:
    bundle = build_document_bundle(
        composition=_composition(),
        entries=[_patient(), _practitioner()],
        uuid_factory=uuid_factory,
        clock=clock,
    )
    # Find the Patient entry's urn:uuid:.
    patient_urn = next(
        e["fullUrl"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Patient"
    )
    composition = bundle["entry"][0]["resource"]
    # The Patient/pat-1 references in subject + section.entry got rewritten.
    assert composition["subject"]["reference"] == patient_urn
    assert composition["section"][0]["entry"][0]["reference"] == patient_urn
    # No dangling Type/id references anywhere (Practitioner is also in the bundle).
    assert _no_dangling_type_id_refs(bundle)


def test_meta_set_when_given(
    uuid_factory: Callable[[], str], clock: Callable[[], datetime]
) -> None:
    meta = {
        "profile": [f"{DOCUMENT_BUNDLE_PROFILE}|{DOCUMENT_BUNDLE_PROFILE_VERSION}"],
        "security": [CONFIDENTIALITY_SECURITY],
    }
    bundle = build_document_bundle(
        composition=_composition(),
        entries=[_patient()],
        uuid_factory=uuid_factory,
        clock=clock,
        meta=meta,
    )
    assert bundle["meta"] == meta


def test_entries_input_not_mutated(
    uuid_factory: Callable[[], str], clock: Callable[[], datetime]
) -> None:
    patient = _patient()
    composition = _composition()
    build_document_bundle(
        composition=composition,
        entries=[patient],
        uuid_factory=uuid_factory,
        clock=clock,
    )
    # Deep-copied internally; caller's subject reference is untouched.
    assert composition["subject"]["reference"] == "Patient/pat-1"


def _no_dangling_type_id_refs(value: object) -> bool:
    if isinstance(value, dict):
        ref = value.get("reference")
        if isinstance(ref, str) and not ref.startswith("urn:uuid:") and "/" in ref:
            return False
        return all(_no_dangling_type_id_refs(v) for v in value.values())
    if isinstance(value, list):
        return all(_no_dangling_type_id_refs(item) for item in value)
    return True
