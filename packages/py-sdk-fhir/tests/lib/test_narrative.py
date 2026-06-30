"""Unit tests for narrative primitives."""

from __future__ import annotations

from hims_sdk_fhir.lib import escape_xml, generated_narrative


def test_escape_xml_escapes_special_chars() -> None:
    assert escape_xml('a & b < c > d "e"') == "a &amp; b &lt; c &gt; d &quot;e&quot;"


def test_escape_xml_ampersand_first() -> None:
    # Ensure already-escaped entities are not double-escaped beyond the rules.
    assert escape_xml("&lt;") == "&amp;lt;"


def test_generated_narrative_shape() -> None:
    n = generated_narrative("Consultation Report")
    assert n["status"] == "generated"
    assert n["div"] == (
        '<div xmlns="http://www.w3.org/1999/xhtml"><p>Consultation Report</p></div>'
    )


def test_generated_narrative_escapes_content() -> None:
    n = generated_narrative("A & B")
    assert "A &amp; B" in n["div"]
