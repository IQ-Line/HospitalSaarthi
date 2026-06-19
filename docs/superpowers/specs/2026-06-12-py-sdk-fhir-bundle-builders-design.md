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

## 12. Builder API contract (addendum — Wave B + Wave C code against this)

**ID ownership.** The **composer** (Layer 2) generates every resource's `id` up front
via the injected `uuid_factory` and passes it into the builder as `resource_id`. Cross
references are emitted as `{"reference": f"{ResourceType}/{resource_id}"}`. `build_document_bundle`
later assigns `urn:uuid:<id>` fullUrls and rewrites those `Type/id` references to the
matching `urn:uuid:` — so ids must be stable and references must use the same ids.
Builders never call `uuid_factory` themselves, **except** `build_vital_observations`
(variable fan-out), which takes a `uuid_factory` and sets its own ids.

**Output.** Every builder returns a plain `dict` (typed as its `types.py` TypedDict),
already run through `compact()`, with `meta.profile = [resource_profile("<Type>")]` and
`id = resource_id`. Encounter etc. emit the literal `"class"` JSON key.

**Layer-1 builder signatures** (all keyword-only after the input; `from __future__ import annotations`):

```
# builders/patient.py
build_patient(inp: PatientInput, *, resource_id: str) -> Patient
    # identifiers: MRN (v2-0203 MR, system MRN_SYSTEM_URI) when mrn; ABHA number
    # (system ABHA_NUMBER_SYSTEM_URI) when abha_number; ABHA address
    # (ABHA_ADDRESS_SYSTEM_URI) when abha_address. name=[{text: full_name}].
    # gender, birthDate via safe_birth_date, telecom phone (home) when phone.

# builders/practitioner.py
build_practitioner(inp: PractitionerInput, *, resource_id: str) -> Practitioner
    # identifier MD (v2-0203) system https://doctor.ndhm.gov.in when registration_id.

# builders/organization.py
build_organization(inp: OrganizationInput, *, resource_id: str) -> Organization
    # identifier PRN (v2-0203), system = identifier_system or https://facility.ndhm.gov.in,
    # value = facility_id; telecom phone/email (work) when present.

# builders/encounter.py
build_encounter(inp: EncounterInput, *, resource_id: str, subject: FhirReference, now: str) -> Encounter
    # identifier [{system "https://ndhm.in", value: visit_number or resource_id}];
    # status=inp.status; class={system v3-ActCode, code class_code, display per code
    # (AMB->ambulatory)}; period.start = inp.start or now.

# builders/condition.py
build_condition(*, resource_id: str, text: str, subject: FhirReference,
                certainty: str | None = None, category_problem_list: bool = False,
                recorded_date: str | None = None) -> Condition
    # clinicalStatus active; verificationStatus from certainty (confirmed->confirmed,
    # else provisional) when certainty given; category problem-list-item when flag set.

# builders/observation.py
build_observation(*, resource_id: str, code_text: str, subject: FhirReference, effective: str,
                  value_quantity: tuple[float, str | None, str | None] | None = None,  # (value, unit, ucum)
                  value_string: str | None = None,
                  category_vital_signs: bool = False,
                  components: list[dict] | None = None) -> Observation
    # status final; exactly one of value_quantity / value_string / components.

# builders/vitals.py
build_vital_observations(*, legacy: LegacyVitalsInput | None, vitals: Sequence[VitalSignInput],
                         subject: FhirReference, now: str, uuid_factory: UuidFactory) -> list[Observation]
    # Versioned `vitals` first (value numeric->valueQuantity, else valueString).
    # Then legacy fields -> UCUM-coded Observations, mirroring bundleVitalsObservations.js:
    #   BP -> one Observation "Blood Pressure" with two components (systolic/diastolic, mm[Hg]);
    #   pulse /min; temperature [degF]; respiratory rate /min; spo2 %; height cm; weight kg;
    #   bmi kg/m2; blood sugar mg/dL. Each carries category vital-signs + an id from uuid_factory.

# builders/medication_request.py
build_medication_request(inp: MedicineInput, *, resource_id: str, subject: FhirReference,
                         requester: FhirReference, authored_on: str,
                         reason_reference: FhirReference | None = None) -> MedicationRequest
    # status active, intent order; medicationCodeableConcept.text = "name (form) (strength)"
    # (omit empty parens); dosageInstruction[0].text built from dosage/frequency/duration/
    # route/method/sos (mirror bundle.js); timing.repeat from frequency/duration_days;
    # dispenseRequest.quantity when quantity.

# builders/medication_statement.py
build_medication_statement(*, resource_id: str, text: str, subject: FhirReference,
                           effective: str | None = None) -> MedicationStatement
    # status active; medicationCodeableConcept.text = text.

# builders/allergy_intolerance.py
build_allergy_intolerance(inp: AllergyInput | None, *, resource_id: str, patient: FhirReference,
                          recorder: FhirReference | None = None, recorded_date: str) -> AllergyIntolerance
    # inp None -> "No known allergies" resource. clinicalStatus active, verificationStatus
    # confirmed; code.text = inp.text; note from reaction/severity.

# builders/immunization.py
build_immunization(inp: ImmunizationInput, *, resource_id: str, patient: FhirReference, now: str,
                   manufacturer: FhirReference | None = None,
                   performer: FhirReference | None = None) -> Immunization
    # status completed; vaccineCode.text = vaccine_name; occurrenceDateTime = date or now
    # (use occurrenceString fallback only if date unparseable); lotNumber; protocolApplied
    # [{doseNumberPositiveInt: dose_number}] when dose_number; manufacturer/performer refs.
    # (ImmunizationRecommendation for next_due_date is built by the composer, not here.)

# builders/document_reference.py
build_document_reference(inp: DocumentInput, *, resource_id: str, subject: FhirReference) -> DocumentReference
    # status current, docStatus final; type.text = title; content[0].attachment =
    # {contentType: content_type or application/octet-stream, language en-IN,
    #  data: data_base64 (omit if None), title, creation: created or now-handled-by-composer}.

# builders/composition.py  (mirror ts buildComposition)
build_composition(*, profile: str,  # NRCES_PROFILES key
                  type: FhirCodeableConcept, subject: FhirReference, author: list[FhirReference],
                  date: str, title: str, sections: list[CompositionSection],
                  encounter: FhirReference | None = None, identifier: FhirIdentifier | None = None,
                  status: str = "final", custodian: FhirReference | None = None) -> Composition
    # meta.profile = [f"{canonical_url}|{version}"]; generated narrative from title.

# builders/document_bundle.py  (mirror ts buildDocumentBundle)
build_document_bundle(*, composition: Composition, entries: list[FhirResource],
                      uuid_factory: UuidFactory = default_uuid_factory,
                      clock: Clock = default_clock,
                      identifier: FhirIdentifier | None = None,
                      timestamp: str | None = None,
                      meta: FhirMeta | None = None) -> Bundle
    # type "document"; first entry = composition; assign urn:uuid: fullUrls + matching ids;
    # build ref map; rewrite_references_in_place over all entries. identifier defaults to
    # {system "http://hip.in", value: f"urn:uuid:{uuid}"}. When meta given, set bundle["meta"]
    # (composer passes DocumentBundle profile + CONFIDENTIALITY_SECURITY). Mirrors ts exactly
    # for the default (meta=None) call.
```

