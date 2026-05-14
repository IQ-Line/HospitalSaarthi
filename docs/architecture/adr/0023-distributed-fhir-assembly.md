# ADR-0023: Distributed FHIR assembly via per-module serializers

- **Status:** Proposed
- **Date:** 2026-05-08
- **Deciders:** [Architect], [Engineering Manager], [Co-Tech-Lead]

## Context and problem statement

[ADR-0010](./0010-fhir-hl7-interop-standards.md) commits the platform to FHIR R4 as the interop standard. [ADR-0022](./0022-immutable-fhir-document-storage.md) commits the platform to producing FHIR Document Bundles at finalisation and persisting them byte-exactly. This ADR addresses *who produces them*.

The work to produce a FHIR Document Bundle for a clinical event has three parts:

1. **Resource serialisation.** Translating a domain row (an `opd_visits` row, a `prescriptions` row, a `lab_reports` row) into one or more FHIR resources (`Encounter`, `MedicationRequest`, `DiagnosticReport`).
2. **Composition assembly.** Wrapping the resources into a `Bundle` of type `document` headed by a `Composition` that names the document type, narrative, sections, and authoring practitioner per the relevant NRCeS profile.
3. **Validation.** Validating the assembled bundle against the NRCeS profile to ensure it will be accepted by ABDM's gateway.

Two architectural patterns exist:

**A. Centralised FHIR mapper.** A single Mapper service queries every clinical module's database (or polls projections), converts rows into FHIR resources, and assembles bundles. The production HIMS uses this pattern -- `abdi-lims-backed`'s `fhir-mapper` is a separate service that knows how to read OPD, Lab, and other module data.

**B. Distributed FHIR assembly.** Each clinical module owns the serialisation of *its own* domain rows into FHIR resources. The Record Foundation orchestrates Composition assembly, validation, and storage.

Pattern (A) is the path of least resistance for a small team: one place to put all the FHIR knowledge. Pattern (B) is the path of least *long-term* resistance: it preserves module autonomy and lets FHIR work scale with the team.

## Decision drivers

- **Module autonomy** ([CLAUDE.md project rule](../../../CLAUDE.md): "No cross-module imports. `modules/*` cannot import from other `modules/*`."). A centralised mapper that reads `opd.visits`, `lab.reports`, `pharmacy.dispensations` directly violates this rule. It either reaches across schema boundaries (forbidden) or maintains its own projections of every clinical module (a coordination tax that grows with the module count).
- **Domain knowledge locality.** The team that knows what an OPD visit means is the OPD team. The team that knows what a lab result means is the Lab team. FHIR mapping decisions (what `Observation.category` to use, what `Encounter.class` is appropriate, how to encode dosage) are domain decisions, not transport decisions.
- **Velocity.** A central mapper becomes a bottleneck: every new clinical field requires a coordinated change in two services. Distributed serialisers let each module evolve independently.
- **Schema evolution.** When the Lab module adds a new field, only the Lab module's FHIR serialiser needs to change. A central mapper would need to be aware of the schema change before it could ship.
- **Cross-module Composition.** A discharge summary references OPD admission notes, IPD progress notes, lab results, and medications. This is the legitimate centralisation point: composing a multi-resource bundle. Record Foundation orchestrates this, calling each module for its resources.
- **Validation as a shared concern.** FHIR profile validation against NRCeS profiles is a single, well-defined operation. It belongs in a shared library, not duplicated per module.
- **Polyglot future** ([ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md)). A centralised mapper in TypeScript could not serve a future Python service's domain. Distributed serialisers run inside each module's runtime, in whatever language the module is written in, all consuming the same shared spec.
- **Testability.** A serialiser that runs in-process inside its own module, with the domain row in hand, is trivially unit-testable. A central mapper that reaches across networks/databases for source data is harder to test deterministically.

## Considered options

1. **Centralised FHIR mapper service** (A). A dedicated service that owns FHIR serialisation for every clinical module.
2. **Distributed FHIR assembly with shared SDK** (B). Each module emits FHIR resources for its domain at finalisation time, attached to its `*.finalized` event payload. Record Foundation orchestrates Composition assembly. Both modules and Record Foundation depend on a shared `@hims/ts-sdk-fhir` (and `@hims/py-sdk-fhir`) package for resource builders, profile registry, and validators.
3. **Embedded mapping in Integration Hub.** Have the Integration Hub do the mapping at the moment of an outbound `health-information.transfer`. Rejected at the start of analysis because [ADR-0028](./0028-record-foundation-fifth-core-module.md) and [ADR-0022](./0022-immutable-fhir-document-storage.md) require persistence at finalisation, not at transfer.

## Decision outcome

Chosen option: **Distributed FHIR assembly with shared SDK** (B).

**Where work happens:**

