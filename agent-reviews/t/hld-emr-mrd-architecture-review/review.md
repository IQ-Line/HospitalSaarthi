# Review: HLD Boundaries For EMPI, EMR, And MRD

**Date:** 2026-05-03
**Scope:** `docs/architecture/hld`, relevant ADRs, problem statement docs, build-order analysis, and `AIIMS_EOI.md`
**Question reviewed:** Where do EMR and MRD belong, and are they part of the EMPI core module?

---

## Short Verdict

EMR and MRD should **not** be folded into the EMPI core module.

The current EMPI direction is mostly right: EMPI is the identity authority for the subject of care. It should own patient demographics, identifiers, duplicate detection, merge/link provenance, ABHA/MRN cross-references, and FHIR `Patient`. That is already a large, safety-critical domain.

EMR and MRD sit downstream of EMPI:

- **EMR / longitudinal clinical record** should be an Operational Plane clinical record capability anchored on EMPI `patient_id`, composed from events and FHIR resources produced by OPD, IPD, Emergency, Lab, Radiology, Pharmacy, OT, ICU, and legacy integrations.
- **MRD / Medical Record Department** should be a standalone administrative-clinical workflow module. The AIIMS EOI explicitly says MRD management should be standalone. It should own record completion tracking, deficiency management, coding workflows, record retrieval/release, archival/legal-hold workflows, and MRD sign-off during migration.
- A separate **Clinical Document / Record Repository** decision is missing. The architecture needs to decide whether EMR itself owns clinical documents such as discharge summaries, operative notes, scanned documents, consents, and FHIR `Composition`/`DocumentReference`, or whether this is a shared document service used by EMR and MRD.

The main risk is not that EMPI was incorrectly added. The main risk is that the docs currently treat "EMR", "longitudinal patient timeline", "clinical documents", "ABDM record bundle generation", "patient portal record access", and "MRD documents" as if they will naturally emerge from module events. They will not. They need an explicit ownership model.

---

## Recommended Boundary

### EMPI / Patient Identity

EMPI should own only identity and identity-adjacent data:

- Tenant-scoped canonical patient record.
- Patient demographics and stable identifiers.
- ABHA, UHID/MRN, legacy MRN, insurance ID, government ID cross-references.
- Deduplication, match confidence, merge/split/link workflows and provenance.
- FHIR `Patient` endpoint.
- Possibly consent linkage IDs, but not the full consent lifecycle unless a separate ADR makes that explicit.

EMPI should not own:

- Clinical notes, diagnoses, medications, allergies, immunizations, procedures, orders, results, discharge summaries, scanned documents, medico-legal records, or MRD workflows.
- The longitudinal EMR timeline itself.
- MRD coding, completion, retrieval, archival, or release-of-information workflows.

Reason: once EMPI owns clinical records, every patient-facing module becomes dependent on a single clinical data store. That would violate the current per-module ownership model and turn EMPI from an identity service into a clinical monolith.

### EMR / Longitudinal Clinical Record

The docs should split the overloaded EMR concept into at least two concerns:

1. **Clinical record composition / timeline:** a patient-facing and clinician-facing longitudinal view over records owned by other modules and legacy systems.
2. **Clinical documentation and document repository:** the source of truth for documents that are not naturally owned by a single workflow module, or the shared storage substrate for documents authored by OPD/IPD/OT/ICU.

The EMR module should be anchored on `patient_id` from EMPI, but it should not be inside EMPI. It should consume:

- `patient.created`, `patient.updated`, `patient.merged` from EMPI.
- Encounter, diagnosis, prescription, order, result, procedure, discharge, and document events from operational modules.
- FHIR/HL7/DICOM-derived records from the Integration Hub for legacy and third-party systems.

It should expose:

- Longitudinal timeline APIs for the unified clinical workstation and doctor portal.
- FHIR bundle aggregation for ABDM health information exchange.
- FHIR `Composition`, `DocumentReference`, and related clinical record endpoints if it owns document composition.
- A patient-context launch target for UI navigation.

### MRD / Medical Record Department

MRD should be standalone, as the EOI says. It is not a patient identity service and not just an EMR screen.

It should own:

- Record completion and deficiency tracking.
- Discharge summary completion status.
- Coding workflows for ICD/procedure assignment, unless this is intentionally owned by Billing/Revenue Cycle with MRD as reviewer.
- Medical record retrieval for legal, audit, insurance, quality, and patient requests.
- Archival, retention, legal hold, and release-of-information workflows.
- MRD migration validation and sign-off queues for high-risk clinical data.

It should consume:

- Patient identity from EMPI.
- Clinical document metadata from EMR/document repository.
- Encounters and discharge events from OPD/IPD/Emergency/OT/ICU.
- Audit and access logs from the platform audit stream.

