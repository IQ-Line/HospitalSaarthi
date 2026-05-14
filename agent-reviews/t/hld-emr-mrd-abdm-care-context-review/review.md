# Review: EMR, MRD, ABDM Care Contexts, And Production Parity

**Date:** 2026-05-04
**Audience:** Claude Code / architecture planning follow-up
**Scope:** HLD docs, `AIIMS_EOI.md`, `analysis/01-rework-vs-rebuild.md`, `analysis/02-module-build-order.md`, previous EMPI/EMR/MRD review, and current public ABDM/FHIR reference material.

---

## Short Verdict

The earlier boundary still holds: **EMR and MRD should not be inside EMPI**. But ABDM M2/M3 and care-context management change the build-order implication.

The architecture should not treat EMR as only a late Phase 4 "nice unified view." To reach parity with the existing production HIMS, the new platform needs an early **Record Foundation / EMR Foundation** capability that can:

1. Register and track ABDM care contexts.
2. Map care contexts to their source records across OPD, Lab, Pharmacy, IPD, Radiology, documents, and legacy systems.
3. Assemble NRCeS/ABDM-compatible FHIR document bundles when consented health information is requested.
4. Receive, decrypt, store/index, and display external FHIR bundles when acting as HIU.
5. Provide the minimal longitudinal record surface needed for doctors, ABDM flows, patient portal access, and later full EMR.

That does **not** mean building the full EMR module first. It means separating:

- **EMR Foundation:** care-context registry, FHIR bundle assembly, health-record index, document metadata, consent handoff, minimal timeline APIs.
- **Full EMR Product:** rich longitudinal UI, templates, clinical dashboards, AI summaries, specialty-specific record workflows.
- **MRD:** standalone medical records department workflow, still separate.

This lets the platform preserve clean module boundaries while still matching production HIMS's ABDM compliance posture.

---

## Why ABDM Care Contexts Change The EMR Discussion

ABDM care contexts are not "just integration records." They are the discoverable health-record units that a patient can link to their ABHA and that a HIP later uses to serve consented health information.

A care context usually represents something clinically meaningful and user-recognizable:

- OPD visit.
- IPD admission.
- Lab report.
- Radiology report/study.
- Prescription.
- Discharge summary.
- Scanned or uploaded health document.

Public ABDM sandbox explanations describe a care context as having a **reference number** and **display name**, where the reference number is an internal pointer used by the HRP/HIP to identify the underlying health record. NRCeS ABDM FHIR profiles also make the actual exchange unit a FHIR document bundle, typically headed by `Composition` and containing resources such as `Patient`, `Encounter`, `Observation`, `DiagnosticReport`, `MedicationRequest`, `DocumentReference`, and others.

Therefore, care contexts sit at the intersection of:

- EMPI patient identity and ABHA linking.
- Operational clinical source records.
- Clinical documents and FHIR bundle assembly.
- Consent and privacy enforcement.
- ABDM HIP/HIU integration.
- The doctor's longitudinal record view.

If the platform does not name an owner for this intersection, it will drift into the Integration Hub or be duplicated across every clinical module.

---

## Production Parity Implication

`analysis/02-module-build-order.md` says production HIMS parity includes:

- Patient registration with dedup, ABHA linking, and UHID generation.
- OPD visits, vitals, chief complaints, prescriptions, medical history, care plan.
- Lab report upload from external LIMS with ABDM linking and result display.
- ABDM/ABHA M1, M2 linking/consent, FHIR bundle generation, and care-context management.

`analysis/01-rework-vs-rebuild.md` says the production ABDM service's domain knowledge is valuable but its service architecture should be rebuilt under the Integration Hub architecture. That is correct, but incomplete if read too narrowly.

The new platform needs to port not just ABDM endpoint choreography, but also the **record model behind the choreography**:

- What source record becomes a care context?
- How does the care-context reference resolve back to OPD/Lab/Pharmacy/IPD/source document?
- How are source IDs from legacy systems preserved?
- Which module can assemble a FHIR `DocumentBundle` for a care context?
- How does the doctor see internally produced records and externally fetched records together?

Those questions are EMR-foundation questions, not EMPI-only questions and not Integration-Hub-only questions.

---

## Recommended Early Architecture

### 1. EMPI remains identity-only

EMPI should own:

