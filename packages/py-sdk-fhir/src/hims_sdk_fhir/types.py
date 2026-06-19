"""Hand-typed FHIR R4 subset as ``TypedDict`` — Python mirror of the TS types.

Scope: only the resources and fields the four HI-Type bundle builders produce,
consume, or validate today. The shape mirrors
``packages/ts-sdk-fhir/src/types/index.ts`` (snake_case → camelCase field names
preserved, since these become wire JSON), stripped of unused choice-types and
extensions.

Most fields are optional, so every ``TypedDict`` uses ``total=False`` to keep
dict construction ergonomic (FHIR cardinality is enforced by the builders +
profile validation, not by these types).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict

# --- Scalar aliases -------------------------------------------------------

FhirDateTime = str  # ISO 8601, e.g. "2026-06-12T10:30:00+05:30"
FhirDate = str  # "YYYY-MM-DD"
FhirInstant = str  # ISO 8601 with timezone, millisecond precision
FhirUri = str
FhirCode = str
FhirId = str

# Generic resource alias for builder returns where a precise TypedDict is
# overkill. Builders return plain dicts run through ``compact()``.
FhirResource = dict[str, Any]


# --- Datatypes ------------------------------------------------------------


class FhirCoding(TypedDict, total=False):
    system: FhirUri
    code: FhirCode
    display: str
    version: str


class FhirCodeableConcept(TypedDict, total=False):
    coding: list[FhirCoding]
    text: str


class FhirIdentifier(TypedDict, total=False):
    use: Literal["usual", "official", "temp", "secondary", "old"]
    system: FhirUri
    value: str
    type: FhirCodeableConcept


class FhirReference(TypedDict, total=False):
    reference: str  # "ResourceType/id" or "urn:uuid:..."
    type: FhirUri
    identifier: FhirIdentifier
    display: str


class FhirHumanName(TypedDict, total=False):
    use: Literal["usual", "official", "nickname", "anonymous", "old"]
    text: str
    family: str
    given: list[str]
    prefix: list[str]
    suffix: list[str]


class FhirPeriod(TypedDict, total=False):
    start: FhirDateTime
    end: FhirDateTime


class FhirMeta(TypedDict, total=False):
    versionId: FhirId
    lastUpdated: FhirInstant
    profile: list[FhirUri]


class FhirNarrative(TypedDict, total=False):
    status: Literal["generated", "extensions", "additional", "empty"]
    div: str  # XHTML


class FhirAttachment(TypedDict, total=False):
    contentType: FhirCode
    data: str  # base64
    url: FhirUri
    title: str
    creation: FhirDateTime


class FhirQuantity(TypedDict, total=False):
    value: float
    unit: str
    system: FhirUri
    code: FhirCode


class FhirSignature(TypedDict, total=False):
    type: list[FhirCoding]
    when: FhirInstant
    who: FhirReference
    sigFormat: FhirCode
    data: str  # base64


# --- Resources ------------------------------------------------------------


class Patient(TypedDict, total=False):
    resourceType: Literal["Patient"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    active: bool
    name: list[FhirHumanName]
    telecom: list[dict[str, Any]]
    gender: Literal["male", "female", "other", "unknown"]
    birthDate: FhirDate


class Practitioner(TypedDict, total=False):
    resourceType: Literal["Practitioner"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    name: list[FhirHumanName]
    telecom: list[dict[str, Any]]


class Organization(TypedDict, total=False):
    resourceType: Literal["Organization"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    name: str
    telecom: list[dict[str, Any]]


class Encounter(TypedDict, total=False):
    resourceType: Literal["Encounter"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    status: Literal[
        "planned",
        "arrived",
        "triaged",
        "in-progress",
        "onleave",
        "finished",
        "cancelled",
        "entered-in-error",
        "unknown",
    ]
    class_: FhirCoding  # serialises to "class"; builders emit the "class" key directly
    type: list[FhirCodeableConcept]
    subject: FhirReference
    period: FhirPeriod


class Condition(TypedDict, total=False):
    resourceType: Literal["Condition"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    clinicalStatus: FhirCodeableConcept
    verificationStatus: FhirCodeableConcept
    category: list[FhirCodeableConcept]
    code: FhirCodeableConcept
    subject: FhirReference
    encounter: FhirReference
    recordedDate: FhirDateTime


class Observation(TypedDict, total=False):
    resourceType: Literal["Observation"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    status: Literal[
        "registered",
        "preliminary",
        "final",
        "amended",
        "corrected",
        "cancelled",
        "entered-in-error",
        "unknown",
    ]
    category: list[FhirCodeableConcept]
    code: FhirCodeableConcept
    subject: FhirReference
    encounter: FhirReference
    effectiveDateTime: FhirDateTime
    valueQuantity: FhirQuantity
    valueString: str
    valueCodeableConcept: FhirCodeableConcept
    component: list[dict[str, Any]]


class MedicationRequest(TypedDict, total=False):
    resourceType: Literal["MedicationRequest"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    status: Literal[
        "active",
        "on-hold",
        "cancelled",
        "completed",
        "entered-in-error",
        "stopped",
        "draft",
        "unknown",
    ]
    intent: Literal[
        "proposal",
        "plan",
        "order",
        "original-order",
        "reflex-order",
        "filler-order",
        "instance-order",
        "option",
    ]
    medicationCodeableConcept: FhirCodeableConcept
    medicationReference: FhirReference
    subject: FhirReference
    encounter: FhirReference
    authoredOn: FhirDateTime
    requester: FhirReference
    dosageInstruction: list[dict[str, Any]]


class MedicationStatement(TypedDict, total=False):
    resourceType: Literal["MedicationStatement"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    status: Literal[
        "active",
        "completed",
        "entered-in-error",
        "intended",
        "stopped",
        "on-hold",
        "unknown",
        "not-taken",
    ]
    medicationCodeableConcept: FhirCodeableConcept
    medicationReference: FhirReference
    subject: FhirReference
    context: FhirReference
    effectiveDateTime: FhirDateTime
    dateAsserted: FhirDateTime
    dosage: list[dict[str, Any]]


class AllergyIntolerance(TypedDict, total=False):
    resourceType: Literal["AllergyIntolerance"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    clinicalStatus: FhirCodeableConcept
    verificationStatus: FhirCodeableConcept
    type: Literal["allergy", "intolerance"]
    category: list[FhirCode]
    criticality: Literal["low", "high", "unable-to-assess"]
    code: FhirCodeableConcept
    patient: FhirReference
    encounter: FhirReference
    recordedDate: FhirDateTime
    reaction: list[dict[str, Any]]


class Immunization(TypedDict, total=False):
    resourceType: Literal["Immunization"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    status: Literal["completed", "entered-in-error", "not-done"]
    vaccineCode: FhirCodeableConcept
    patient: FhirReference
    encounter: FhirReference
    occurrenceDateTime: FhirDateTime
    occurrenceString: str
    lotNumber: str
    manufacturer: FhirReference
    performer: list[dict[str, Any]]
    protocolApplied: list[dict[str, Any]]


class DocumentReference(TypedDict, total=False):
    resourceType: Literal["DocumentReference"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: list[FhirIdentifier]
    status: Literal["current", "superseded", "entered-in-error"]
    docStatus: Literal["preliminary", "final", "amended", "entered-in-error"]
    type: FhirCodeableConcept
    category: list[FhirCodeableConcept]
    subject: FhirReference
    date: FhirInstant
    author: list[FhirReference]
    content: list[dict[str, Any]]
    context: dict[str, Any]


class CompositionSection(TypedDict, total=False):
    title: str
    code: FhirCodeableConcept
    text: FhirNarrative
    entry: list[FhirReference]
    section: list[CompositionSection]


class CompositionAttester(TypedDict, total=False):
    mode: Literal["personal", "professional", "legal", "official"]
    time: FhirDateTime
    party: FhirReference


class Composition(TypedDict, total=False):
    resourceType: Literal["Composition"]
    id: FhirId
    meta: FhirMeta
    text: FhirNarrative
    identifier: FhirIdentifier
    status: Literal["preliminary", "final", "amended", "entered-in-error"]
    type: FhirCodeableConcept
    category: list[FhirCodeableConcept]
    subject: FhirReference
    encounter: FhirReference
    date: FhirDateTime
    author: list[FhirReference]
    title: str
    attester: list[CompositionAttester]
    section: list[CompositionSection]


class BundleEntry(TypedDict, total=False):
    fullUrl: FhirUri
    resource: FhirResource


class Bundle(TypedDict, total=False):
    resourceType: Literal["Bundle"]
    id: FhirId
    meta: FhirMeta
    identifier: FhirIdentifier
    type: Literal[
        "document",
        "message",
        "transaction",
        "transaction-response",
        "batch",
        "batch-response",
        "history",
        "searchset",
        "collection",
    ]
    timestamp: FhirInstant
    signature: FhirSignature
    entry: list[BundleEntry]
