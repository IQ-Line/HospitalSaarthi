"""Unit tests for reference rewriting."""

from __future__ import annotations

from hims_sdk_fhir.lib import build_reference_map, rewrite_references_in_place


def test_build_reference_map_maps_type_id_to_urn() -> None:
    resources = [
        {"resourceType": "Patient", "id": "p1"},
        {"resourceType": "Encounter", "id": "e1"},
    ]
    full_urls = ["urn:uuid:aaa", "urn:uuid:bbb"]
    ref_map = build_reference_map(resources, full_urls)
    assert ref_map == {"Patient/p1": "urn:uuid:aaa", "Encounter/e1": "urn:uuid:bbb"}


def test_build_reference_map_skips_missing_id_or_non_urn() -> None:
    resources = [
        {"resourceType": "Patient"},  # no id
        {"resourceType": "Encounter", "id": "e1"},  # non-urn fullUrl
        {"id": "x"},  # no resourceType
    ]
    full_urls = ["urn:uuid:aaa", "https://example.org/Encounter/e1", "urn:uuid:ccc"]
    ref_map = build_reference_map(resources, full_urls)
    assert ref_map == {}


def test_rewrite_references_in_place_rewrites_known_refs() -> None:
    ref_map = {"Patient/p1": "urn:uuid:aaa"}
    resource = {"subject": {"reference": "Patient/p1"}}
    rewrite_references_in_place(resource, ref_map)
    assert resource["subject"]["reference"] == "urn:uuid:aaa"


def test_rewrite_leaves_unknown_refs_untouched() -> None:
    ref_map = {"Patient/p1": "urn:uuid:aaa"}
    resource = {"subject": {"reference": "Practitioner/unknown"}}
    rewrite_references_in_place(resource, ref_map)
    assert resource["subject"]["reference"] == "Practitioner/unknown"


def test_rewrite_recurses_into_nested_arrays() -> None:
    ref_map = {"Condition/c1": "urn:uuid:zzz", "Observation/o1": "urn:uuid:yyy"}
    resource = {
        "section": [
            {"entry": [{"reference": "Condition/c1"}, {"reference": "Observation/o1"}]},
            {"entry": [{"reference": "Unknown/x"}]},
        ]
    }
    rewrite_references_in_place(resource, ref_map)
    assert resource["section"][0]["entry"][0]["reference"] == "urn:uuid:zzz"
    assert resource["section"][0]["entry"][1]["reference"] == "urn:uuid:yyy"
    assert resource["section"][1]["entry"][0]["reference"] == "Unknown/x"


def test_rewrite_handles_none_and_scalars() -> None:
    ref_map = {"Patient/p1": "urn:uuid:aaa"}
    # Should not raise on None / scalars / lists of scalars.
    rewrite_references_in_place(None, ref_map)
    rewrite_references_in_place("Patient/p1", ref_map)
    rewrite_references_in_place([1, 2, "Patient/p1"], ref_map)
