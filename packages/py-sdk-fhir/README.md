# `hims_sdk_fhir`

Python mirror of [`@hims/ts-sdk-fhir`](../ts-sdk-fhir). FHIR R4 + NRCeS profile
primitives, plus high-level **HI-Type bundle composers** that turn plain domain inputs
into complete NRCeS/ABDM FHIR R4 **Document Bundles**.

> See [ADR-0023 — Distributed FHIR assembly](../../docs/architecture/adr/0023-distributed-fhir-assembly.md).
> Per the ADR's follow-up actions, the Python SDK shipped its skeleton first and the
> implementation landed when the first Python clinical module (OPD) needed FHIR
> serialisation.

## What's here

- **HI-Type composers** (`hi_types/`) — one call → a complete Document Bundle:
  - `build_op_consult_bundle` (`OPConsultRecord`)
  - `build_prescription_bundle` (`PrescriptionRecord`)
  - `build_immunization_bundle` (`ImmunizationRecord`)
  - `build_health_document_bundle` (`HealthDocumentRecord`)
- **Resource builders** (`builders/`) — pure per-resource functions the composers
  assemble: `build_patient`, `build_practitioner`, `build_organization`,
  `build_encounter`, `build_condition`, `build_observation`,
  `build_vital_observations`, `build_medication_request`, `build_medication_statement`,
  `build_allergy_intolerance`, `build_immunization`, `build_document_reference`,
  `build_composition`, `build_document_bundle`.
- **Input dataclasses** (`inputs.py`) — plain, mostly-optional domain inputs. Callers
  (e.g. the OPD module) map their rows to these; only strictly-required fields are
  non-default.
- **Types** (`types.py`) — a hand-typed FHIR R4 subset as `TypedDict`, mirroring the TS
  SDK (plain dicts → wire JSON; polyglot byte-compatible).
- **Profile registry** (`profile_registry.py`) — canonical NRCeS document + resource
  profile URLs with pinned versions; the `DocumentBundle` wrapper profile + default
  confidentiality.
- **Identifiers** (`identifiers.py`) — ABHA Number / ABHA Address / MRN system URIs.
- **Lib primitives** (`lib/`) — injectable UUID factory, IST clock + safe date helpers,
  XHTML narrative, `urn:uuid:` reference rewriting, RFC-8785-style canonical JSON, and
  `compact()` (omit-don't-null).

## Usage

```python
from hims_sdk_fhir import (
    build_op_consult_bundle, OpConsultInput, PatientInput, PractitionerInput,
    EncounterInput, DiagnosisInput, MedicineInput,
)

bundle = build_op_consult_bundle(OpConsultInput(
    patient=PatientInput(full_name="Asha Rao", gender="female",
                         birth_date="1990-04-02", abha_address="asha@sbx", mrn="UHID-12"),
    practitioner=PractitionerInput(full_name="Dr. Mehta", registration_id="MH-9921"),
    encounter=EncounterInput(visit_number="V-2026-555", start="2026-06-12T10:00:00+05:30"),
    diagnoses=[DiagnosisInput(text="Acute pharyngitis", certainty="confirmed")],
    medicines=[MedicineInput(name="Amoxicillin", strength="500mg",
                             frequency="twice daily", duration_days=5)],
    # everything else (vitals, chief complaints, allergies, organization,
    # document, signature_base64 ...) is optional
))
# -> a FHIR Bundle dict (type "document"): Composition first, then the referenced
#    resources, all internal references rewritten to urn:uuid:, ready to serialise.
```

Both UUID generation and the clock are injectable (`uuid_factory=`, `clock=`) so output
is deterministic in tests.

## Discipline

- **No I/O** — no DB, HTTP, filesystem, env, or logging. Pure transformation.
- **No runtime dependencies** — stdlib only (`uuid`, `datetime`).
- Composer owns ids; builders emit `ResourceType/id` references that
  `build_document_bundle` rewrites to `urn:uuid:` (self-contained bundle).
- Public API surface mirrors `@hims/ts-sdk-fhir` for polyglot parity.

## Architecture fit

The composers live in this shared SDK (not inside any clinical module), so they are
ADR-0023-compliant: no module reinvents composition. The Layer-1 (resource builders) /
Layer-2 (composers) seam is exactly where the future Record-Foundation split lands —
Record Foundation can call the same composers, or clinical modules can drop to emitting
resource slices, with no rewrite.

## Not yet implemented (deferred — same pattern, add when needed)

- DiagnosticReport / LIMS HI-Type, Discharge Summary, Wellness, Invoice.
- Runtime NRCeS profile *validation* (Record Foundation owns it; the registry is here).

## Develop

```bash
cd packages/py-sdk-fhir
uv run pytest -q             # tests (deterministic)
uv run ruff check src tests  # lint
```
