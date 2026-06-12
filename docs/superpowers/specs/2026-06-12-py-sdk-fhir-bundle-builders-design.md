# Design — `hims_sdk_fhir` HI-Type bundle builders

**Date:** 2026-06-12
**Package:** `packages/py-sdk-fhir` (`hims_sdk_fhir`)
**Status:** Approved, in implementation
**Branch:** `feat/py-sdk-fhir-bundle-builders` → PR into `dev`

## 1. Purpose

Provide a small, well-organized Python library that takes plain, mostly-optional
domain inputs and returns a complete NRCeS/ABDM **FHIR R4 Document Bundle** for the
four HI-Types the legacy `bundle.js` implements:

- **OP Consultation** (`OPConsultRecord`)
- **Prescription** (`PrescriptionRecord`)
- **Immunization** (`ImmunizationRecord`)
- **Health Document** (`HealthDocumentRecord`)

This replaces the monolithic, ORM-coupled, untested `bundle.js`
(`related-projects` production HIMS, `utils/bundle.js`, 1,971 lines) with a layered,
typed, unit-tested, side-effect-free library.

The primary caller is the Python **OPD** module (FastAPI + SQLAlchemy 2.0). OPD maps
its rows → input dataclasses and calls one composer per finalized clinical event.

## 2. Reference material (source of truth for FHIR shapes)

- Legacy builders: `related-projects` HIMS `utils/bundle.js` and
  `utils/bundleVitalsObservations.js` (the four `build*Bundle` functions + vitals plan).
- In-repo low-level TS SDK to **mirror**: `packages/ts-sdk-fhir/src/` —
  `builders/bundle.ts` (urn:uuid + reference rewrite), `builders/composition.ts`,
  `builders/encounter.ts`, `lib/reference-rewrite.ts`, `types/index.ts`,
  `profile-registry/index.ts`, `canonical-json.ts`, `identifiers.ts`.
- `docs/architecture/adr/0023-distributed-fhir-assembly.md`.

## 3. Architectural fit (ADR-0023)

ADR-0023 mandates: clinical modules serialize their own resource *slices*; Record
Foundation owns Composition + Bundle assembly + validation; the shared SDK owns the
builder primitives.

We are building **complete-bundle composers**, but they live in the **shared SDK**
(not inside OPD), layered on the primitive builders. This is ADR-compliant: no
*module* reinvents composition. The Layer-1/Layer-2 seam is exactly where the future
Record-Foundation split lands — RF can later call the same composers, or OPD can drop
to emitting slices, with no rewrite. This is recorded as the decompose-ready property.

## 4. Discipline (non-negotiable)

