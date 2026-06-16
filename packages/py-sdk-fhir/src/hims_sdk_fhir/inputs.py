"""Domain input dataclasses for the HI-Type bundle composers.

These are the plain, mostly-optional inputs callers (primarily the OPD module)
map their rows to. Only strictly required fields are non-default; everything
else defaults to ``None``/empty. All are ``frozen`` for safety, and sequence
fields default to an empty tuple via ``field(default_factory=tuple)`` so no
mutable default is shared across instances.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

# --- Layer-1 (resource) inputs -------------------------------------------


@dataclass(frozen=True)
class PatientInput:
    full_name: str  # required (or derived by caller)
    gender: str = "unknown"  # male|female|other|unknown
    birth_date: str | None = None  # YYYY-MM-DD (safe-parsed)
    phone: str | None = None
    mrn: str | None = None  # UHID / medical record number
    abha_number: str | None = None
    abha_address: str | None = None


@dataclass(frozen=True)
class PractitionerInput:
    full_name: str  # required
    registration_id: str | None = None  # medical council reg no -> identifier MD


@dataclass(frozen=True)
class OrganizationInput:
    name: str  # required when org provided
    facility_id: str | None = None  # identifier value (PRN); system defaults facility.ndhm
    identifier_system: str | None = None
    phone: str | None = None
    email: str | None = None


@dataclass(frozen=True)
class EncounterInput:
    visit_number: str | None = None  # -> Encounter.identifier; falls back to uuid
    start: str | None = None  # ISO 8601; defaults to now
    status: str = "finished"
    class_code: str = "AMB"  # v3 ActCode


@dataclass(frozen=True)
class DiagnosisInput:
    text: str  # required
    certainty: str | None = None  # confirmed|provisional/... -> verificationStatus


@dataclass(frozen=True)
class ChiefComplaintInput:
    text: str


@dataclass(frozen=True)
class MedicineInput:
    name: str  # required
    form: str | None = None  # tablet/syrup...
    strength: str | None = None
    frequency: str | None = None  # "once daily".. -> timing.repeat
    duration_days: int | None = None
    dosage: str | None = None  # "1-0-1" morning/aft/eve
    route: str | None = None
    method: str | None = None
    sos: str | None = None
    quantity: float | None = None


@dataclass(frozen=True)
class AllergyInput:
    text: str
    reaction: str | None = None
    severity: str | None = None


@dataclass(frozen=True)
class VitalSignInput:
    """Versioned-vitals path (preferred)."""

    code: str  # display text
    value: float | str
    unit: str | None = None
    ucum_code: str | None = None
    recorded_at: str | None = None


@dataclass(frozen=True)
class LegacyVitalsInput:
    """Convenience legacy-flat vitals path.

    ``build_vital_observations`` maps each present field to a UCUM-coded
    Observation, mirroring ``bundleVitalsObservations.js`` (BP -> two
    components, etc.).
    """

    bp_systolic: float | None = None
    bp_diastolic: float | None = None
    pulse_bpm: float | None = None
    temperature_f: float | None = None
    respiratory_rate: float | None = None
    spo2_percent: float | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    bmi: float | None = None
    blood_sugar_mg_dl: float | None = None


@dataclass(frozen=True)
class ImmunizationInput:
    vaccine_name: str  # required
    date: str | None = None  # occurrence date
    dose_number: int | None = None
    lot_number: str | None = None
    manufacturer: str | None = None
    next_due_date: str | None = None  # -> ImmunizationRecommendation
    administered_by: PractitionerInput | None = None


@dataclass(frozen=True)
class DocumentInput:
    title: str  # required
    content_type: str | None = None  # default application/octet-stream
    data_base64: str | None = None  # DocumentReference.content.attachment.data
    created: str | None = None


# --- Layer-2 (composer) inputs -------------------------------------------


@dataclass(frozen=True)
class OpConsultInput:
    patient: PatientInput  # required
    practitioner: PractitionerInput  # required
    encounter: EncounterInput = field(default_factory=EncounterInput)
    chief_complaints: Sequence[ChiefComplaintInput] = field(default_factory=tuple)
    diagnoses: Sequence[DiagnosisInput] = field(default_factory=tuple)
    medicines: Sequence[MedicineInput] = field(default_factory=tuple)
    allergies: Sequence[AllergyInput] = field(default_factory=tuple)
    vitals: Sequence[VitalSignInput] = field(default_factory=tuple)
    legacy_vitals: LegacyVitalsInput | None = None
    organization: OrganizationInput | None = None
    document: DocumentInput | None = None
    signature_base64: str | None = None


@dataclass(frozen=True)
class PrescriptionInput:
    patient: PatientInput  # required
    practitioner: PractitionerInput  # required
    encounter: EncounterInput = field(default_factory=EncounterInput)
    diagnoses: Sequence[DiagnosisInput] = field(default_factory=tuple)
    medicines: Sequence[MedicineInput] = field(default_factory=tuple)  # >=1 for a useful bundle
    organization: OrganizationInput | None = None
    pdf_base64: str | None = None
    signature_base64: str | None = None


@dataclass(frozen=True)
class ImmunizationBundleInput:
    patient: PatientInput  # required
    practitioner: PractitionerInput  # required
    encounter: EncounterInput = field(default_factory=EncounterInput)
    immunizations: Sequence[ImmunizationInput] = field(default_factory=tuple)  # >= 1
    organization: OrganizationInput | None = None
    document: DocumentInput | None = None
    signature_base64: str | None = None


@dataclass(frozen=True)
class HealthDocumentInput:
    patient: PatientInput  # required
    document: DocumentInput  # required
    author: PractitionerInput | None = None
    encounter: EncounterInput = field(default_factory=EncounterInput)
    organization: OrganizationInput | None = None
    signature_base64: str | None = None
