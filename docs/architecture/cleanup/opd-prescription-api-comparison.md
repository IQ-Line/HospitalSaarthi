# OPD Prescription API — Two Families, One Table: Comparison & Recommendation

Status: decision proposal (for product/tech lead sign-off)
Date: 2026-06-23
Scope: `modules/opd` prescription/encounter API surface

## 1. The problem

`modules/opd` currently ships **two overlapping prescription API families that both write the same physical `opd.prescriptions` row**, kept from colliding only by two separate SQLAlchemy `MetaData` objects:

- **REST `/prescriptions` (normalized).** ORM class `PrescriptionModel` on `Base`. Root row + ~16 typed child tables. CRUD + explicit `draft/final/cancelled` FSM with an append-only `status_history` audit table. Mounted via `prescription_router`.
- **JSONB `/visits` & `/patients` (legacy/phase-0).** ORM class `Prescription` on `LegacyBase`. The entire Create-RX clinical form stored as one `form_data` JSONB blob keyed 1:1 to a visit, plus nurse pre-consult, the OPD patients queue, and the **end-of-consultation → FHIR/Record-Foundation/ABDM-M2 trigger**. Mounted via `prescriptions_router`.

Both ORM classes map `__tablename__="prescriptions"`; two Alembic lineages (`0001…0004` legacy + `001/002/003` normalized, reconciled by `003_merge_opd_prescription_heads`) layer `form_data` JSONB **and** the normalized children onto the *same* table. The frontend is split-brained: `services/web/src/features/create-rx/api/opd-prescription.ts` routes **visit-scoped** flows to the JSONB family and **patient-scoped** flows to the normalized family, switched at runtime by `isPatientScopedOpdRoute`. Net effect: there are two same-named `PrescriptionRepository` classes and two write paths over one table, and an integrator cannot tell which is canonical. This doc compares them and recommends one.

## 2. Side-by-side comparison

| Dimension | REST `/prescriptions` (normalized, `PrescriptionModel`/`Base`) | JSONB `/visits` & `/patients` (legacy, `Prescription`/`LegacyBase`) |
|---|---|---|
| **Coverage** | Full normalized OPD prescription aggregate: root identity + status + ~16 typed child tables (vitals, complaints, diagnoses, meds, orders, imaging, vaccines, procedures, care plan, etc.). CRUD + lifecycle + 2 batch read endpoints. | Whole Create-RX clinical form as one JSONB blob per visit. Adds nurse pre-consult (vitals), patients queue (`GET /patients`), deprecated `GET /visits`, and visit-/patient-scoped end-of-consult. |
| **Lifecycle** | Explicit 3-state FSM (`draft → final` / `draft → cancelled`), guarded transitions (finalize draft-only, cancel rejects FINAL), draft-only update with full child replace, soft-delete frees the unique visit slot. **Append-only `status_history` audit table** on every transition. | Same status enum but **no status-history/audit** (only stamps `finalized_at`); **cancellation is unreachable** — no code path sets it. Adds visit-status FSM (`registered → in_progress → pre_consulted → completed`) and derived/downgraded UI status. Read-only guard once final/completed. |
| **Data model** | Fully normalized & queryable: composite tenant FKs + CASCADE, per-`(tenant,rx)` `line_no` uniqueness, Decimal numerics, partial unique index for soft-delete reuse. **Reportable/aggregatable** — the JSONB blob is not. | JSONB-primary with a **partial raw-SQL projection**: writes only `legacy_vitals` + `vaccines_required` to child tables, but reads back five. Complaints/meds/diagnosis written here live **only in JSON** → silent divergence. Trivially round-trips the React form (no shape impedance). |
| **Tenant handling** | **Trust gap.** `tenant_id` from request **body** (create) / **query param** (everything else); **no header, no auth principal, no cross-check** — the `require_tenant_id`/`resolve_doctor_id` helpers exist but are unused here. Any caller can target any tenant. Data-layer WHERE-filtering + PK distribution is correct (isolation proven), but the **edge trust boundary is missing**. | **Header-driven** (`iq_tenant_id`/`x-tenant-id`, 400 if absent) and forwarded to downstream services. Closer to the platform standard. Caveat: `doctor_id` falls back to the **nil-UUID `SYSTEM_DOCTOR_ID`** when the gateway omits `x-user-id` → non-attributable prescriptions. |
| **FHIR/ABDM wiring** | Triggers it **indirectly**: `finalize` enqueues `trigger_m2_after_end_consultation`, but the bundle **content is sourced through the JSONB family's `effective_form_data` merge** (raw-SQL re-read of child tables → form_data → FHIR). Does not feed FHIR from its own normalized payload directly. | **The canonical FHIR/ABDM-M2 source.** Both end routes enqueue the pipeline; builds multi-HI-Type NRCES bundles (OP Consult, Prescription, Immunization, Health Document) with content gates, POSTs care-contexts + bundles to Record Foundation, then the integration hub. Fail-soft, flag-gated. This is where the integration USP actually lives. |
| **Test coverage** | Solid lifecycle/repo coverage with **real (SQLite) DB** assertions: status-history seeding, duplicate-409, cross-tenant isolation, soft-delete-recreate, draft-only guards, full HTTP flow via TestClient. Gaps: most of the 15-table clinical breadth never round-trips in a test; ABDM trigger not asserted here; **no negative test for the tenant-trust gap.** | Moderate, **mixed real/mocked**. 9 real TestClient tests (end-consult persists, queue, pre-consult, bootstrap). But form_data/merge tests **mock the Session** (raw-SQL child INSERTs never run on a real DB), and the ABDM trigger is tested **only with everything mocked** (session, urlopen, persist fns) — Record-Foundation contracts unverified. Fixture pollution risk (`table.schema=None` global mutation). |
| **Consumers** | FE create-rx: create/draft-save/detail-read + patient list + encounter overlay (`by-visits`) + historical records. BE: clinical-documents (PDF) + pharmacy notify. **`/finalize` is a secondary/legacy path** — only hit in the patient-scoped fallback (`visitId===patientId`). | FE: create-rx visit-scoped save/end, nurse pre-consult (JSONB-only endpoint), patients queue. **The standard "End consultation" UI path goes here.** BE: bundle helpers, registration visit repo, pharmacy notify, abdm_m2. |
| **Code health** | Internally clean & idiomatic: typed ORM, well-factored repo (root vs detail query split), thin service, clear FSM with audit, sensible CASCADE/unique modeling. Problems are at the **seams** (shared table, bridge hackery it depends on, tenant gap). | Works and is well-instrumented (heavy `[ABDM-M2]` tracing, idempotent bootstrap). But **structural debt is the core liability**: dual ORM mapping, write/read child-sync asymmetry, ~690-line raw-f-string-SQL data-access file, bespoke `__hims_immunization_v1:` encoding, broad silent except-swallowing, ~1050-line urllib+print `abdm_m2.py`, visit-vs-patient method duplication. |

