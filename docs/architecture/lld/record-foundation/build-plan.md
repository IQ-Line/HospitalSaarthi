# Record Foundation — Build Plan

## What we're building

Record Foundation is the **fifth core platform module** — a simple CRUD service for care contexts and immutable FHIR Document Bundles. Two tables, six endpoints, four use-cases.

## Current state

**What exists for RF (simplified):**
- `modules/record-foundation/` — 2 tables (care_contexts + bundles), 4 use-cases, 6 endpoints
- `services/record-foundation-svc/` — Fastify v5 server, Drizzle, 2 repos wired
- `RecordFoundationClient` port in adapter: 2 methods (`listCareContexts`, `listBundles`)
- `HttpRecordFoundationClient` + `NoOpRecordFoundationClient` + `MockRecordFoundationClient`
- 4 consuming use-cases updated in abdm-adapter
- OpenAPI spec (6 paths), event spec (2 events), schema-reference (2 entities)
- 4 unit tests all passing, lint clean

## Schema (2 tables)

All distributed by `iq_tenant_id`.

### care_contexts
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| iq_tenant_id | UUID | Distribution column |
| patient_id | UUID | EMPI reference |
| source_origin | TEXT | platform_module / legacy_system / external_abdm |
| source_system_id | TEXT | Module name or integration name |
| source_record_type | TEXT | ABDM HI type |
| source_record_id | TEXT | Nullable; PK in source module |
| encounter_id | UUID | Nullable; grouping |
| display | TEXT | Patient-facing name |
| period_start | TIMESTAMPTZ | Clinical date |
| period_end | TIMESTAMPTZ | Nullable |
| status | TEXT | active / inactive / archived |
| created_at / updated_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | Nullable |

Unique constraint: (iq_tenant_id, source_origin, source_system_id, source_record_id, source_record_type)

### bundles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| iq_tenant_id | UUID | Distribution column |
| care_context_id | UUID | FK to care_contexts |
| bundle_kind | TEXT | FHIR bundle type |
| fhir_profile_url | TEXT | NRCeS profile URL |
| fhir_profile_version | TEXT | Pinned version |
| producer_kind | TEXT | platform_module / external_hip |
| producer_id | TEXT | Module name or HIP id |
| bundle_json | JSONB | Full FHIR R4 Bundle |
| bundle_size_bytes | INTEGER | Byte count |
| produced_at | TIMESTAMPTZ | Authoring timestamp |
| stored_at | TIMESTAMPTZ | Default now() |
| created_at / updated_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | Nullable |

Foreign key: (iq_tenant_id, care_context_id) → care_contexts (iq_tenant_id, id)

## Endpoints (6)

| Method | Path | Description |
|--------|------|-------------|
| GET | /care-contexts | List (filter by patient_id, status) |
| GET | /care-contexts/:id | Get single |
| POST | /care-contexts | Create |
| GET | /care-contexts/:careContextId/bundles | List bundles for care context |
| GET | /bundles/:id | Get bundle |
| POST | /bundles | Store bundle |

## Module structure

```
modules/record-foundation/src/
├── index.ts
├── ports.ts                    # CareContextRepo + BundleRepo
├── router.ts
├── schema/tables.ts
├── domain/care-context.ts
├── domain/bundle.ts
├── data-access/
│   ├── drizzle-care-contexts.repo.ts
│   └── drizzle-bundles.repo.ts
├── use-cases/
│   ├── create-care-context.ts
│   ├── list-care-contexts.ts
│   ├── get-care-context.ts
│   └── store-bundle.ts
├── rest-handlers/
│   ├── schemas.ts
│   ├── care-contexts.ts
│   └── bundles.ts
└── events/
    ├── publishers/index.ts     # Stub
    └── consumers/index.ts      # Stub

services/record-foundation-svc/src/main.ts
```

## Adapter mappings

| Adapter method | RF endpoint |
|---------------|-------------|
| `listCareContexts({ patientId })` | GET /care-contexts?patient_id=X |
| `listBundles({ careContextId })` | GET /care-contexts/:careContextId/bundles |

## Key constraints

1. **No UPDATE on bundle_json** — INSERT-only. Immutable bundle bytes.
2. **No cross-schema FKs** — `care_contexts.patient_id` references EMPI conceptually.
3. **Citus distribution** — all tables distributed by `iq_tenant_id`.
4. **Tenant isolation** — every query scoped by `iq_tenant_id`.
