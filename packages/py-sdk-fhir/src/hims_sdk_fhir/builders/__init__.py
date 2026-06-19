"""Resource builders (Layer 1).

Pure, side-effect-free functions that turn domain input dataclasses into FHIR
R4 resource dicts (run through ``compact()``, stamped with the right NRCeS
``meta.profile``). Cross-references are emitted in ``ResourceType/id`` form; the
document-bundle builder rewrites them to ``urn:uuid:``.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from .allergy_intolerance import build_allergy_intolerance
from .composition import build_composition
from .condition import build_condition
from .document_bundle import build_document_bundle
from .document_reference import build_document_reference
from .encounter import build_encounter
from .immunization import build_immunization
from .medication_request import build_medication_request
from .medication_statement import build_medication_statement
from .observation import build_observation
from .organization import build_organization
from .patient import build_patient
from .practitioner import build_practitioner
from .vitals import build_vital_observations

__all__ = [
    "build_allergy_intolerance",
    "build_composition",
    "build_condition",
    "build_document_bundle",
    "build_document_reference",
    "build_encounter",
    "build_immunization",
    "build_medication_request",
    "build_medication_statement",
    "build_observation",
    "build_organization",
    "build_patient",
    "build_practitioner",
    "build_vital_observations",
]
