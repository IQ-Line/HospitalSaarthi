# Record Foundation — Adversarial Review

**Review Date:** 2026-05-26  
**Scope:** Record Foundation module (Phase 1 v1 implementation)  
**Source Documents:** ADR-0028, ADR-0022, ADR-0023, schema-reference.json, record-foundation.v1.yaml, build-plan.md, 01-schema-design.md, 02-scenarios.md

---

## CRITICAL Issues

### [C-1] Missing event contract specification file
**Location:** `specs/events/record-foundation.events.yaml` (file does not exist)  
**Issue:** ADR-0028 §82 lists event contracts as a follow-up action, but the events.yaml file has never been created. The OpenAPI spec and build-plan.md reference these events, but there's no authoritative contract defining payload fields, versions, or schemas. Without this, cross-module consumers cannot safely integrate.  
**Impact:** No compile-time contract for `consultation.finalized`, `abdm.consent.granted`, `abdm.health-record.received`, etc.  
**Action:** Create `specs/events/record-foundation.events.yaml` defining all published/consumed events with full payload schemas before implementing consumers. Reference: ADR-0028 §88-89.

### [C-2] Unique constraint `uq_care_contexts_source` missing `source_record_type`
**Location:** `schema-reference.json:45-47`  
**Issue:** The unique constraint on `care_contexts` prevents one source record from having multiple care contexts (e.g., an OPD visit generating both `opd_visit` and `prescription` care contexts). The build-plan.md §29-30 documents this as a known issue requiring fix.  
**Impact:** Multi-context care-context registration will fail on duplicate-key errors.  
**Action:** Update `uq_care_contexts_source` index definition to include `source_record_type` in the unique key columns. See build-plan.md lines 52-58.

### [C-3] Disclosure endpoint response mismatch with adapter needs
**Location:** `specs/openapi/record-foundation.v1.yaml:590-622` vs `build-plan.md:239-241`  
**Issue:** The OpenAPI spec defines `DisclosureResponse` with `{ careContextReference, content, media }` but the adapter's `fetchBundlesForConsent` needs actual bundle JSON inline. The spec lacks `bundle_json` or equivalent field.  
**Impact:** Integration Hub cannot fetch bundles for ABDM HIP disclosure without additional API calls.  
**Action:** Add `bundle_json` (or `content` with full bundle) to `DisclosureResponse`. See build-plan.md line 241: "return content inline for simplicity."

### [C-4] Missing `created_by`/`updated_by` audit columns
**Location:** `schema-reference.json:care_contexts columns:19-39`, all entities  
**Issue:** All tables lack `created_by` and `updated_by` columns required by database-principles.md §92-101. The principle states these are mandatory for healthcare regulatory compliance (NABH, DPDP Act).  
**Impact:** Cannot demonstrate who created/modified care contexts, bundles, erasures. Regulatory gap.  
**Action:** Add `created_by UUID` and `updated_by UUID` columns to all 6 tables.

---

## HIGH Issues

### [H-1] `consent_disclosable` field missing from schema
**Location:** `schema-reference.json:care_contexts` vs `specs/openapi/record-foundation.v1.yaml:434`  
**Issue:** The OpenAPI schema includes `consent_disclosable` on `CareContext`, but `schema-reference.json` doesn't define this column. The field is populated by `abdm.consent.*` event consumers and used by HIP discovery.  
**Impact:** Discovery queries cannot filter on disclosable status; projection rebuild fails.  
**Action:** Add `consent_disclosable BOOLEAN NOT NULL DEFAULT false` to `care_contexts` table, or use `timeline_index.consent_disclosable` exclusively and clarify the boundary.

### [H-2] Erasure scheduler missing bundle-size check before deletion
**Location:** `02-scenarios.md:248-261` (Scenario 7)  
**Issue:** The erasure sequence shows inserting erasure_log and deleting external_health_records, but doesn't capture `original_size` of the bundle before DELETE. `schema-reference.json:erasure_log:152-153` expects `original_size_bytes`.  
**Impact:** Erasure log incomplete; compliance evidence missing.  
**Action:** Capture `bundle_size_bytes` from `record_bundle_manifests` before DELETE operations in scheduler.

### [H-3] Missing `abdm_reference_number` UNIQUE constraint enforcement
**Location:** `schema-reference.json:46-47`  
**Issue:** The index `uq_care_contexts_abdm_ref` is documented as "Conditional unique on abdm_reference_number IS NOT NULL" but PostgreSQL doesn't support conditional uniqueness without partial indexes.  
**Impact:** Multiple care contexts could end up with the same non-NULL `abdm_reference_number`.  
**Action:** Implement as partial index: `CREATE UNIQUE INDEX ... WHERE abdm_reference_number IS NOT NULL`.

### [H-4] `encryption_kind` enum should include missing value for v1
**Location:** `schema-reference.json:bundle_storage:88`  
**Issue:** `encryption_kind` check constraint lists `'at_rest_pg','at_rest_object_kms','app_encrypted'` but `storage_kind = 'object_storage_ref'` without corresponding `'at_rest_object_kms'` is inconsistent. Additionally, external HIP bundles may arrive pre-encrypted with their own KMS.  
**Impact:** Schema gap for externally encrypted bundles.  
**Action:** Consider adding `'external_hip'` or similar value for bundles received already encrypted by source HIP.

