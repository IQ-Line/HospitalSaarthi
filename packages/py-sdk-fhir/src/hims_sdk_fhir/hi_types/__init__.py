"""HI-Type bundle composers (Layer 2).

Public "domain in → complete FHIR R4 Document Bundle out" functions for the four
ABDM/NRCeS HI-Types. Each composes the Wave-B resource builders into a finished,
self-contained ``type: document`` Bundle (Composition first entry, ``urn:uuid:``
references, DocumentBundle ``meta`` + confidentiality, optional signature).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from .health_document import build_health_document_bundle
from .immunization import build_immunization_bundle
from .op_consult import build_op_consult_bundle
from .prescription import build_prescription_bundle

__all__ = [
    "build_op_consult_bundle",
    "build_prescription_bundle",
    "build_immunization_bundle",
    "build_health_document_bundle",
]