## 3. Pros / cons per family

### REST `/prescriptions` (normalized)

**Pros**
- Fully typed, normalized, **queryable/reportable** model — the right long-term shape for analytics, billing joins, and clinical reporting.
- Explicit, well-guarded lifecycle FSM **with a real append-only audit trail** (cancellation reasons included) — the JSONB family has none.
- Deliberate query design (root-only vs `selectinload` detail; lean batch overlays).
- Correct soft-delete + partial-unique-index semantics, proven by test.
- Real DB-backed tests for lifecycle, conflict, and cross-tenant isolation.

**Cons**
- **Tenant trust gap at the edge** (body/query `tenant_id`, no auth principal) — security-relevant, must be closed.
- Does **not** feed FHIR/ABDM from its own payload; depends on the JSONB merge layer to do so.
- Clinical breadth (15 tables) is under-tested end-to-end.
- In live UI it is the **secondary** path; the primary end-consult flow bypasses it.

### JSONB `/visits` & `/patients` (legacy)

**Pros**
- **Owns the FHIR/Record-Foundation/ABDM-M2 automation** — the platform's integration USP, multi-HI-Type, gated, fail-soft.
- Zero shape impedance with the React Create-RX form; nurse pre-consult + patients queue live here.
- **Header-driven tenant resolution** matching the platform standard, forwarded downstream.
- Robust idempotent bootstrap (works even when front-desk skipped the OPD row).

**Cons**
- JSONB blob is **not queryable/reportable**; write/read child-sync asymmetry causes **silent data divergence**.
- **No audit trail; cancellation unreachable.**
- Nil-UUID doctor fallback → non-attributable records/FHIR practitioners.
- Pervasive code-health debt: raw-SQL data access, bespoke encodings, **silent error swallowing** that masks schema drift, no real integration test for the ABDM path.
- `GET /visits` already deprecated.

## 4. Recommendation

**Keep the normalized REST `/prescriptions` family as the canonical data + lifecycle model. Demote the JSONB family to a thin, temporary edge/adapter whose *only* surviving responsibilities are (a) the FHIR/ABDM-M2 end-of-consult trigger and (b) the form-shaped read/write the React form needs — both re-pointed at the normalized tables — then retire the `form_data` JSONB column and the `LegacyBase` mapping.**

### Reasoning
- **Module cleanliness is the lead's priority, and the normalized model is the only one that is internally clean and reportable.** A typed, queryable, audited aggregate is the correct long-term *module shape*; a JSONB blob with a partial raw-SQL projection and silent error-swallowing is not something to build the next decade of OPD/clinical reporting on. The structural debt (dual ORM on one table, write/read asymmetry) lives almost entirely in the JSONB family.
- **The JSONB family's one irreplaceable asset is the ABDM-M2 wiring — but that wiring is integration glue, not a data model.** It already reconstructs bundle content by *re-reading the normalized child tables* through `effective_form_data`. Pointing it at the normalized repo directly (instead of the JSON→form_data→FHIR round-trip) **removes** code, it doesn't add it. The USP survives the consolidation; only the blob storage dies.
- **Picking JSONB-as-canonical would lock in the worse model.** It can't report/aggregate, has no audit, can't even express cancellation, and the standard end-consult path would forever depend on raw-SQL bridges. That is exactly the "incremental fixes to a fundamentally wrong approach" trap.

