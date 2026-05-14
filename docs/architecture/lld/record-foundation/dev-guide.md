# Record Foundation -- Phased Implementation Guide

> Mirror of the GitHub issue body. Posted as a separate issue to track the implementation.

Record Foundation is the fifth core platform module per [ADR-0028](../../adr/0028-record-foundation-fifth-core-module.md). It owns the cross-module clinical-record substrate: care contexts, immutable FHIR Document Bundles, the external HIU bundle inbox, the timeline read-model, and consent-driven erasure.

### What's already designed

- **HLD:** [02-core-modules.md §5](../../hld/02-core-modules.md#5-record-foundation), [05-integration-and-interop.md §4](../../hld/05-integration-and-interop.md#4-abdmabha-integration).
- **LLD schema:** [01-schema-design.md](./01-schema-design.md), [`schema-reference.json`](./schema-reference.json) (6 tables).
- **Scenarios:** [02-scenarios.md](./02-scenarios.md) (8 sequence-driven walkthroughs).
- **OpenAPI spec:** [`specs/openapi/record-foundation.v1.yaml`](../../../../specs/openapi/record-foundation.v1.yaml) (14 paths).
- **ERD:** [`record-foundation.erd.json`](./record-foundation.erd.json).
- **ADRs:** [0021](../../adr/0028-record-foundation-fifth-core-module.md), [0022](../../adr/0022-immutable-fhir-document-storage.md), [0023](../../adr/0023-distributed-fhir-assembly.md).
- **Shared SDK:** `packages/ts-sdk-fhir/` (skeleton; bodies implemented in this work).

---

## Phase 0 -- Schema agreement (already done, this LLD)

- [x] Schema agreed and committed.
- [x] ERD reviewed by team.
- [x] dev-doubts/01.md captures deferred decisions.
- No code in Phase 0; the module is built in Phase 1 alongside OPD + ABDM Adapter + first FHIR consumers.

## Phase 1a -- Service scaffold + schema migrations (1 dev-week)

**Goal:** `record-foundation-svc` runs and answers minimal endpoints.

- [ ] Scaffold `services/record-foundation-svc/` (port 3006, Fastify v5).
- [ ] Scaffold `modules/record-foundation/` per Module Shape Template ([HLD 03](../../hld/03-module-shape-template.md)).
- [ ] Generate Drizzle migrations for the 6 tables in [schema-reference.json](./schema-reference.json).
- [ ] Citus distribution: every table by `iq_tenant_id`. The `idx_external_records_erase_due` and `idx_care_contexts_erase_due` indexes intentionally do NOT lead with `iq_tenant_id` (per [01-schema-design.md §9](./01-schema-design.md#9-distribution-and-tenancy)).
- [ ] Wire identity adapter, tenant context, event publisher, DB helpers (existing `@hims/ts-sdk-*` packages).
- [ ] Cerbos policies for Record Foundation actions (read patient timeline, ingest external record, run erasure, etc.).
- [ ] Seed-data: none (Record Foundation is consumer-driven; data arrives via events).

## Phase 1b -- Implement `@hims/ts-sdk-fhir` bodies (2-3 dev-weeks, parallelisable)

**Goal:** The FHIR SDK is real, not a skeleton. OPD will use it to serialise resources; Record Foundation will use it to assemble Composition + Bundle.

- [ ] Implement resource builders (`buildEncounter`, `buildMedicationRequest`, `buildDiagnosticReport`, `buildObservation`, `buildPatient`, `buildPractitioner`, `buildOrganization`).
- [ ] Implement `buildComposition` and `buildDocumentBundle` per FHIR R4 Document semantics.
- [ ] Implement canonical JSON serialiser (RFC 8785 / JCS) -- critical for byte-stable bundles ([ADR-0022](../../adr/0022-immutable-fhir-document-storage.md)).
- [ ] Pin NRCeS R4 profile assets in the package (StructureDefinitions, ValueSets, CodeSystems for OpConsultRecord, Prescription, DischargeSummary, DiagnosticReport, HealthDocumentRecord, ImmunizationRecord, WellnessRecord). Source: [NRCeS FHIR IG](https://nrces.in/ndhm/fhir/r4/index.html).
- [ ] Implement `validateAgainstProfile(bundle, profileUrl, version)` using `fhir.js` or a custom validator that loads the StructureDefinition and applies cardinality + value-set constraints.
- [ ] Vitest fixtures: golden FHIR bundles for each profile + assertion that re-serialisation is byte-stable.

## Phase 1c -- Care contexts + bundle vault on consultation.finalized (2 dev-weeks)

**Goal:** OPD finalises a consultation; Record Foundation produces and stores the immutable bundle; care_context registered.

- [ ] Implement the `consultation.finalized` consumer in Record Foundation. Per [02-scenarios.md §1](./02-scenarios.md#scenario-1----opd-consultation-finalises-care-context-registered-bundle-stored): one transaction wraps INSERT bundle_storage + INSERT manifest + INSERT care_context + INSERT timeline_index + UPDATE manifest care_context_id.
- [ ] Implement REST handlers for the **Care Contexts** and **Bundles** tags from [record-foundation.v1.yaml](../../../../specs/openapi/record-foundation.v1.yaml).
- [ ] Implement OPD's FHIR serialiser in `modules/opd/src/fhir/op-consult.serialiser.ts`. (This work happens in the OPD module, not Record Foundation -- but coordinated because the event payload contract is shared.)
- [ ] Hash + integrity check on every bundle read (per [02-scenarios.md §5](./02-scenarios.md#scenario-5----doctor-opens-an-external-record)).
- [ ] No-UPDATE discipline on `bundle_storage`: enforced by repository code review; PostgreSQL trigger optional in v1.5.
- [ ] Acceptance: OPD finalises a consultation, a row appears in `bundle_storage` + `record_bundle_manifests` + `care_contexts` + `timeline_index`, and the bundle JSON validates against the NRCeS OpConsultRecord profile.

## Phase 1d -- Timeline projection + ABDM HIP discovery (1 dev-week)

**Goal:** Doctor's timeline UI can read a patient timeline; Integration Hub's M2 discovery can list a patient's care contexts.

- [ ] Implement the **Timeline** tag handlers (`GET /api/v1/timeline?patient_id=X`).
- [ ] Implement the **Care Contexts -- discoverable** handler (`GET /api/v1/care-contexts/discoverable?patient_id=X`).
- [ ] Implement the **Disclosures** handler (`POST /api/v1/disclosures`) -- consumed by Integration Hub at HIP push time.
- [ ] Wire the `abdm.consent.granted` and `abdm.consent.revoked` consumers -- they flip `timeline_index.consent_disclosable` for affected care contexts.
- [ ] Acceptance: a doctor opens a patient and sees the timeline; an external HIU's discovery (via Integration Hub) returns the same set of care contexts.

## Phase 1e -- External HIU inbox + record viewer (1 dev-week)

**Goal:** Records received from external HIPs land in Record Foundation and are viewable by the doctor.

- [ ] Implement the `abdm.health-record.received` consumer per [02-scenarios.md §4](./02-scenarios.md#scenario-4----external-hiu-bundle-arrives-ingested-into-record-foundation): INSERT bundle_storage + manifest + care_context (source_origin='external_abdm') + external_health_records + timeline_index in one transaction.
- [ ] Implement display-summary parser (extract `Composition.title`, `Composition.attester[0].party.display`, `Composition.date`, first Section's first `Condition` if present).
- [ ] Implement **External Records** tag handlers -- list, get-by-id (returns full bundle), mark-viewed.
- [ ] Acceptance: an external bundle arrives via Integration Hub, lands in Record Foundation, surfaces in the timeline with `External: <HIP name>` label, and is viewable.

## Phase 1f -- Erasure scheduler (1 dev-week)

**Goal:** Consent-expired or consent-revoked records are erased; `erasure_log` records the proof.

- [ ] Implement the nightly erasure scheduler per [02-scenarios.md §7](./02-scenarios.md#scenario-7----erasure-scheduler-nightly-run). pg_cron at 02:00 IST. pg_advisory_lock to prevent concurrent runs.
- [ ] Erasure order: INSERT erasure_log (kind=external_health_record) -> DELETE external_health_records -> INSERT erasure_log (kind=bundle_storage) -> DELETE bundle_storage -> DELETE record_bundle_manifests -> UPDATE care_contexts.status='archived' -> DELETE timeline_index. All in a per-record transaction.
- [ ] Implement the **Admin** tag handlers -- timeline rebuild (`POST /api/v1/admin/timeline/rebuild?patient_id=X`), erasure-runs trigger / dry-run.
- [ ] Acceptance: a record with `data_erase_at < now()` gets erased on the next scheduler run; `erasure_log` row exists; subsequent re-run is a no-op.

## Phase 1g -- Amendment via Composition.relatesTo (0.5 dev-week)

- [ ] Implement the supersession consumer for `consultation.finalized` events with `supersedes_consultation_id` set per [02-scenarios.md §6](./02-scenarios.md#scenario-6----amendment-doctor-corrects-a-finalised-consultation): create new bundle + new care_context (supersedes_id = prior), set prior's status='superseded', update timeline_index.
- [ ] FHIR `Composition.relatesTo` of type `replaces` is built by the OPD serialiser using `@hims/ts-sdk-fhir`'s helpers.
- [ ] Acceptance: amending a finalised consultation produces a new bundle in the vault, both bundles persist, timeline shows latest with "amended N times" badge.

## Cross-cutting

- [ ] **Frontend timeline UI** (Phase 1, Web service) -- consumes `GET /api/v1/timeline`. Initial v1 is a list view; Phase 4 EMR product builds richer specialty timelines on top.
- [ ] **Integrity monitoring** -- weekly job that re-hashes a sample of bundle_storage rows and compares to record_bundle_manifests.bundle_hash. Alert on mismatch.
- [ ] **Observability** -- panels for: bundle storage volume by tenant, validation failure rate (internal vs external), erasure scheduler lag, timeline-index drift detection (counts vs source-truth replay).

## Definition of done (Phase 1)

- A patient walking in for an OPD consultation has their finalised visit composed into an OpConsultRecord Bundle, validated against NRCeS, stored byte-exactly, and retrievable months later byte-identical.
- An external HIU's M3 request returns the byte-exact stored bundle to ABDM for transmission.
- A doctor's timeline shows internal + external records interleaved, with origin labels.
- A consent-expiry event causes the relevant external bundles to be erased on the next scheduler run, with `erasure_log` evidence retained.
- Amendments produce new bundles with `Composition.relatesTo` linkage; both versions are retained.
