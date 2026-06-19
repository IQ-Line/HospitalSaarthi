"""Unit tests for compact() — omit None & empty containers, keep falsy scalars."""

from __future__ import annotations

from hims_sdk_fhir.lib import compact


def test_drops_none_values() -> None:
    assert compact({"a": 1, "b": None}) == {"a": 1}


def test_drops_empty_list_and_dict_values() -> None:
    assert compact({"a": [], "b": {}, "c": 1}) == {"c": 1}


def test_keeps_zero_false_and_empty_string() -> None:
    out = compact({"zero": 0, "false": False, "zerof": 0.0, "empty": ""})
    assert out == {"zero": 0, "false": False, "zerof": 0.0, "empty": ""}


def test_recurses_into_nested_dicts() -> None:
    src = {"outer": {"keep": 1, "drop": None, "emptylist": []}}
    assert compact(src) == {"outer": {"keep": 1}}


def test_nested_dict_becoming_empty_is_dropped() -> None:
    src = {"outer": {"drop": None, "emptylist": []}}
    assert compact(src) == {}


def test_lists_recurse_and_are_kept() -> None:
    src = {"items": [{"a": 1, "b": None}, {"c": []}]}
    out = compact(src)
    assert out == {"items": [{"a": 1}, {}]}


def test_does_not_mutate_input() -> None:
    src = {"a": 1, "b": None, "nested": {"x": []}}
    compact(src)
    assert src == {"a": 1, "b": None, "nested": {"x": []}}


def test_top_level_empty_after_compaction() -> None:
    assert compact({"a": None, "b": []}) == {}