| Concern | Owner |
|---|---|
| `OpConsultRecord.Encounter`, `MedicationRequest` for the visit's prescription | OPD module |
| `DiagnosticReport`, `Observation`s for a finalised lab report | Lab module |
| `MedicationDispense` for a dispensation event | Pharmacy module |
| `Encounter` (admission), `Procedure` for an inpatient stay | IPD module |
| `Patient` resource for a tenant patient | EMPI |
| `Practitioner`, `Organization` resources | User Management (Practitioner) and Configurator (Organization) |
| **Composition assembly** (wrapping the above into a Document Bundle by NRCeS profile) | **Record Foundation** |
| **Profile validation** (against NRCeS R4 IG) | **Record Foundation** (using `@hims/ts-sdk-fhir`) |
| **Bundle storage** (byte-exact, immutable) | **Record Foundation** |
| FHIR resource builders, profile registry, validators, Composition templates | **`@hims/ts-sdk-fhir` shared package** (and `@hims/py-sdk-fhir` sibling) |

**Event flow at finalisation:**

```mermaid
flowchart LR
  A[Clinician clicks Finalize<br/>in OPD] --> B[OPD use-case:<br/>finalize-consultation]
  B --> C[OPD serialiser<br/>(uses @hims/ts-sdk-fhir)<br/>builds Encounter +<br/>MedicationRequest etc.]
  C --> D[OPD publishes<br/>consultation.finalized event<br/>with FHIR resources attached]
  D --> E[Record Foundation<br/>consumer]
  E --> F[Compose into<br/>OPConsultRecord Bundle<br/>(uses @hims/ts-sdk-fhir)]
  F --> G[Validate against<br/>NRCeS profile]
  G --> H[Store immutably in<br/>record_foundation.bundle_storage]
  H --> I[Register care_context]
```

The shared SDK provides:

- Resource type builders (`buildEncounter(input): Encounter`, `buildMedicationRequest(input): MedicationRequest`).
- `Composition` and `Bundle` builders, with Composition templates for each NRCeS profile (`OpConsultRecord`, `Prescription`, `DischargeSummary`, `DiagnosticReport`, `HealthDocumentRecord`).
- A profile validator that runs the assembled bundle against NRCeS R4 ImplementationGuide assets.
- Identifier-system constants (ABHA system URI, MRN system URI, etc.).
- Datetime, codeable-concept, and reference helpers.

The SDK has *no* I/O, *no* database access, *no* HTTP. It is pure transformation code. This makes it safe to publish in any language (TS, Python, future Go) without runtime constraints.

### Consequences

**Positive:**

- Module autonomy preserved. Each clinical module owns the FHIR shape of its own data. No cross-module imports.
- Schema evolution localised. When OPD adds a `triage_score` field, only OPD's serialiser changes. Record Foundation, the SDK, and other modules are untouched.
- Velocity scales linearly. Adding the Lab module's FHIR support is independent of OPD's.
- Polyglot-ready. A future Python module ships its own serialiser using `@hims/py-sdk-fhir`. The Composition and validation pipeline in Record Foundation does not need a Python adapter.
- Testability is excellent. Each serialiser is a pure function; a Vitest test pipes a domain object in and checks the FHIR resource out.
- The SDK becomes a single source of truth for profile compliance. NRCeS profile updates propagate by updating the SDK once.
- The composition seam in Record Foundation handles cross-resource concerns (Composition narrative, signers, attesters, document references) once, not per module.

**Negative / accepted trade-offs:**

- More files to write. Each clinical module ships an `opd-fhir.serialiser.ts` (or equivalent). Mitigation: serialisers are mechanical and small; the SDK provides the heavy primitives.
- Modules must own NRCeS profile knowledge for their domain. Mitigation: the SDK encapsulates the *requirements* (which fields must be present, which value sets to use) so the module owner only needs to populate them, not interpret them.
- The shared SDK is a coupling point. Breaking changes in the SDK ripple to every module. Mitigation: standard semver discipline, plus the SDK is internal (no external consumers); rolling updates are straightforward.
- Initial bootstrap cost. The first version of the SDK and the first module's serialiser arrive together. Mitigation: scoped to the OPD module's needs in Phase 1 (OpConsultRecord + Prescription); other profiles arrive as their owning modules arrive.

**Follow-up actions:**

- [ ] Create `packages/ts-sdk-fhir/` with the API surface described above.
- [ ] Create `packages/py-sdk-fhir/` skeleton (built when the first Python service touches FHIR; the spec is mirrored in this ADR but the implementation is deferred).
- [ ] Define the OPD serialiser contract in [Record Foundation LLD](../lld/record-foundation/01-schema-design.md) and the OPD LLD (when written).
- [ ] Define the Record Foundation consumer that turns `consultation.finalized` events into stored bundles.
- [ ] Define the SDK's profile registry: which NRCeS profile versions are pinned, how upgrades happen.
- [ ] Add CI: a profile-conformance test suite that fixtures real `opd_visits` rows and asserts the produced bundles validate against NRCeS profiles. This is the Facilitation Testing rehearsal.

### How this differs from the centralised mapper

The production HIMS's `fhir-mapper` ([referenced repo](https://github.com/NHA-ABDM/ABDM-wrapper)'s `fhir-mapper` module is the canonical example) is a *service* that exposes endpoints like `POST /v1/bundle/op-consultation` and returns assembled bundles. Internally it knows the structure of every clinical domain.

