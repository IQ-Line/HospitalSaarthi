# Record Foundation — Simplification Plan

**Date:** 2026-05-29
**Branch:** `record-foundation-module`
**Status:** 95% complete (specs/docs TBD)

## Goal
Drastically simplify `modules/record-foundation` from a complex module (disclosure evaluation, external record inbox, timeline projection, erasure scheduling, ABDM linkage) to a simple CRUD service storing care-contexts and FHIR bundles.

## Results

### Schema (2 tables ✓)
- `care_contexts` — 15 columns, stripped ABDM-specific fields
- `bundles` — 14 columns, merged from bundle_manifests + bundle_storage

### Ports (2 ports ✓)
- `CareContextRepo` — `insert`, `findAll`, `findById`
- `BundleRepo` — `insert`, `findById`, `findByCareContextId`

### Use-cases (4, down from 11 ✓)
- `create-care-context`, `list-care-contexts`, `get-care-context`, `store-bundle`

### Handlers (6 endpoints ✓)
- GET /care-contexts, GET /care-contexts/:id, POST /care-contexts
- GET /bundles/:id, POST /bundles
- GET /care-contexts/:careContextId/bundles (added for adapter)

### Adapter changes ✓
- Port: `RecordFoundationClient` has 2 methods (`listCareContexts`, `listBundles`)
- `HttpRecordFoundationClient` — rewritten for new endpoints
- `NoOpRecordFoundationClient` — updated
- `MockRecordFoundationClient` — updated
- `handle-discover-callback.ts` → `listCareContexts`
- `handle-link-callback.ts` + `handle-link-confirm-callback.ts` → removed `markCareContextLinked` calls
- `push-health-information.ts` → uses `listCareContexts` + per-context `listBundles`

### Files deleted (18) ✓
Schema: `src/schema/migrations/001_create...sql` (replaced)
Domain: `external-record.ts`, `disclosure.ts`
Use-cases: 7 files (evaluate-disclosure, ingest-external-record, list/get-external-record, mark-viewed, update-care-context-linkage, bulk-update-linkage, find-discoverable-contexts)
Data-access: 4 repos (external-records, timeline-index, erasure-log, bundle-manifests)
Handlers: 4 files (external-records, disclosures, timeline, admin)

### Files created (4) ✓
- `src/domain/bundle.ts`
- `src/data-access/drizzle-bundles.repo.ts`
- `src/events/publishers/index.ts` (updated)
- `src/events/consumers/index.ts` (updated)

### Tests ✓
RF: 4 tests pass. ABDM: 97 tests pass. Lint: RF clean, ABDM pre-existing issues only.

### Remaining
- [ ] `specs/openapi/record-foundation.v1.yaml` — rewrite from 20+ paths to 6
- [ ] `specs/events/record-foundation.events.yaml` — strip external-record + erasure events
- [ ] `docs/architecture/lld/record-foundation/` — update build plan + checkoff
- [ ] `docs/.../schema-reference.json` — rewrite