### What "migrate away from JSONB" entails
1. **Close the tenant trust gap on the normalized family first** (non-negotiable, do before promoting it): wire `require_tenant_id` + `resolve_doctor_id` (header/principal) into the `/prescriptions` routes; stop reading `tenant_id` from body/query; add the missing negative cross-tenant test.
2. **Re-point the FHIR/ABDM-M2 trigger to the normalized repo.** Move `trigger_m2_after_end_consultation` so it reads from `PrescriptionModel` (via the normalized mapper) instead of `effective_form_data`'s JSON+raw-SQL merge. Delete the `__hims_immunization_v1:` instructions-smuggling and the form_data round-trip converters once the child tables are the single source.
3. **Make the standard "End consultation" UI path call the normalized `/finalize`** (and a normalized pre-consult/nurse endpoint), retiring `POST /visits/{id}/prescription/end` and the `isPatientScopedOpdRoute` split-brain in `opd-prescription.ts`. The frontend posts the same form; only the endpoint shape changes.
4. **Preserve the genuinely-good JSONB-family behaviors in the normalized one**: idempotent registration bootstrap, the visit-status FSM (`registered → … → completed`) and derived UI status, nurse pre-consult, and the patients queue (`GET /patients`). These are features, not blob artifacts — port them.
5. **Backfill + drop**: one-shot migrate any production rows whose clinical content exists only in `form_data` into the child tables (this also surfaces the divergence the asymmetric sync created), then drop the `form_data` JSONB column, the `LegacyBase`/`Prescription` mapping, and collapse the two Alembic lineages.
6. **Replace the integration glue's worst smells while you're in there**: `urllib`+`print` → the project HTTP client + structured logging; remove blanket `except Exception` swallows that hide schema drift; drop the hardcoded `max.in` bundle-identifier URL.

### Risks
- **The ABDM-M2 pipeline has no real integration test** in either family (everything mocked). Re-pointing it is the highest-risk step — **add a real (or contract/recorded) end-to-end test against Record Foundation before and after the re-point**, or the USP can silently break.
- **`form_data`-only data loss**: rows written by the JSONB family never synced complaints/meds/diagnosis to child tables. The backfill must parse JSON, and any blob shape the normalized model can't represent must be caught *before* dropping the column.
- **Nurse pre-consult + patients queue are JSONB-family-only endpoints** — they must be reimplemented on the normalized side before those FE features can switch over (sequence the cutover so no feature is stranded).
- **Frontend cutover is user-visible** (end-consult is the busiest flow); stage it behind the existing ABDM feature flag pattern and ship FE/BE together.

## 5. Reversible-decision hedges

- **Keep both write paths live behind the existing feature flag during cutover** (`abdm_m2_enabled` / per-route): the JSONB end-consult route can stay mounted but deprecated until the normalized path is proven in staging, so rollback is "flip the FE endpoint back," not a redeploy.
- **Do the FHIR-trigger re-point (step 2) before any column drop.** Re-pointing the trigger is reversible (revert one module); dropping `form_data` is not — gate the drop on the real ABDM integration test passing.
- **Backfill, verify, *then* drop** as two separate migrations with a verification window between them, so the blob remains as a fallback read source until the normalized tables are confirmed complete in production.
- This consolidation is **module-internal and HTTP-shape-preserving** for cross-module callers — it does not pre-commit the eventual "few services, flexible module-per-service distribution" decision. A clean single-family OPD module is exactly what makes that later repackaging mechanical rather than entangled.

## 6. Execution log & deferred gates

- **Step 2 (re-point) — DONE.** `build_form_data_from_prescription_model` sources the ABDM-M2 bundles from the normalized `PrescriptionModel` aggregate; `_load_visit_clinical_snapshot` no longer reads `effective_form_data`. Pinned by `tests/test_abdm_m2_sourcing_equivalence.py` (real SQLite normalized seed → real loader → bundles, mutation-tested) on top of the `test_abdm_m2_wire_contract.py` persist anchor.
- **Deferred gate — `__hims_immunization_v1:` decoder deletion.** Step 2 above deliberately *keeps* the `_vaccine_db_to_immunization_row` smuggle-decoder rather than deleting it as step 4 §2 states, because `prescription_vaccines_required` has **no** manufacturer/lot/dose columns — deleting it now would drop that meta for JSONB-written rows. **Gate:** delete the decoder only after (a) the FE cutover removes the JSONB write path, and (b) real immunization-meta columns are added to `prescription_vaccines_required` and backfilled from the `__hims_immunization_v1:` payload. Until then the decoder is correct and necessary (documented in `build_form_data_from_prescription_model`'s docstring).
- **Deferred gate — legacy JSONB end-consult override.** The re-point keeps merging the FE `form_data` override over the normalized base because the JSONB write path syncs only `legacy_vitals` + `vaccines_required` to child tables. Remove the override branch only when the FE posts the normalized `/finalize` everywhere (step 3 §3). Covered by `test_override_supplies_sections_missing_from_normalized_base`.
