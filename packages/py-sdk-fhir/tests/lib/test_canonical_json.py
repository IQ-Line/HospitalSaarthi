"""Unit tests for canonical JSON serialisation."""

from __future__ import annotations

from hims_sdk_fhir.lib import canonical_json


def test_sorts_keys() -> None:
    assert canonical_json({"b": 1, "a": 2}) == '{"a":2,"b":1}'


def test_no_whitespace_compact_separators() -> None:
    assert canonical_json({"a": [1, 2], "b": {"c": 3}}) == '{"a":[1,2],"b":{"c":3}}'


def test_stable_regardless_of_input_order() -> None:
    a = canonical_json({"x": 1, "y": {"q": 2, "p": 3}})
    b = canonical_json({"y": {"p": 3, "q": 2}, "x": 1})
    assert a == b


def test_preserves_unicode_without_ascii_escaping() -> None:
    assert canonical_json({"name": "café"}) == '{"name":"café"}'


def test_nested_arrays_sorted_within_objects() -> None:
    obj = {"list": [{"z": 1, "a": 2}]}
    assert canonical_json(obj) == '{"list":[{"a":2,"z":1}]}'