- `patient_id`.
- ABHA number / ABHA address linkage.
- UHID/MRN/legacy identifier cross-references.
- Deduplication and merge/split provenance.
- FHIR `Patient`.

EMPI should not own:

- Care-context lifecycle.
- Clinical record source data.
- FHIR document bundle assembly.
- External FHIR bundles fetched via M3/HIU.
- MRD workflows.

EMPI is necessary for ABDM because it links ABHA to the platform patient identity. But care contexts are about **records for a patient**, not the patient identity itself.

### 2. Add an early `Record Foundation` / `EMR Foundation`

This can be implemented as an early slice of the eventual EMR module, not necessarily a polished UI module.

It should own:

- **Care Context Registry**
  - `care_context_id`.
  - `patient_id`.
  - `abha_address` or ABHA linkage reference, where applicable.
  - `source_module` / source system.
  - `source_record_type` such as `opd_visit`, `lab_report`, `prescription`, `discharge_summary`, `document`.
  - `source_record_id`.
  - `display`.
  - `date_range`.
  - ABDM linking status, linked timestamp, linking method, ABDM reference identifiers.
  - version/status: created, linked, superseded, merged, revoked, archived.

- **FHIR Assembly Registry**
  - Which source module is responsible for producing which FHIR resources.
  - Which converter/version produced the bundle.
  - Validation status against ABDM/NRCeS profiles.
  - Bundle provenance and audit trace.

- **Health Record Index**
  - Minimal longitudinal read model for patient timeline and ABDM discovery.
  - Not the source of truth for clinical facts.
  - Rebuildable from clinical events plus legacy ingestion events.

- **External Record Inbox**
  - Metadata and storage references for records fetched as HIU through M3.
  - Normalized display index for doctor view.
  - Original encrypted/decrypted payload audit metadata as required by policy.

It should expose:

- `GET /patients/{patient_id}/timeline`.
- `GET /patients/{patient_id}/care-contexts`.
- `POST /care-contexts` or event-driven care-context registration from modules.
- `GET /care-contexts/{id}/fhir-bundle`.
- APIs used by ABDM Integration to discover/link/fetch records.

### 3. Integration Hub owns ABDM transport and protocol choreography

Integration Hub / ABDM Integration should own:

- ABDM bridge endpoints and callback handling.
- Gateway sessions and credentials.
- Consent notification transport.
- Health information request/transfer transport.
- Fidelius encryption/decryption mechanics.
- Retry, idempotency, callback audit, and external exchange logs.

But it should call Record Foundation / EMR Foundation to answer:

- Which care contexts exist for this ABHA/patient/date range?
- Which internal records correspond to this care context?
- What FHIR bundle should be sent for this care context?
- Where should an incoming external FHIR bundle be indexed for the doctor view?

This prevents Integration Hub from becoming a clinical record service.

### 4. Operational modules remain source of truth

OPD owns OPD visits and prescriptions it authors. Lab owns lab reports. Pharmacy owns dispensation. IPD owns admissions and discharge workflows. Radiology owns reports/studies. A document repository or EMR document subdomain owns scanned documents and generated document artifacts if no source module naturally owns them.

Each clinical module should publish events rich enough for Record Foundation to create or update care contexts:

- `opd.visit.completed` or `consultation.completed`.
- `prescription.created`.
- `lab.report.finalized`.
- `radiology.report.finalized`.
- `ipd.discharge-summary.signed`.
- `clinical-document.created`.

The Record Foundation subscribes and maintains the care-context registry and timeline index.

---

## M2 And M3 Responsibilities

There is some naming variation in public commentary around ABDM milestones, but for architecture the responsibilities are stable:

### HIP-side responsibility: serve records when consented

The platform must:

1. Discover patient records/care contexts for an ABHA-linked patient.
2. Link care contexts to ABHA.
3. Receive consent or health-information requests.
4. Validate consent scope, date range, and purpose.
5. Fetch matching care contexts.
6. Assemble ABDM/NRCeS-conformant FHIR document bundles.
7. Encrypt and push them to the requested endpoint.

Architectural owner split:

- EMPI: patient/ABHA identity.
- Record Foundation / EMR Foundation: care-context registry and bundle assembly.
- Operational modules: source clinical data and FHIR resource mappings.
- Integration Hub: ABDM transport, gateway, encryption, callbacks.
- Consent/Privacy service or ABDM submodule: consent artifact lifecycle and enforcement state.