The differences are operational, not just stylistic:

| Concern | Centralised mapper | Distributed assembly |
|---|---|---|
| Where serialisation runs | A separate service | In-process inside each clinical module |
| Schema knowledge | Mapper has projections of every clinical schema | Each module knows its own schema only |
| Coordination cost on schema change | Mapper team + clinical module team | Clinical module team only |
| Polyglot support | Mapper is one language; can serve TS modules but not Python | Each module ships its own serialiser in its own language |
| Testability | Requires the Mapper service running with seeded data | Pure unit tests per module |
| Composition orchestration | Inside the mapper | Inside Record Foundation |
| Profile validation | Inside the mapper | Inside the SDK, called by Record Foundation |
| Failure mode on Mapper outage | All FHIR-producing flows fail | -- (no central service to fail) |

The centralised mapper is operationally simpler in the small (one place for FHIR knowledge) but pays compounding costs in the large (every new module is a Mapper-team commitment). The distributed pattern is ergonomically heavier per-module (you write the serialiser) but the costs do not compound.

## Pros and cons of the options

### Centralised FHIR mapper service

- *Good:* All FHIR knowledge in one place. New FHIR engineers have one codebase to learn.
- *Good:* The production HIMS already does this; pattern is familiar.
- *Bad:* Violates the "no cross-module imports / no cross-schema queries" rules. To honour them, the Mapper would need projections of every module, dramatically expanding its data ownership.
- *Bad:* Bottleneck for clinical schema changes. Two-team coordination on every change.
- *Bad:* Polyglot story is poor. A TypeScript Mapper cannot serialise a Python module's data without inventing a cross-language reading interface.
- *Bad:* Mapper outage halts all FHIR-producing flows.
- *Bad:* Testability is harder. End-to-end fixtures across module boundaries.

### Distributed FHIR assembly with shared SDK

- *Good:* Module autonomy, no schema-boundary violations.
- *Good:* Polyglot-ready.
- *Good:* Schema changes are localised.
- *Good:* Trivially unit-testable per serialiser.
- *Good:* Record Foundation owns the legitimately-centralised concern (Composition + validation + storage).
- *Bad:* Each clinical module must own a serialiser file.
- *Bad:* Profile knowledge for the module's domain lives in the module (mitigated by the SDK).

### Embedded mapping in Integration Hub (rejected)

- *Bad:* Forces ad-hoc generation at outbound time, contradicting [ADR-0022](./0022-immutable-fhir-document-storage.md).
- *Bad:* Concentrates clinical-record concerns in a transport service.
- Not considered further.

## Links

- Related ADRs:
  - [ADR-0008 -- Module shape and boundaries](./0008-module-shape-and-boundaries.md) -- the no-cross-module-imports rule
  - [ADR-0010 -- FHIR / HL7 interop standards](./0010-fhir-hl7-interop-standards.md) -- baseline FHIR R4 commitment
  - [ADR-0016 -- Polyglot Nx monorepo, spec-first](./0016-polyglot-nx-monorepo-spec-first-contracts.md) -- the polyglot constraint that ruled out a TS-only mapper
  - [ADR-0028 -- Record Foundation as a fifth core module](./0028-record-foundation-fifth-core-module.md) -- the module that owns composition + validation + storage
  - [ADR-0022 -- Immutable FHIR Document Storage](./0022-immutable-fhir-document-storage.md) -- the persistence discipline these bundles satisfy
- Related LLD: [Record Foundation LLD](../lld/record-foundation/01-schema-design.md), `packages/ts-sdk-fhir/README.md` (target documents)
- External sources:
  - HL7 International, "FHIR R4 -- Documents", https://hl7.org/fhir/R4/documents.html, accessed 2026-05-08
  - HL7 International, "FHIR R4 -- Bundle", https://hl7.org/fhir/R4/bundle.html, accessed 2026-05-08
  - HL7 International, "FHIR R4 -- Composition", https://hl7.org/fhir/R4/composition.html, accessed 2026-05-08
  - HL7 International, "FHIR R4 -- Profiling", https://hl7.org/fhir/R4/profiling.html, accessed 2026-05-08
  - National Resource Centre for EHR Standards (NRCeS), "ABDM FHIR Implementation Guide R4", https://nrces.in/ndhm/fhir/r4/index.html, accessed 2026-05-08 -- the profile registry the SDK pins to
  - National Health Authority, "ABDM Wrapper -- fhir-mapper", https://github.com/NHA-ABDM/ABDM-wrapper/tree/main/fhir-mapper, accessed 2026-05-08 -- the centralised-mapper reference implementation; treated as a pattern to learn from but not to replicate
  - Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software* (Addison-Wesley, 2003), Chapter 14 -- "Maintaining Model Integrity" / Bounded Context, the conceptual basis for module-owned serialisation
  - Sam Newman, *Building Microservices*, 2nd edition (O'Reilly, 2021), Chapter 4 -- arguments against shared databases / schema reach-across that apply to centralised mappers