MRD needs strong Cerbos policies because it often requires broad record access for non-treatment purposes. That access is legitimate but privacy-sensitive.

---

## Findings

### 1. EMR is listed as Wave 1 in the HLD/EOI, but Phase 4 in build order

`hld/01-system-overview.md` says Wave 1 includes Registration/ADT, EMR, OPD, IPD, and Emergency. `AIIMS_EOI.md` also places EMR in Wave 1. But `analysis/02-module-build-order.md` puts "EMR (Unified View)" in Phase 4.

That is a material mismatch. If the architecture is presented for AIIMS alignment, EMR cannot be described as late-phase unless the team explicitly says "Phase 1 includes enough EMR for clinical continuity and ABDM; Phase 4 is the richer unified view."

Recommendation:

- Split EMR delivery into **EMR foundation** and **EMR full unified view**.
- Build EMR foundation early: patient timeline shell, clinical document metadata, FHIR bundle assembly path, ABDM record collection, and MRD hooks.
- Defer richer UX, AI summaries, specialty dashboards, and advanced timeline refinements to later phases.

### 2. The architecture lacks a clear owner for the longitudinal record

The problem docs and EOI repeatedly require a longitudinal patient record spanning OPD, IPD, Emergency, ICU, OT, diagnostics, pharmacy, MRD documents, migrated modules, and non-migrated legacy systems. The HLD explains events, FHIR boundaries, and Integration Hub, but it does not name the module that owns the assembled longitudinal view.

This is too important to leave implicit. ABDM health record requests need the platform to collect relevant records, format FHIR bundles, enforce consent, and audit the exchange. Without a record-composition owner, that orchestration can drift into the Integration Hub, BFF, patient portal, or every clinical module.

Recommendation:

- Create an ADR for **Clinical Record / EMR ownership**.
- Define whether EMR owns the longitudinal read model or whether the BFF aggregates it on demand.
- For AIIMS scale and ABDM, prefer an EMR-owned read model fed by events and Integration Hub, with BFF using EMR APIs for timeline views.

### 3. Clinical document ownership is unresolved

The EOI calls out clinical documents: OPD notes, discharge summaries, operative notes, consents, scanned documents, MRD documents. HLD 05 lists FHIR `Composition` for discharge summaries and clinical documents, but no module owns `Composition`, `DocumentReference`, binary storage, document versioning, signatures, retention, or correction/addendum rules.

This gap will become painful quickly because clinical documents have different lifecycle rules from operational rows:

- They may need clinician signature and countersignature.
- They require addenda rather than destructive edits.
- They may need legal retention and release-of-information controls.
- They may exist as scanned PDFs from legacy paper files.
- They are central to ABDM sharing and MRD workflows.

Recommendation:

- Add a **Clinical Document Repository** decision.
- Either make it a subdomain of EMR or a shared platform-adjacent document service used by EMR, MRD, OPD, IPD, OT, ICU, and legacy ingestion.
- Do not put document binaries or clinical document lifecycle in EMPI.

### 4. MRD is under-modeled despite explicit stakeholder and EOI requirements

The problem statement identifies MRD staff and their needs: record completion tracking, ICD/procedure coding, record retrieval, statistics, and reporting. The AIIMS EOI explicitly says "Medical Record Department (MRD) Management: Should be a standalone module." The current HLD does not turn that into a module boundary, event contract, or build phase.

Recommendation:

- Add MRD to the module grouping/build-order docs.
- Treat it as a workflow module that depends on EMPI + EMR/document repository + clinical modules.
- Define MRD events such as `record.deficiency.opened`, `record.deficiency.resolved`, `clinical-document.coded`, `record.release-approved`, and `record.archived`.

### 5. EMPI's tenant-scoped model may be too strict for hospital chains and AIIMS campuses

HLD 02 says each tenant has its own isolated patient index and a patient registered under Tenant A is invisible to Tenant B. But the scenarios say that if a patient has also been registered at another facility in the same hospital chain, records must be linkable.

Both requirements are valid: tenant isolation must remain default, and same-person linkage across facilities must be possible under policy and consent. The current docs need a model that distinguishes:

- A tenant-scoped patient record or facility MRN.
- A higher-level person identity / identity graph link.
- Cross-tenant visibility and clinical data access.

Recommendation:

- Keep clinical data tenant-scoped.
- Let EMPI support optional organization-scoped or consent-scoped identity linkage, without automatically granting access to the other tenant's clinical records.
- Add explicit Cerbos and consent rules for cross-facility record discovery and access.

### 6. Consent ownership is split across EMPI, Integration Hub, and modules

HLD 02 says EMPI knows consent linkages and modules enforce consent. HLD 05 says consent artifacts are stored with scope and linked to EMPI, while the Outbound Connector checks consent before sharing data. The problem statement says ABDM requests require collecting relevant records and verifying consent.