### HIU-side responsibility: request and display external records

The platform must:

1. Let a doctor or patient initiate an ABDM consent request.
2. Track request status and patient approval.
3. Receive encrypted FHIR data from external HIPs.
4. Decrypt, validate, and parse FHIR bundles.
5. Present the records in a clinically usable view.

This is where EMR becomes very relevant. External health records should not be injected into every source module. A unified EMR/record viewer is the right place to show:

- Internal OPD/Lab/Pharmacy/IPD records.
- Legacy retrieved records.
- External ABDM HIU-fetched records.

For production parity, this viewer can initially be minimal. It does not need every AIIMS EMR feature, but it must make received records accessible and auditable.

---

## Suggested Revised Build Order

The current `analysis/02-module-build-order.md` makes Phase 1 "OPD + Billing Core + ABDM" but places "EMR (Unified View)" in Phase 4. That should be refined.

### Phase 0: Platform Foundation

Keep:

- User Management.
- Configurator.
- EMPI.
- Master & Tenant Data.
- Event bus.
- Module SDK.

Add to exit criteria:

- EMPI can link ABHA and store identity cross-references.
- Event conventions include `patient_id`, `encounter_id`, `source_module`, source record ID, document type, and sensitivity labels where relevant.
- Record Foundation data model is agreed even if not fully built.

### Phase 1: Production Parity Slice

Build:

- OPD core.
- Thin Billing if needed for parity.
- ABDM Integration transport.
- **Record Foundation / EMR Foundation v1.**

Record Foundation v1 should include:

- Care-context registry.
- Minimal timeline/read index.
- FHIR bundle assembly hooks for OPD consultation, prescription, lab report upload, and basic document records.
- M2/M3 storage/indexing surfaces needed by ABDM.
- Minimal doctor/patient view for linked/fetched records.

This is the key recommendation: **do not wait until Phase 4 for all EMR-related work. Defer full EMR, not EMR foundation.**

### Phase 1.5 / 2: Expand Sources

As Lab, Pharmacy, IPD, Emergency, and Radiology become platform-native, each becomes a care-context producer and FHIR resource producer.

Record Foundation should not need major redesign. It should simply onboard new source record types and FHIR mappers.

### Phase 4: Full EMR Product

The Phase 4 "EMR (Unified View)" can still exist, but it becomes:

- Rich longitudinal timeline UX.
- Specialty dashboards.
- Advanced clinical note templates.
- AI summaries.
- Deep MRD integration.
- Advanced document workflows.

This is now a product expansion on top of the Record Foundation, not the first time the architecture gets a longitudinal record.

---

## Deliberations For Claude Code

### 1. Is `Record Foundation` part of EMR or its own service?

Recommended default: implement it as the early slice of EMR, with a narrow internal name such as `clinical-record` or `record-foundation`.

Why:

- It avoids creating a vague platform service that owns too much.
- It makes future full EMR a natural extension.
- It gives ABDM a clear clinical-record collaborator.

Counterargument:

- If the team wants EMR to mean only user-facing product UI, a separate `Health Record Service` may be cleaner.

Decision needed:

- Pick one name and make ownership explicit in an ADR.

### 2. Should care contexts be registered by source modules or derived centrally?

Recommended default: source modules publish clinically meaningful events; Record Foundation derives/registers care contexts.

Why:

- Source modules should not know ABDM transport details.
- Record Foundation can enforce consistent display names, status, linking, and provenance.
- It works for legacy ingestion through Integration Hub as another event source.

Counterargument:

- Some source modules may need explicit control over when a record is linkable, for example unsigned discharge summaries.

Mitigation:

- Events should carry a `record_status` such as draft, finalized, signed, amended, cancelled.
- Record Foundation only exposes/linkable care contexts when status and policy allow.

### 3. Who assembles FHIR bundles?

Recommended default: source modules own domain-to-FHIR mapping for their own resources; Record Foundation orchestrates document bundle assembly.

Why:

- OPD understands OPD notes and prescriptions.
- Lab understands DiagnosticReport/Observation.
- Record Foundation understands which resources belong together for a care context and which ABDM document type is being served.

Avoid:

- Integration Hub doing all clinical FHIR conversion.
- EMPI doing any FHIR document assembly beyond `Patient`.

