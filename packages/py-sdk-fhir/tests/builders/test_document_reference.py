"""Unit tests for ``build_document_reference``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_document_reference
from hims_sdk_fhir.inputs import DocumentInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentReference"
SUBJECT = {"reference": "Patient/pat-1"}


def test_minimal_document_reference() -> None:
    doc = build_document_reference(
        DocumentInput(title="Discharge Note"), resource_id="doc-1", subject=SUBJECT
    )
    assert doc["resourceType"] == "DocumentReference"
    assert doc["id"] == "doc-1"
    assert doc["meta"]["profile"] == [PROFILE]
    assert doc["status"] == "current"
    assert doc["docStatus"] == "final"
    assert doc["type"] == {"text": "Discharge Note"}
    attachment = doc["content"][0]["attachment"]
    assert attachment["contentType"] == "application/octet-stream"
    assert attachment["language"] == "en-IN"
    assert attachment["title"] == "Discharge Note"
    assert "data" not in attachment
    assert "creation" not in attachment


def test_full_document_reference() -> None:
    doc = build_document_reference(
        DocumentInput(
            title="Scan",
            content_type="application/pdf",
            data_base64="QUJD",
            created="2026-06-12T10:00:00+05:30",
        ),
        resource_id="doc-1",
        subject=SUBJECT,
    )
    attachment = doc["content"][0]["attachment"]
    assert attachment["contentType"] == "application/pdf"
    assert attachment["data"] == "QUJD"
    assert attachment["creation"] == "2026-06-12T10:00:00+05:30"