This is an ownership ambiguity. Consent is not merely an EMPI attribute; it has lifecycle, revocation, scope, audit, purpose limitation, and ABDM choreography.

Recommendation:

- Add an ADR for **Consent and Privacy Operations ownership**.
- EMPI can link patient identity to consent artifact identifiers.
- A Consent/Privacy service or ABDM Integration submodule should own consent artifact lifecycle and revocation state.
- EMR/record composition and Outbound Connector should enforce consent before assembling or releasing records.

### 7. Master Data vs User Management ownership of departments is inconsistent in the HLD

HLD 01 says permission data including department hierarchies is stored by User Management. HLD 02 says Department and Ward master is owned by Master & Tenant Data. The User Management LLD resolves this by using `department_projection` synced from Master Data, which is the better boundary.

Recommendation:

- Update HLD 01 and HLD 02 User Management text so User Management owns assignments to departments, not the department hierarchy itself.
- Master & Tenant Data owns department/ward/location reference structures.
- User Management stores projections needed for role assignment and principal construction.

### 8. EMR should not become a bypass around module data ownership

A natural temptation is to make EMR the "real chart database" that everything writes into. That would simplify some screens but undermine the per-module ownership invariant.

Recommendation:

- Preserve operational ownership: OPD owns OPD visits, IPD owns admissions, Pharmacy owns dispensation, Lab owns results, Radiology owns imaging reports, etc.
- EMR owns the longitudinal composition/read model and document lifecycle where explicitly assigned.
- If EMR stores projections of module data, those projections are rebuildable from events and not the operational source of truth.

### 9. Unknown/emergency patient support needs explicit EMPI + EMR behavior

The build-order doc mentions Emergency depends on EMPI with "unknown patient" support. The scenarios mention emergency registration with minimal data and post-hoc completion. This needs to be made explicit because it is a critical hospital workflow.

Recommendation:

- EMPI must support temporary/unknown patient identities, later merge/link, and audit of identity changes.
- EMR must support clinical documentation against a temporary patient identity and later re-association after EMPI merge.
- MRD should have a deficiency/completion workflow for emergency records that started incomplete.

---

## Proposed Architecture Shape

The safest shape is:

```text
EMPI / Patient Identity
  Owns: who the patient is, identifiers, dedup, merge/link, FHIR Patient
  Does not own: clinical facts or medical record workflows

Operational clinical modules
  Own: encounters, orders, results, prescriptions, procedures, administrations
  Publish: clinically meaningful events with patient_id and encounter_id

EMR / Clinical Record
  Owns: longitudinal timeline/read model, clinical document composition where assigned,
        FHIR record aggregation for clinical workstation, portal, ABDM, and MRD

Clinical Document Repository
  Owns: document metadata, versions, signatures, addenda, scanned documents,
        binary/object storage references, retention metadata
  Placement: either inside EMR or a separate shared service; needs an ADR

MRD
  Owns: completion, coding, retrieval, archival, release, legal/quality workflows
  Consumes: EMPI identity, EMR timeline/documents, module events, audit stream

Integration Hub
  Owns: protocol translation and external connectivity
  Does not own: the clinical record, except for integration logs and transient payload handling
```

This preserves the strong idea in the current HLD: EMPI is core because patient identity is on the critical path. It also avoids overloading EMPI with medical record storage and governance.

---

## Concrete Doc Changes Recommended

1. Add ADR: **EMR / Longitudinal Clinical Record Ownership**.
2. Add ADR: **Clinical Document Repository and FHIR Composition Ownership**.
3. Add ADR or HLD section: **MRD Standalone Module Boundary**.
4. Update `analysis/02-module-build-order.md` so EMR foundation is not Phase 4-only.
5. Update `hld/02-core-modules.md` to explicitly state "EMPI does not own EMR/MRD clinical record data."
6. Update `hld/05-integration-and-interop.md` to identify who assembles FHIR bundles for ABDM record requests.
7. Update `hld/01-system-overview.md` and User Management text to align department hierarchy ownership with the LLD projection model.
8. Add scenarios for:
   - ABDM health record request assembled from native modules plus legacy systems.
   - MRD deficiency tracking after discharge.
   - Scanned legacy document ingestion and release.
   - Unknown emergency patient later merged with an existing EMPI record.
   - Cross-facility patient identity linkage within an organization without automatic clinical data leakage.

---

## Final Position

Your suspicion was useful because EMR/MRD absolutely depend on EMPI and must be anchored by EMPI `patient_id`. But they should not be inside the EMPI core module.

The correct mental model is:

> EMPI answers "who is this patient?"
> EMR answers "what clinical record do we have for this patient?"
> MRD answers "is the medical record complete, coded, retrievable, retained, and legally/governance-ready?"

Those are three different ownership domains. If they are collapsed, the architecture will likely drift toward a clinical monolith hiding under the EMPI name.