### 4. What is the minimum EMR needed for product parity?

Minimum:

- Timeline list grouped by encounter/care context.
- Ability to open OPD note/prescription/lab report uploaded from production-equivalent flows.
- ABDM care-context linking and M2/M3 visibility.
- FHIR bundle generation and validation.
- Audit of access/download/share.

Not minimum:

- Full inpatient longitudinal chart.
- Specialty templates for every department.
- AI-generated summaries.
- MRD deficiency workflow.
- Full document management platform.

### 5. How should external M3 records be stored?

Recommended default:

- Store immutable original received bundle/object with provenance and consent metadata.
- Parse and index a normalized summary for timeline display.
- Do not merge external clinical facts into source modules as if authored locally.
- Clearly label external records by source HIP, date, consent, and received timestamp.

This preserves medico-legal provenance and avoids corrupting operational module data.

---

## Concrete Additions To Architecture Docs

Add an ADR: **Record Foundation / EMR Foundation For ABDM And Longitudinal Record**.

It should decide:

- Whether the service is named `EMR Foundation`, `Clinical Record`, or `Health Record Service`.
- Care-context data model and ownership.
- Relationship to EMPI, Integration Hub, operational modules, and future full EMR.
- FHIR bundle assembly responsibilities.
- External record storage/indexing responsibilities.
- Minimal Phase 1 parity scope.

Update `analysis/02-module-build-order.md`:

- Keep "EMR (Unified View)" as later full product if desired.
- Add "Record Foundation / EMR Foundation v1" to Phase 1.
- Make care-context management part of parity, not Phase 4.

Update `hld/05-integration-and-interop.md`:

- Integration Hub owns ABDM protocol and transport.
- Record Foundation owns care-context lookup and FHIR bundle assembly orchestration.
- EMPI owns ABHA-to-patient identity linkage.

Update `hld/02-core-modules.md`:

- EMPI owns ABHA identifiers and patient matching.
- EMPI does not own care contexts, FHIR document bundles, external fetched records, or EMR/MRD workflows.

Update scenarios:

- Patient scan-and-share creates/updates ABHA linkage and stores linking token.
- OPD consultation completion creates a care context.
- Lab report upload creates a care context.
- ABDM discovery returns care contexts from OPD + Lab + legacy.
- ABDM health information request assembles and sends FHIR bundles.
- External records fetched via HIU appear in the EMR Foundation timeline without becoming local source-module records.

---

## Suggested Data Model Sketch

This is conceptual, not a schema commitment:

```text
care_contexts
  iq_tenant_id
  care_context_id
  patient_id
  abha_linkage_id
  source_system_type       -- platform_module | legacy_system | external_abdm
  source_system_id         -- opd | lab | ris | legacy_his_x | external_hip_id
  source_record_type       -- opd_visit | lab_report | prescription | discharge_summary | document
  source_record_id
  encounter_id
  display
  period_start
  period_end
  status                  -- draft | final | linked | superseded | cancelled | archived
  sensitivity_labels
  abdm_reference_number
  linked_at
  created_at
  updated_at

record_bundle_manifests
  iq_tenant_id
  bundle_manifest_id
  care_context_id
  bundle_type             -- OPConsultNote | Prescription | DiagnosticReport | DischargeSummary | HealthDocumentRecord
  fhir_profile_version
  producer_module
  validation_status
  last_generated_at
  provenance

external_health_records
  iq_tenant_id
  external_record_id
  patient_id
  source_hip_id
  consent_id
  received_at
  bundle_storage_ref
  parsed_summary
  display_status
```

The important part is not the exact table names. The important part is that the platform has a durable index connecting ABDM care contexts to source records and FHIR bundle manifests.

---

## Final Position

For EMR planning, the best framing is:

> EMPI is the patient identity anchor.
> Record Foundation is the ABDM/longitudinal-record anchor.
> Full EMR is the richer clinical product built on top.
> MRD is a standalone governance/workflow module.
> Integration Hub is the protocol bridge, not the clinical record owner.

This framing gives the team a practical path to production HIMS parity without corrupting the long-term modular architecture. It also explains why the current build-order doc feels under-concrete: it correctly identifies ABDM as Phase 1, but it does not yet name the record/care-context substrate ABDM needs in order to be real.
