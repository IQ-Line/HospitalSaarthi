"""Shared helpers for the Layer-2 HI-Type composers.

Small, pure utilities used by every composer: building references, the SNOMED
composition ``type`` codeable concept, the optional ``Bundle.signature``, the
``Bundle.meta`` stamp, and a ``DocumentReference`` whose ``created`` defaults to
``now``. None of these reimplement resource construction — they only assemble
already-built pieces.

@see docs/superpowers/specs/2026-06-12-py-sdk-fhir-bundle-builders-design.md §12
"""

from __future__ import annotations

from dataclasses import replace

from ..builders import build_document_reference
from ..inputs import DocumentInput
from ..profile_registry import (
    CONFIDENTIALITY_SECURITY,
    DOCUMENT_BUNDLE_PROFILE,
    DOCUMENT_BUNDLE_PROFILE_VERSION,
)
from ..types import (
    Bundle,
    DocumentReference,
    FhirCodeableConcept,
    FhirReference,
    FhirSignature,
)

SNOMED_SYSTEM = "http://snomed.info/sct"

# ISO E1762-95 author's-signature type (mirrors legacy bundle.js).
_SIGNATURE_TYPE = {
    "system": "urn:iso-astm:E1762-95:2013",
    "code": "1.2.840.10065.1.12.1.1",
    "display": "Author's Signature",
}
_SIGNATURE_FORMAT = "image/jpeg"


def reference(ref: str, display: str | None = None) -> FhirReference:
    """Build a ``{"reference": ..., "display": ...}`` reference.

    ``ref`` is the ``ResourceType/id`` form; ``build_document_bundle`` rewrites
    it to ``urn:uuid:<id>`` once the bundle is assembled.
    """
    out: FhirReference = {"reference": ref}
    if display is not None:
        out["display"] = display
    return out


def composition_type(code: str, display: str) -> FhirCodeableConcept:
    """Build the SNOMED ``Composition.type`` codeable concept for a HI-Type."""
    return {
        "coding": [{"system": SNOMED_SYSTEM, "code": code, "display": display}],
        "text": display,
    }


def stamp_document_bundle_meta(bundle: Bundle) -> None:
    """Stamp the DocumentBundle profile + confidentiality security on ``bundle``."""
    bundle["meta"] = {
        "profile": [f"{DOCUMENT_BUNDLE_PROFILE}|{DOCUMENT_BUNDLE_PROFILE_VERSION}"],
        "security": [CONFIDENTIALITY_SECURITY],
    }


def signature(*, signature_base64: str, when: str, who_id: str) -> FhirSignature:
    """Build the ``Bundle.signature`` (author's signature).

    ``who.reference`` is set to ``urn:uuid:<who_id>`` because, after
    ``build_document_bundle`` rewrites entry references, that is the fullUrl of
    the practitioner/author resource carrying ``who_id``.
    """
    return {
        "type": [_SIGNATURE_TYPE],
        "when": when,
        "who": {"reference": f"urn:uuid:{who_id}"},
        "sigFormat": _SIGNATURE_FORMAT,
        "data": signature_base64,
    }


def document_reference_with_default_created(
    inp: DocumentInput,
    *,
    resource_id: str,
    subject: FhirReference,
    now: str,
) -> DocumentReference:
    """Build a ``DocumentReference`` defaulting its ``created`` to ``now``."""
    effective = inp if inp.created is not None else replace(inp, created=now)
    return build_document_reference(effective, resource_id=resource_id, subject=subject)