---

## MEDIUM Issues

### [M-1] Bundle hash stored only on manifest, not enforced on storage row
**Location:** `schema-reference.json:bundle_storage:82-92` vs `record_bundle_manifests:66`  
**Issue:** `bundle_hash` lives only on `record_bundle_manifests`, not on `bundle_storage`. Per ADR-0022 §94-96, hash mismatch between bytes and manifest is "evidence of tampering." The storage row should also store hash for integrity.  
**Impact:** Silent corruption detection requires JOIN; no atomic integrity check.  
**Action:** Add `bundle_hash TEXT` to `bundle_storage` for defense-in-depth.

### [M-2] Timeline rebuild cross-module call violates isolation
**Location:** `02-scenarios.md:292-294`  
**Issue:** The timeline rebuild worker calls Integration Hub API for consent disclosability. This breaks the "no cross-schema queries" rule and creates runtime coupling.  
**Impact:** Projection rebuild can fail if Integration Hub is unavailable; circular dependency risk.  
**Action:** Consider denormalising consent state to `timeline_index` via events, or documenting this as the only accepted cross-module call for projection rebuild.

### [M-3] Missing `abha_linkage_status` state transition documentation
**Location:** `01-schema-design.md:136-144` (state diagram)  
**Issue:** The state machine diagram shows `not_linked → linkable → linked → revoked → linkable`, but there's no CHECK constraint in schema to enforce valid transitions.  
**Impact:** Invalid states may be written by buggy code.  
**Action:** Either add PostgreSQL enum type for states or document transition rules in application code with validation.

### [M-4] `period_end` nullable but used in timeline sorting
**Location:** `schema-reference.json:care_contexts:32` vs `02-scenarios.md:78`  
**Issue:** `period_end` is nullable but timeline entries use `occurred_at` which pulls from `period_start` for sorting. The semantics for records without end time are unclear.  
**Impact:** Timeline ordering inconsistent for ongoing care contexts.  
**Action:** Clarify that `occurred_at = COALESCE(period_end, period_start)` for timeline ordering.

### [M-5] Missing `care_contexts.encounter_id` index
**Location:** `schema-reference.json:care_contexts:indexes:42-47`  
**Issue:** `encounter_id` is a nullable column but has no index. Multiple care contexts often share an encounter (visit + prescription), and queries may need to find all contexts for an encounter.  
**Impact:** Poor performance on encounter-scoped queries.  
**Action:** Add index on `("iq_tenant_id", "encounter_id")` for encounter grouping queries.

---

## LOW Issues

### [L-1] OpenAPI server URL mismatch
**Location:** `specs/openapi/record-foundation.v1.yaml:11`  
**Issue:** Server shows `http://localhost:3006/api/record-foundation/v1` but ADR-0028 §282 and build-plan.md indicate `/api/v1/` prefix pattern used by other modules.  
**Action:** Align with platform convention: `http://localhost:3006/api/v1` with service mounting per ADR-0016.

### [L-2] Missing `bundle_size_bytes` capture on external record ingestion
**Location:** `02-scenarios.md:147-154` vs `schema-reference.json:external_health_records:99-110`  
**Issue:** The ingestion flow doesn't explicitly capture `bundle_size_bytes` before storage. `record_bundle_manifests` expects this column; the ingestion step should populate it.  
**Action:** Add explicit size capture during bundle ingestion.

### [L-3] `display_summary` parsing lacks error handling specification
**Location:** `02-scenarios.md:141-142`  
**Issue:** The `extractDisplaySummary(bundle)` call assumes bundle structure. No fallback for malformed external bundles.  
**Action:** Add defensive coding: if Composition parsing fails, store minimal metadata with warning flag.

### [L-4] Missing `supersedes_id` index for amendment chains
**Location:** `schema-reference.json:care_contexts:34`  
**Issue:** `supersedes_id` enables amendment chains but has no index. Queries for "current non-superseded version" would scan all rows.  
**Action:** Add index on `("iq_tenant_id", "supersedes_id")` for amendment chain traversal.

### [L-5] `validation_errors` JSONB lacks structure specification
**Location:** `schema-reference.json:record_bundle_manifests:63`  
**Issue:** `validation_errors` is nullable JSONB but no schema defines its expected structure for invalid bundles.  
**Action:** Define error structure in OpenAPI components or document expected format.

---

## Summary by Area

| Area | CRITICAL | HIGH | MEDIUM | LOW |
|------|----------|------|--------|-----|
| Event Contracts | 1 | 0 | 0 | 0 |
| Schema Integrity | 0 | 3 | 2 | 3 |
| API Contracts | 1 | 2 | 0 | 1 |
| Compliance/Audit | 0 | 1 | 1 | 0 |
| Performance | 0 | 0 | 1 | 2 |

---

## Priority Action List

1. **Before scaffold:** Create `specs/events/record-foundation.events.yaml`
2. **Before migrations:** Fix `uq_care_contexts_source` unique constraint (build-plan.md)
3. **Before disclosure implementation:** Add `bundle_json` to `DisclosureResponse`
4. **Before any INSERTs:** Add `created_by`/`updated_by` columns to all tables
5. **Before erasure scheduler:** Ensure `original_size_bytes` capture on all erasure paths