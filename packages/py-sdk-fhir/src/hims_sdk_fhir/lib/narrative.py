"""FHIR narrative primitives — XHTML escaping + generated narrative.

Mirrors the ``escapeXml`` helper in the TS ``buildComposition`` and emits a
minimal ``generated`` narrative from arbitrary text.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from ..types import FhirNarrative


def escape_xml(text: str) -> str:
    """Escape the XML special characters ``& < > "`` for XHTML narrative."""
    return (
        text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    )


def generated_narrative(text: str) -> FhirNarrative:
    """Build a ``generated`` FHIR narrative wrapping ``text`` in an XHTML div."""
    div = f'<div xmlns="http://www.w3.org/1999/xhtml"><p>{escape_xml(text)}</p></div>'
    return {"status": "generated", "div": div}