- **No I/O.** No DB, HTTP, filesystem, env, or logging. Pure transformation only.
- **No new runtime dependencies.** `uuid` + `datetime` (stdlib) only. (Legacy used
  `moment` + `uuid`; we don't need them.)
- **Deterministic-testable.** All UUID generation goes through an injectable factory;
  all "now" timestamps go through an injectable clock. Defaults are `uuid.uuid4` and
  `datetime.now(IST)`.
- **Mirror the TS SDK API surface** where a counterpart exists (function names,
  input/output shapes) for polyglot byte-compatibility.
- **Omit, don't null.** Optional fields absent from input are omitted from output
  (no `null`/empty-string keys), via a `compact()` helper.

## 5. Module layout

```
packages/py-sdk-fhir/src/hims_sdk_fhir/
  __init__.py            # re-export composers + input dataclasses + primitive builders + constants
  types.py               # FHIR R4 subset as TypedDict (total=False), mirrors ts types/index.ts
  inputs.py              # frozen @dataclass domain inputs (Section 7)
  identifiers.py         # EXISTS — system URIs
  profile_registry.py    # EXISTS — document-level NRCeS profiles; ADD RESOURCE_PROFILES (Section 6)
  lib/
    __init__.py
    uuids.py             # UuidFactory type + default_uuid_factory (uuid4 -> str)
    references.py        # build_reference_map / rewrite_references_in_place (mirror ts)
    canonical_json.py    # canonical_json(obj) -> str  (RFC 8785-style; sorted keys, no whitespace)
    datetimes.py         # IST tz, now_ist(), to_fhir_datetime(), safe_birth_date(), Clock type
    narrative.py         # escape_xml(), generated_narrative(text) -> FhirNarrative
    compact.py           # compact(dict) -> dict  (drop None and empty list/dict/str values, recursive)
  builders/
    __init__.py
    patient.py            # build_patient(PatientInput) -> Patient
    practitioner.py       # build_practitioner(PractitionerInput) -> Practitioner
    organization.py       # build_organization(OrganizationInput) -> Organization
    encounter.py          # build_encounter(EncounterInput, subject_ref) -> Encounter
    condition.py          # build_condition(...) -> Condition
    observation.py        # build_observation(...) -> Observation
    vitals.py             # build_vital_observations(VitalsInput, ctx) -> list[Observation]
    medication_request.py # build_medication_request(MedicineInput, ctx) -> MedicationRequest
    medication_statement.py
    allergy_intolerance.py
    immunization.py       # build_immunization(ImmunizationInput, ctx) -> Immunization
    document_reference.py
    composition.py        # build_composition(...) -> Composition  (mirror ts)
    document_bundle.py    # build_document_bundle(...) -> Bundle    (mirror ts; urn:uuid + ref rewrite)
  hi_types/
    __init__.py
    op_consult.py         # build_op_consult_bundle(OpConsultInput) -> Bundle
    prescription.py       # build_prescription_bundle(PrescriptionInput) -> Bundle
    immunization.py       # build_immunization_bundle(ImmunizationBundleInput) -> Bundle
    health_document.py    # build_health_document_bundle(HealthDocumentInput) -> Bundle
tests/
  lib/ ...                # unit tests per lib helper
  builders/ ...           # unit tests per resource builder
  hi_types/ ...           # integration tests per HI-Type composer
  conftest.py             # deterministic uuid factory + fixed clock fixtures
```

## 6. Constants

### Document-level profiles (already in `profile_registry.py`, registry keys → composition)

| HI-Type        | registry key           | SNOMED type code | display                        | composition title       |
|----------------|------------------------|------------------|--------------------------------|-------------------------|
| OP Consult     | `OpConsultRecord`      | `371530004`      | Clinical consultation report   | `Consultation Report`   |
| Prescription   | `Prescription`         | `440545006`      | Prescription record            | `Prescription record`   |
| Immunization   | `ImmunizationRecord`   | `41000179103`    | Immunization record            | `Immunization record`   |
| Health Document| `HealthDocumentRecord` | `419891008`      | Record artifact                | `Health Document` / doc title |

SNOMED system: `http://snomed.info/sct`. Composition `meta.profile` =
`f"{canonical_url}|{version}"` (mirror ts `buildComposition`).

### Resource-level NRCeS profiles (ADD to `profile_registry.py` as `RESOURCE_PROFILES`)

Each is `https://nrces.in/ndhm/fhir/r4/StructureDefinition/<Name>` (pin version `"2.0.0"`
to match document profiles unless legacy bundle.js omitted version — legacy omitted
version for resources; we stamp the bare canonical URL for resources for IG validity,
**without** `|version`, matching what the NRCeS IG accepts and what bundle.js emitted):

`Patient`, `Practitioner`, `Organization`, `Encounter`, `Condition`, `Observation`,
`MedicationRequest`, `MedicationStatement`, `AllergyIntolerance`, `Immunization`,
`ImmunizationRecommendation`, `DocumentReference`, `Procedure`, `ServiceRequest`, `Binary`.

### Other coding systems (constants)

- v3 ActCode (encounter class): `http://terminology.hl7.org/CodeSystem/v3-ActCode`, `AMB`/ambulatory.
- v2-0203 identifier type: `http://terminology.hl7.org/CodeSystem/v2-0203` (`MR`, `MD`, `PRN`).
- condition-clinical / condition-ver-status / allergyintolerance-* code systems (from bundle.js).
- UCUM: `http://unitsofmeasure.org`.
- v3-Confidentiality security: code `V` / "very restricted".
- Bundle `identifier.system`: `http://hip.in`; bundle `type`: `document`.
- Signature type: `urn:iso-astm:E1762-95:2013` / `1.2.840.10065.1.12.1.1` / "Author's Signature".

## 7. Input model (`inputs.py`, all `@dataclass(frozen=True)`)

Only the **strictly required** fields are non-default; everything else is `Optional`
with a default of `None`/empty. Field names are snake_case.

```python
@dataclass(frozen=True)
class PatientInput:
    full_name: str                      # required (or derived by caller)
    gender: str = "unknown"             # male|female|other|unknown
    birth_date: str | None = None       # YYYY-MM-DD (safe-parsed)
    phone: str | None = None
    mrn: str | None = None              # UHID / medical record number
    abha_number: str | None = None
    abha_address: str | None = None

@dataclass(frozen=True)
class PractitionerInput:
    full_name: str                      # required
    registration_id: str | None = None  # medical council reg no -> identifier MD

@dataclass(frozen=True)
class OrganizationInput:
    name: str                           # required when org provided
    facility_id: str | None = None      # identifier value (PRN); system defaults facility.ndhm
    identifier_system: str | None = None
    phone: str | None = None
    email: str | None = None

@dataclass(frozen=True)
class EncounterInput:
    visit_number: str | None = None     # -> Encounter.identifier; falls back to uuid
    start: str | None = None            # ISO 8601; defaults to now
    status: str = "finished"
    class_code: str = "AMB"             # v3 ActCode

@dataclass(frozen=True)
class DiagnosisInput:
    text: str                           # required
    certainty: str | None = None        # confirmed|provisional/... -> verificationStatus

@dataclass(frozen=True)
class ChiefComplaintInput:
    text: str

@dataclass(frozen=True)
class MedicineInput:
    name: str                           # required
    form: str | None = None             # tablet/syrup...
    strength: str | None = None
    frequency: str | None = None        # "once daily".. -> timing.repeat
    duration_days: int | None = None
    dosage: str | None = None           # "1-0-1" morning/aft/eve
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
class VitalSignInput:                    # versioned-vitals path (preferred)
    code: str                            # display text
    value: float | str
    unit: str | None = None
    ucum_code: str | None = None
    recorded_at: str | None = None

@dataclass(frozen=True)
class LegacyVitalsInput:                 # convenience legacy-flat path
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
    # build_vital_observations maps each present field to a UCUM-coded Observation,
    # mirroring bundleVitalsObservations.js (BP -> two components, etc.)

@dataclass(frozen=True)
class ImmunizationInput:
    vaccine_name: str                    # required
    date: str | None = None              # occurrence date
    dose_number: int | None = None
    lot_number: str | None = None
    manufacturer: str | None = None
    next_due_date: str | None = None     # -> ImmunizationRecommendation
    administered_by: PractitionerInput | None = None

@dataclass(frozen=True)
class DocumentInput:
    title: str                           # required
    content_type: str | None = None      # default application/octet-stream
    data_base64: str | None = None       # DocumentReference.content.attachment.data
    created: str | None = None

# Optional attachments shared across HI-Types (never required):
#   signature_base64: str | None        # -> Bundle.signature
#   pdf_base64: str | None              # -> Binary (prescription)
```

### Composer inputs (Layer 2)

```python
@dataclass(frozen=True)
class OpConsultInput:
    patient: PatientInput               # required
    practitioner: PractitionerInput     # required
    encounter: EncounterInput = EncounterInput()
    chief_complaints: list[ChiefComplaintInput] = ()
    diagnoses: list[DiagnosisInput] = ()
    medicines: list[MedicineInput] = ()
    allergies: list[AllergyInput] = ()
    vitals: list[VitalSignInput] = ()
    legacy_vitals: LegacyVitalsInput | None = None
    organization: OrganizationInput | None = None
    document: DocumentInput | None = None
    signature_base64: str | None = None

@dataclass(frozen=True)
class PrescriptionInput:
    patient: PatientInput               # required
    practitioner: PractitionerInput     # required
    encounter: EncounterInput = EncounterInput()
    diagnoses: list[DiagnosisInput] = ()
    medicines: list[MedicineInput] = ()  # at least one expected for a useful bundle
    organization: OrganizationInput | None = None
    pdf_base64: str | None = None
    signature_base64: str | None = None

@dataclass(frozen=True)
class ImmunizationBundleInput:
    patient: PatientInput               # required
    practitioner: PractitionerInput     # required
    encounter: EncounterInput = EncounterInput()
    immunizations: list[ImmunizationInput] = ()  # >= 1
    organization: OrganizationInput | None = None
    document: DocumentInput | None = None
    signature_base64: str | None = None

@dataclass(frozen=True)
class HealthDocumentInput:
    patient: PatientInput               # required
    document: DocumentInput             # required
    author: PractitionerInput | None = None
    encounter: EncounterInput = EncounterInput()
    organization: OrganizationInput | None = None
    signature_base64: str | None = None
```

(Use `field(default_factory=tuple)` for the list defaults; accept any `Sequence`.)

## 8. Layer behaviours

### Layer-1 builders
Each is a pure function: input dataclass (+ a small `ctx` of already-built reference
strings like `subject_ref`, `practitioner_ref`, `now`) → a FHIR resource `dict` typed
as the matching TypedDict, with `meta.profile` from `RESOURCE_PROFILES`, run through
`compact()`. References are emitted in `ResourceType/id` form using the resource's own
`id`; the bundle builder rewrites them to `urn:uuid:`.

`build_composition` and `build_document_bundle` mirror the TS versions exactly:
- composition stamps `meta.profile = f"{url}|{version}"`, default status `final`,
  generated narrative from `title`.
- document bundle assigns `urn:uuid:<id>` fullUrls, sets matching `resource.id`,
  builds the reference map, rewrites references in place, returns `type:"document"`.
- **uuid + clock are injected** (params with stdlib defaults).

### Layer-2 composers
1. Build Patient, Practitioner (+ optional Organization) → fixed refs.
2. Build Encounter; build per-section clinical resources (conditions, observations,
   vitals, medication requests/statements, allergies, immunizations, document reference,
   binary).
3. Build the Composition with the HI-Type's profile + SNOMED type + sections that
   reference the resources (section entries reference resources by `ResourceType/id`).
4. Call `build_document_bundle(composition=..., entries=[...all resources...],
   uuid_factory=..., clock=...)`.
5. Attach optional `Bundle.signature` when `signature_base64` given.
Return the Bundle dict.

Section composition per HI-Type follows bundle.js (Section 2 reference) but only for
the four named types. Empty sections are omitted.

## 9. Testing

- `pytest`; `conftest.py` provides a **counter-based uuid factory** (`uuid-0001`, …)
  and a **fixed clock** (e.g. `2026-06-12T10:00:00+05:30`) so bundles are
  snapshot-stable.
- Lib tests: reference rewrite, canonical json (sorted keys / stable output), compact,
  datetimes (safe birth date, IST formatting), narrative escaping.
- Builder tests: each resource has correct `resourceType`, `meta.profile`, required
  fields; optional fields omitted when absent.
- HI-Type tests (the important ones): for each composer —
  - `Bundle.type == "document"`, first entry is the Composition,
  - Composition `meta.profile` carries the right canonical URL + version,
  - Composition `type.coding[0].code` is the right SNOMED code,
  - every `Reference.reference` in the bundle is either `urn:uuid:…` resolving to a
    present entry, or an external identifier — **no dangling `Type/id` references**,
  - Patient + Practitioner present; optional inputs (no vitals / no org / no signature)
    produce a valid smaller bundle,
  - signature/pdf/document attachments appear only when provided.
- A shared `assert_references_resolve(bundle)` helper enforces referential integrity.

## 10. Out of scope (YAGNI / defer)

- DiagnosticReport / LIMS HI-Type (not in the four named; same pattern, add later).
- Runtime NRCeS profile *validation* (Record Foundation owns it; `profile_registry`
  stays; a structural validator can be added later).
- Pydantic models for output (TypedDict + plain dict keeps polyglot parity with TS).
- The Discharge Summary / Wellness / Invoice HI-Types.

## 11. Deliverable

Branch `feat/py-sdk-fhir-bundle-builders`, PR into `dev`:
- Implementation under `packages/py-sdk-fhir/src/hims_sdk_fhir/`.
- Tests under `packages/py-sdk-fhir/tests/`.
- Updated `__init__.py`, `README.md`, `pyproject.toml` (test deps already present;
  no runtime deps added).
- All tests green; `ruff` clean.
```
