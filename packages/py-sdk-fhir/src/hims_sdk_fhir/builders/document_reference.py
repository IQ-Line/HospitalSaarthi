"""``build_document_reference`` — Layer-1 DocumentReference resource builder.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/documentreference.html
"""

from __future__ import annotations

from typing import Any

from ..inputs import DocumentInput
from ..lib import compact
from ..profile_registry import resource_profile
from ..types import DocumentReference, FhirReference

_DEFAULT_CONTENT_TYPE = "application/octet-stream"


def build_document_reference(
    inp: DocumentInput,
    *,
    resource_id: str,
    subject: FhirReference,
) -> DocumentReference:
    """Build a ``DocumentReference`` (``status: current``, ``docStatus: final``).

    ``content[0].attachment`` carries the content type (defaulting to
    ``application/octet-stream``), language ``en-IN``, optional base64 data, the
    title, and the optional creation timestamp (the composer may supply a
    ``created`` default upstream).
    """
    attachment: dict[str, Any] = {
        "contentType": inp.content_type or _DEFAULT_CONTENT_TYPE,
        "language": "en-IN",
        "title": inp.title,
    }
    if inp.data_base64 is not None:
        attachment["data"] = inp.data_base64
    if inp.created is not None:
        attachment["creation"] = inp.created

    document: DocumentReference = {
        "resourceType": "DocumentReference",
        "id": resource_id,
        "meta": {"profile": [resource_profile("DocumentReference")]},
        "status": "current",
        "docStatus": "final",
        "type": {"text": inp.title},
        "subject": subject,
        "content": [{"attachment": attachment}],
    }
    return compact(document)
