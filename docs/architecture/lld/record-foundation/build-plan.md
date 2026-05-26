# Record Foundation — Build Plan

## What we're building

Record Foundation is the **fifth core platform module** — the substrate for ABDM care contexts and immutable FHIR Document Bundle storage. A care-context CRUD service with bundle storage, an external-record inbox, and a simple HTTP API.

One care context. One FHIR bundle of one ABDM HI type. If a visit produces both a consultation and a prescription, that's two care-context rows (same `source_record_id`, different `source_record_type`).

## Current state of the codebase

**What exists for RF:**
- Full design docs (ADR-0028, HLD §5, LLD with 6-table schema, 8 scenarios, dev guide, OpenAPI spec)
- `RecordFoundationClient` port interface in `modules/abdm-adapter/src/ports.ts` with 3 methods
- `HttpRecordFoundationClient` + `NoOpRecordFoundationClient` in `record-foundation-client.http.ts`
- `MockRecordFoundationClient` in `mock-platform-clients.ts`
- Event consumer in adapter: subscribes to `record-foundation.care-context.registered` / `.created`

**What exists for RF's future consumers:**
- **M3 (PR#121) — merged into dev.** Adapter layer complete. HIP-side calls `deps.recordFoundation.fetchBundlesForConsent`, HIU-side decrypts bundles into `bundleJson` staging column (not RF's external-record inbox yet).
- **OPD — scaffolded on `doctor-opd-first` branch.** Python/FastAPI. No cross-language event bus exists. OPD will push care contexts directly to RF via HTTP for MVP.
- **Integration Hub — no events published yet.** No `abdm.consent.*` or `abdm.health-record.received` publishers exist. These are future.

**What doesn't exist:**
- `modules/record-foundation/` — no directory, no code
- `services/record-foundation-svc/` — no directory, no code
- `specs/events/record-foundation.events.yaml` — mentioned in ADR-0028 but never created
- No Nx project configs for RF

**What needs fixing:**
- `schema-reference.json` unique constraint `uq_care_contexts_source` lacks `source_record_type` — prevents one visit from having both `opd_visit` and `prescription` care contexts
- `HttpRecordFoundationClient` URLs don't match the OpenAPI spec

## Architecture decisions confirmed

| Decision | Choice |
|---|---|
| **Data store** | PostgreSQL with Citus distribution by `iq_tenant_id`. All 6 tables. |
| **Bundle storage** | Inline JSONB (`storage_kind = 'inline_jsonb'`). Object storage path reserved for post-launch. |
| **Bundle immutability** | INSERT-only on `bundle_storage`. No UPDATE path on bundle bytes. Ever. |
| **Care-context-to-bundle** | 1:1. One `care_contexts` row : one current `record_bundle_manifests` row. Amendments use supersession chain. |
| **Service framework** | Fastify v5, TypeScript, port 3006. Mirror `empi-svc` scaffold pattern. |
| **Event bus** | None for MVP. RF is called directly via HTTP by the adapter and OPD. Cross-service event publishing deferred until PostgreSQL outbox pattern ships. |
| **Adapter RF client** | Updated to use canonical spec paths (not the reverse). |
| **OPD integration (MVP)** | OPD calls RF's `POST /api/v1/care-contexts` + `POST /api/v1/bundles` directly via HTTP. |

## Schema (6 tables)

All distributed by `iq_tenant_id`. Full column defs already in `schema-reference.json`.

**One change needed:** Fix `uq_care_contexts_source` to include `source_record_type`:

```json
// Before (prevents one source record from having multiple care contexts):
["iq_tenant_id", "source_origin", "source_system_id", "source_record_id"]

// After (allows one source record to have multiple contexts of different types):
["iq_tenant_id", "source_origin", "source_system_id", "source_record_id", "source_record_type"]
```

## Endpoints to implement

### Group A — Adapter direct consumption (update `HttpRecordFoundationClient` to call these)

| Endpoint | Method | Purpose | Maps to adapter method |
|---|---|---|---|
| `/api/v1/care-contexts?patient_id=X&linked=false` | GET | List unlinked care contexts | `listUnlinkedCareContexts` |
| `/api/v1/care-contexts/:id/linkage` | PATCH | Mark single care context as linked | `markCareContextLinked` |
| `/api/v1/disclosures` | POST | Evaluate disclosable bundles under consent | `fetchBundlesForConsent` |

### Group B — Seeding / OPD push

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/care-contexts` | POST | Create a care context (OPD calls this, or manual seeding) |
| `/api/v1/bundles` | POST | Store a bundle against an existing care context |

### Group C — M3 HIU external records inbox

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/external-records` | POST | Ingest external bundle (called by adapter's M3 bundle push handler) |
| `/api/v1/external-records?patient_id=X` | GET | List external records for a patient |
| `/api/v1/external-records/:id` | GET | Get external record + bundle JSON |

### Group D — Spec completeness (future, endpoints exist but stub/defer population logic)

| Endpoint | Method | Notes |
|---|---|---|
| `GET /api/v1/care-contexts/:id` | GET | Single context fetch — implement, trivial |
| `GET /api/v1/care-contexts/discoverable` | GET | ABDM HIP discovery — implement, reuses list logic with discoverable filter |
| `POST /api/v1/care-contexts/bulk-update-linkage` | POST | Batch link — implement but can reuse single-link |
| `GET /api/v1/bundles/:id` | GET | Get bundle JSON — implement |
| `GET /api/v1/bundles?care_context_id=X` | GET | List manifests for care context — implement |
| `GET /api/v1/timeline` | GET | Stub (no data yet) |
| Admin endpoints | POST/GET | Stub |

Total: ~14 endpoints, of which ~10 are real implementations and ~4 are stubs.

### Aligned spec paths vs what `HttpRecordFoundationClient` currently calls

We update the **adapter's HTTP client** to use the canonical paths:

| Current (adapter client) | New (canonical) | Change |
|---|---|---|
| `GET /api/v1/timeline-index?patient_id&linked` | `GET /api/v1/care-contexts?patient_id&linked` | Update URL + response shape in client |
| `PATCH /api/v1/care-context/:id` | `PATCH /api/v1/care-contexts/:id/linkage` | Update URL path |
| `GET /api/v1/disclosure/bundles?patient_id&consent_id&from&to` | `POST /api/v1/disclosures` with JSON body | Change from GET to POST, construct request body from input |

## OpenAPI spec updates

The spec needs updates to:

1. Add `linked` as a filter param to `GET /api/v1/care-contexts`
2. Add `PATCH /api/v1/care-contexts/:id/linkage` endpoint
3. Add `POST /api/v1/care-contexts` endpoint (create)
4. Add `POST /api/v1/bundles` endpoint (create bundle)
5. Add `POST /api/v1/external-records` endpoint (ingest external)
6. Update `/api/v1/disclosures` response to match what the adapter needs (return `{ entries: [{ careContextReference, content, media }] }`)
7. Add the `POST /api/v1/care-contexts` and `POST /api/v1/bundles` request/response schemas

## Service scaffold structure

```
services/record-foundation-svc/
├── .env.example
├── .gitignore
├── Dockerfile
├── project.json              # Nx config (application)
├── tsup.config.ts
├── package.json
├── tsconfig.json
├── scripts/
│   └── migrate.mjs           # Drizzle migration runner
└── src/
    └── main.ts               # Fastify v5 server, DI wiring, route registration

modules/record-foundation/
├── project.json              # Nx config (module, library)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts              # Public exports
    ├── ports.ts              # Repository interfaces (if any RF-specific ports)
    ├── schema/
    │   ├── tables.ts         # Drizzle table definitions (mirror schema-reference.json)
    │   └── migrations/       # Drizzle migration files
    ├── domain/
    │   ├── care-context.ts
    │   ├── bundle-manifest.ts
    │   ├── external-record.ts
    │   └── erasure-log.ts
    ├── data-access/
    │   ├── drizzle-care-contexts.repo.ts
    │   ├── drizzle-bundle-manifests.repo.ts
    │   ├── drizzle-bundle-storage.repo.ts
    │   ├── drizzle-external-records.repo.ts
    │   ├── drizzle-timeline-index.repo.ts
    │   └── drizzle-erasure-log.repo.ts
    ├── rest-handlers/
    │   ├── care-contexts.ts
    │   ├── bundles.ts
    │   ├── disclosures.ts
    │   ├── external-records.ts
    │   ├── timeline.ts
    │   └── admin.ts
    ├── use-cases/
    │   ├── create-care-context.ts
    │   ├── update-care-context-linkage.ts
    │   ├── list-care-contexts.ts
    │   ├── find-care-contexts-discoverable.ts
    │   ├── store-bundle.ts
    │   ├── evaluate-disclosure.ts
    │   ├── ingest-external-record.ts
    │   ├── list-external-records.ts
    │   └── get-external-record.ts
    ├── projections/          # Timeline index population (stub for MVP)
    └── events/
        ├── publishers/       # Event publishers (stub for MVP — events deferred)
        └── consumers/        # Event consumers (stub for MVP — no sources exist yet)
```

**Dependencies:**
- `@hims/ts-sdk-*` packages (existing monorepo SDK)
- `drizzle-orm` and `drizzle-kit` (same as other modules)
- `fastify` v5 (provided by service wrapper)

## Adapter changes required

Alongside RF, update `modules/abdm-adapter/src/data-access/record-foundation-client.http.ts`:

1. **`listUnlinkedCareContexts`** — change URL from `/api/v1/timeline-index` to `/api/v1/care-contexts`, parse response from old shape (`{ items: [...] }`) to match care-contexts response shape (`{ data: [...], total: N }`)
2. **`markCareContextLinked`** — change URL from `/api/v1/care-context/:id` to `/api/v1/care-contexts/:id/linkage`
3. **`fetchBundlesForConsent`** — change from `GET /api/v1/disclosure/bundles?patient_id=X&consent_id=Y` to `POST /api/v1/disclosures` with `{ consent_artifact_id, patient_id, hi_types, date_range }` body; parse `{ bundles: [...] }` response to `HealthRecordBundleEntry[]`

## M3 adapter integration — external records

Currently `handleBundlePush` writes decrypted bundle to `abdm_m3_data_transfers.bundle_json` (staging column). For the MVP, this should also (or instead) push to RF's external-records endpoint. The flow:

```
handleBundlePush decrypts → bundle ready
  ├─ stage into transfer.bundle_json (keep for backward compat)
  └─ POST /api/v1/external-records { patient_id, consent_artifact_id, bundle, source_hip, data_erase_at }
       → RF stores: bundle_storage + manifest + care_context + external_health_record
```

This requires the adapter's `AbdmAdapterDeps` to have access to the RF HTTP client with an `ingestExternalRecord` method, or just a direct HTTP call from the use-case. Since the adapter already has `deps.recordFoundation`, we can add a 4th method to the `RecordFoundationClient` interface.

## Implementation order

| Step | What | Dependencies |
|---|---|---|
| 1 | Scaffold `modules/record-foundation/` + `services/record-foundation-svc/` with Nx configs | None |
| 2 | Drizzle schema: define 6 tables in `tables.ts`, generate migration | Step 1 |
| 3 | Implement repositories for all 6 tables | Step 2 |
| 4 | Implement use-cases: list care contexts, create care context, update linkage | Step 3 |
| 5 | Implement use-cases: store bundle, evaluate disclosure | Step 3 |
| 6 | Implement use-cases: ingest external record, list/get external records | Step 3 |
| 7 | Implement REST handlers for all Group A-C endpoints | Steps 4-6 |
| 8 | Implement REST handlers for Group D (spec completeness — simpler ones) | Steps 4-6 |
| 9 | Wire it in `main.ts`: Fastify server, Drizzle connection, route registration | Steps 7-8 |
| 10 | Update `HttpRecordFoundationClient` in adapter to use canonical paths | Step 9 |
| 11 | Add `ingestExternalRecord` to `RecordFoundationClient` port + HTTP client | Step 9 |
| 12 | Update adapter's `handleBundlePush` to call RF's external-records endpoint | Step 11 |
| 13 | Update `schema-reference.json` unique constraint + document the 1:1 invariant | Step 2 |
| 14 | Update OpenAPI spec with new endpoints | Steps 7-8 |
| 15 | Vitest tests for use-cases + repos | Parallel |

## Key constraints

1. **No UPDATE on `bundle_storage` bundle bytes** — enforce at the repository level. INSERT + DELETE only.
2. **Canonical JSON before hashing** — for bundle bytes, use the `@hims/ts-sdk-fhir` canonical-json helper (RFC 8785/JCS).
3. **One transaction per atomic operation** — creating a care context + storing a bundle must be one PG transaction.
4. **No cross-schema FKs** — `care_contexts.patient_id` references EMPI's patient conceptually, not with a DB constraint.
5. **Citus distribution** — every table distributed by `iq_tenant_id`.
6. **Future event path** — when OPD is ready, RF will need a `POST /api/v1/care-contexts` endpoint seeded directly by OPD or via the future event consumer.
7. **M3 external records path** — `POST /api/v1/external-records` consumes the decrypted bundle from the adapter's M3 HIU handler.

## Open questions

1. **Disclosure endpoint: return bundle IDs or actual bundle JSON?** The current spec's `POST /api/v1/disclosures` response returns `{ bundles: [{ bundle_manifest_id, care_context_id, bundle_kind, bundle_hash }] }` — IDs, not content. The adapter needs actual bundle JSON (`contentJson: string`). Should the disclosure endpoint return the content inline, or should the adapter call `GET /api/v1/bundles/:id` separately? Decision: **return content inline** for simplicity (the adapter needs it in one call).

2. **`dataEraseAt` on external records** — should the adapter pass it explicitly, or should RF look it up from the consent artifact? Decision: **adapter passes it explicitly** (RF doesn't own consent artifacts).