**Composer (Layer-2) responsibilities** (one per `hi_types/*.py`):
1. `now = to_fhir_datetime(clock())`. Generate ids via `uuid_factory()`.
2. Build Patient, Practitioner (+ Organization if given). Build Encounter.
3. Build the HI-Type's clinical resources + section entry lists (omit empty sections).
4. `comp = build_composition(profile=<key>, type=<SNOMED codeable concept>, subject=patient_ref,
   encounter=encounter_ref, author=[practitioner_ref], date=now, title=<title>, sections=...,
   custodian=org_ref if org)`.
5. `bundle = build_document_bundle(composition=comp, entries=[encounter, patient, practitioner, ...],
   uuid_factory=uuid_factory, clock=clock, meta={"profile": [f"{DOCUMENT_BUNDLE_PROFILE}|{DOCUMENT_BUNDLE_PROFILE_VERSION}"], "security": [CONFIDENTIALITY_SECURITY]})`.
6. Attach `bundle["signature"]` (FhirSignature, who=practitioner_ref) when `signature_base64`.
7. For Prescription `pdf_base64`: add a `Binary` resource ({resourceType, id, contentType
   application/pdf, data}) to entries and a section/Binary reference. Return the bundle dict.

**Composer signatures** (keyword-only injectables with stdlib defaults so tests pass deterministic ones):
```
build_op_consult_bundle(inp: OpConsultInput, *, uuid_factory=default_uuid_factory, clock=default_clock) -> Bundle
build_prescription_bundle(inp: PrescriptionInput, *, uuid_factory=default_uuid_factory, clock=default_clock) -> Bundle
build_immunization_bundle(inp: ImmunizationBundleInput, *, uuid_factory=default_uuid_factory, clock=default_clock) -> Bundle
build_health_document_bundle(inp: HealthDocumentInput, *, uuid_factory=default_uuid_factory, clock=default_clock) -> Bundle
```

**SNOMED composition `type` per HI-Type** (system `http://snomed.info/sct`):
OP Consult `371530004`/"Clinical consultation report"; Prescription `440545006`/"Prescription record";
Immunization `41000179103`/"Immunization record"; Health Document `419891008`/"Record artifact".
Titles: "Consultation Report", "Prescription record", "Immunization record", and the document's
`title` (fallback "Health Document") respectively.
```
