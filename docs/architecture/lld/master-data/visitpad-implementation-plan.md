# Visitpad subdomain — Implementation Plan (rev 2)

**Status:** Approved for execution
**Scope:** Clinical reference data behind the "Visitpad templates" admin UI, delivered as a **subdomain of the existing Master Data module**.

> This revision supersedes draft 1. The UI analysis, `is_active` matrix, payload↔UI gap list, and testing strategy from draft 1 are preserved nearly verbatim. The architecture, data model, and milestones are rewritten.

---

## 0. Changes from draft 1

| Topic | Draft 1 | Rev 2 | Why |
|---|---|---|---|
| Module boundary | New `visitpad` module | Subdomain of **`master-data`** | HLD §4.2 — Master Data owns ICD, drug catalogs, LOINC, SNOMED, procedure codes, and "more" clinical reference data. "Visitpad" is a UI grouping, not a bounded context. Splitting would create a sibling catalog and require an HLD revision. |
| URL prefix | `/api/v1/visitpad` | `/api/v1/master-data/visitpad/*` | Reflects placement. Reuses BFF upstream — no new wiring. |
| Global ↔ tenant | "Global templates, fixed system tenant" (single-layer) | **Disjoint catalogs with explicit import** (two-table-per-entity) | Product decision: no inheritance. Tenants pick from global library, import into their own catalog, and add their own. Clinical workflows read tenant catalog only. |
| `tenant_id` strategy | "Option A (system tenant)" or "Option B (nullable)" | Two distribution modes: **Citus reference** for global side, **distributed by `tenant_id`** for tenant side | "Nullable `tenant_id`" violates CLAUDE.md. Reference tables are the standard Citus pattern for global read-mostly data. |
| Stack | "Drizzle or SQLAlchemy — follow existing module" | **SQLAlchemy + Alembic** (Python) | Master Data is Python; visitpad inherits. |
| Soft delete | "Match master-data or document per-entity" | **`is_deleted` everywhere**, list filters by default | Match Master Data exactly. No per-entity exceptions. |
| Bulk CSV | "Phase 2 unless mandatory" | Phase 2, locked | No exceptions. |
| Module name in code | `modules/visitpad` | `modules/master-data/app/.../visitpad/*` (subpackage) | Single deployable. |

---

## 1. Product summary

Single admin area **"Visitpad templates"** with these tabs:

| Primary tab | Sub-tabs | Core entities |
|---|---|---|
| Units | Units / Conversions | `unit`, `unit_conversion` |
| Vitals | — | `vital` |
| Chief complaints | — | `chief_complaint` |
| Diagnosis | — | `diagnosis` (ICD-10) |
| Allergies | Allergens / Reactions | `allergen`, `allergy_reaction` |
| Rx columns | Sidebar by `section` | `rx_column` |
| Medicines | — | `medicine` |
| Chronic illness | — | `chronic_illness` |
| Procedures | — | `procedure` |

Each tab: **list + search + filters + CRUD + inline `is_active` toggle** per §1a, **Bulk CSV** Phase 2.

**New (rev 2):** each tab additionally exposes a **"Browse global library"** sub-view with multi-select + **Import** action. See §4.1.

---

## 1a. `is_active` / Enable — coverage matrix (unchanged from draft 1)

**Product rule:** Every tenant catalog row that appears with an "Enabled" switch in the reference UI supports `is_active` on the API and inline PATCH in the web app, using the existing `useUpdate*` mutation `{ id, input }` pattern with `mutationErrorMessage` on the catch.

| Entity | UI toggle | Plan |
|---|---|---|
| Unit | Yes | Full support |
| Unit conversion | **No** in reference UI | No `is_active` v1; actions-only row. Add later only if product asks. |
| Vital | Yes | Full support |
| Chief complaint | Yes | Full support |
| Diagnosis | Yes | Full support |
| Allergen | Yes | Full support |
| Allergy reaction | Yes | Full support |
| Rx column | Yes | Full support |
| Medicine | Yes | Full support |
| Chronic illness | Yes | Full support |
| Procedure | Yes | Full support |

**Scope:** `is_active` lives on **tenant rows** (the catalog the hospital uses). Global library rows have their own platform-admin `is_active` (controls whether a global row is offered for import); this is not exposed in tenant-side admin UIs.

`display_order` and `is_deleted` exist on every table regardless of UI toggle exposure, matching `master-data` conventions.

---

## 1b. Screenshot-derived UI checklist (unchanged from draft 1)

| Tab | Toolbar | Table / special UI |
|---|---|---|
| Units | Search; All dimensions | Code, Label, Dimension, Canonical, Order, Enabled, actions |
| Conversions | Search | From → To, Factor, Offset; helper text `value_to = value_from × factor + offset` |
| Vitals | Search; All categories | Display, Short, Category badge, Type, Unit, LOINC, SNOMED, Normal (adult), Critical, Paired, Order, Active |
| Chief complaints | Search; All systems; All triage | Display, Body system, Triage, SNOMED, Synonyms, Paediatric, Enabled |
| Diagnosis | Search ICD/descriptor/alias; All categories | ICD, Descriptor, Display/alias, ICD version, Chapter |
| Allergens | Search; All types | Display, Type, Drug class, SNOMED, Default severity, Enabled |
| Reactions | Search | Name, Code, Enabled |
| Rx columns | Search; section sidebar | Name, Code, Enabled (per section) |
| Medicines | Search; All dosage/schedule/status | Name, Generic, Form/strength, Class, Schedule, Active |
| Chronic illness | Search; All categories | ICD, Display, Category, SNOMED, Enabled |
| Procedures | Search; All categories/billing/modality | CPT, Display, Category, Modality, Billing, SNOMED, Duration, Consent, Enabled |

**Global chrome:** Bulk CSV + "+ Add …" primary button; Columns dropdown (Phase 2); tab counts `Vitals (8/15)` from list `total` + active count.

---

## 1c. Payload ↔ UI gaps to close in spec (unchanged from draft 1)

These remain blockers for the OpenAPI of the relevant entity. Resolve before scaffolding handlers for that entity:

| Field | Action |
|---|---|
| `vital.loinc_code`, `vital.snomed_observable_code` | Nullable; UI shows "—". |
| `vital.allowed_units`, `vital.normal_range_paediatric` | Define JSON schema + form subsection. |
| `vital.reference_kind` + `reference_json` | **Enumerate allowed `reference_kind` values and JSON shapes per kind in OpenAPI.** Blocking. |
| `diagnosis.snomed_code` null | OK; "—". |
| `unit_conversion` missing `display_order` | Add to schema; default sort by `from_code, to_code`. |
| `medicine` arrays (`brand_names`, `route_of_admin`, …) | Document **PATCH merge strategy: full replace** (simpler than append). |
| `procedure.type_modality` empty string | Normalize `""` → `null` on write. |

---

## 2. Architecture

### 2.1 Placement

- Code lives under `modules/master-data/app/visitpad/` (Python subpackage).
- DB tables live in the **`master_data` schema** with `visitpad_` prefix: `master_data.visitpad_unit`, `master_data.visitpad_global_unit`, etc.
- Alembic migrations in the existing `modules/master-data/alembic/versions/` directory.
- OpenAPI: extend `specs/openapi/master-data.v1.yaml` with `paths` and `components` under a `visitpad` tag. (If the file grows unwieldy, split via `$ref` to `specs/openapi/master-data/visitpad.v1.yaml` — service still mounts one spec.)
- HTTP base path: **`/api/v1/master-data/visitpad/`**. No new BFF upstream — `services/bff/src/main.ts` already proxies `/api/v1/master-data` to `MASTER_DATA_URL`.
- No new service. No new port. No new docker-compose entry.

### 2.2 Data model — disjoint catalogs

**Per entity, two tables.** Citus forces this: global rows must be replicated to every worker (reference table); tenant rows must shard by `tenant_id` (distributed table).

```
                   ┌──────────────────────────────────┐
                   │   master_data.visitpad_global_X  │
                   │   (Citus reference table)        │
                   │   - id (uuid)                    │
                   │   - all clinical fields          │
                   │   - is_active   ← platform admin │
                   │   - is_deleted                   │
                   │   - audit cols                   │
                   └──────────────┬───────────────────┘
                                  │
              POST /visitpad/X/import { global_ids: [...] }
              copies row, stamps imported_from_global_id
                                  │
                                  ▼
                   ┌──────────────────────────────────┐
                   │   master_data.visitpad_X         │
                   │   (Citus distributed by tenant)  │
                   │   - id (uuid)                    │
                   │   - tenant_id (uuid, NOT NULL)   │
                   │   - imported_from_global_id (FK, nullable)
                   │   - all clinical fields          │
                   │   - is_active   ← tenant admin   │
                   │   - is_deleted                   │
                   │   - display_order                │
                   │   - audit cols                   │
                   └──────────────┬───────────────────┘
                                  │
                                  ▼
                    Clinical workflows read here only
                      (Rx, Vitals capture, Orders, …)
```

**Rules:**

- Clinical workflows **never read from `visitpad_global_*`** at runtime. Global tables are visible only to the admin UI for browsing/importing.
- `imported_from_global_id` is preserved after copy. Used by admin UI to show "global row changed since import" hints and to support re-import. It is **not** a live link — edits on the global side do not propagate.
- Re-import of the same global row is **idempotent**: if `(tenant_id, imported_from_global_id)` already exists and `is_deleted = false`, no-op. If it exists with `is_deleted = true`, restore (set `is_deleted = false`, refresh fields from global). Return 200 with the row.
- Tenant-original rows have `imported_from_global_id = NULL`. They can never be created by import; they come from `POST /tenant/X`.
- Indexes:
  - `visitpad_global_X`: `(code)` unique where applicable, `(is_active, is_deleted)`.
  - `visitpad_X`: `(tenant_id, code)`, `(tenant_id, imported_from_global_id)` partial index where `imported_from_global_id IS NOT NULL`, plus `(tenant_id, section, code)` for rx_column.

**Foreign keys:** `visitpad_X.imported_from_global_id → visitpad_global_X.id` is fine — same schema, same module. Citus allows FK from distributed → reference.

### 2.3 Operations per entity

| Verb | Path | Purpose | Who |
|---|---|---|---|
| GET | `/master-data/visitpad/global/{entity}` | Browse global library, search/filter, paginate | Tenant admin |
| GET | `/master-data/visitpad/global/{entity}/{id}` | One global row | Tenant admin |
| POST | `/master-data/visitpad/global/{entity}` | Create global row | **Platform admin only** |
| PATCH | `/master-data/visitpad/global/{entity}/{id}` | Edit global row | **Platform admin only** |
| DELETE | `/master-data/visitpad/global/{entity}/{id}` | Soft-delete global row | **Platform admin only** |
| GET | `/master-data/visitpad/{entity}` | Tenant catalog list (used by admin AND clinical workflows) | Tenant user with read permission |
| GET | `/master-data/visitpad/{entity}/{id}` | One tenant row | Tenant user |
| POST | `/master-data/visitpad/{entity}` | Create tenant-original row | Tenant admin |
| POST | `/master-data/visitpad/{entity}/import` | Body: `{ global_ids: [uuid, ...] }`. Bulk-copy globals into tenant catalog. Idempotent per `imported_from_global_id`. Returns `{ imported: [...], skipped: [...], restored: [...] }`. | Tenant admin |
| PATCH | `/master-data/visitpad/{entity}/{id}` | Edit tenant row (including `is_active` toggle) | Tenant admin |
| DELETE | `/master-data/visitpad/{entity}/{id}` | Soft-delete tenant row | Tenant admin |

`tenant_id` on writes comes from the JWT, never from the body.

### 2.4 Authorization (Cerbos)

- Resource: `master_data:visitpad:{entity}` (e.g. `master_data:visitpad:medicine`).
- Actions: `read`, `write`, `import`, `global:read`, `global:write`.
- Platform-admin role gets `global:*`. Tenant admin gets `read`, `write`, `import`. Clinical roles get `read` only (tenant catalog).
- Cross-tenant reads/writes denied by policy — tenant ID match on subject vs resource attributes.

### 2.5 Events

Match Master Data's existing event conventions:

- `master-data.visitpad.{entity}.imported` — payload includes `tenant_id`, `entity`, `tenant_row_id`, `imported_from_global_id`. Lets consumers warm caches.
- `master-data.visitpad.{entity}.updated` — tenant row updated.
- `master-data.visitpad.{entity}.deleted` — tenant row soft-deleted.
- `master-data.visitpad.global.{entity}.updated` — global row changed (used by admin UI to surface "imported rows may be stale"). **Not a propagation trigger.**

---

## 3. Backend plan

### 3.1 OpenAPI (Phase 0 — blocking)

Per entity, define schemas and paths for the 10 operations in §2.3. Two distinct DTO shapes per entity:

- **`{Entity}Global`** — global library row.
- **`{Entity}`** — tenant catalog row. Includes `imported_from_global_id: string | null`.

Patch endpoints accept partial bodies. PATCH for arrays uses **full replace** semantics (document this in the spec description).

`is_active` toggle is a normal PATCH; the route is not special. Idempotent: PATCH `is_active=false` on an already-false row returns 200 with current state.

Resolve §1c gaps before merging the spec for that entity.

### 3.2 Database

- Schema: `master_data` (existing). Tables: `visitpad_<entity>` (distributed) and `visitpad_global_<entity>` (reference).
- Every distributed table: `tenant_id` NOT NULL, included in PK + every unique index.
- Indexes per §2.2.
- Search columns (name, code, descriptor): start with `ILIKE` on a single column; revisit `pg_trgm` if perf demands.

### 3.3 Implementation order (one vertical slice at a time)

1. **Units + conversions** — smallest entities, establishes the two-table pattern, import endpoint, and shared scaffolding.
2. **Rx columns** — exercises the `section` filter pattern.
3. **Allergens + reactions** — exercises sub-tab pattern (two entities under one UI tab).
4. **Chief complaints, chronic illness, diagnosis** — similar shape.
5. **Vitals** — largest form; resolve `reference_kind` JSON shapes first.
6. **Medicines** — largest payload; nail down PATCH merge semantics first.
7. **Procedures**.

Each slice: OpenAPI → Alembic migration → repository → use-case → route → smoke test → frontend wiring.

---

## 4. Frontend plan

### 4.1 Routing & shell

- Base route: `/master-data/visitpad` (sidebar entry: "Visitpad templates").
- Layout shell mirrors `MasterDataPageShell`. Tabs URL-synced: `?tab=vitals&view=catalog`.
- **New (rev 2):** each entity tab has two views:
  - `view=catalog` (default) — tenant catalog. Shows the "+ Add", inline `is_active` toggle, edit/delete actions. This is what clinical workflows also consume from the API.
  - `view=library` — global library, read-only rows, multi-select checkboxes, **"Import selected"** button. Imported rows show a subtle badge "Already in your catalog" (disabled checkbox).
- A second toolbar control switches the view; default is `catalog`. Tab count badge reflects the catalog count (`Vitals (8/15)` = 8 active of 15 in tenant catalog).

### 4.2 Feature module layout

```
services/web/src/features/master-data/visitpad/
  api/                 query keys, hooks, mutations
                       (useUpdate{Entity} { id, input }, useImport{Entity})
  types.ts
  validation.ts        zod per entity (create/update)
  components/          shared shell, toolbar, catalog table, library table, import dialog
  routes/              (or co-located with tanstack-router routes)
```

Reuse from `features/master-data` directly: `DataTable`, `EntityFormDialog`, `TableActiveToggle`, `mutationErrorMessage`, persisted UI prefs.

### 4.3 Sidebar

Top-level "Visitpad templates" entry under the Master Data section of the sidebar — match the existing Master Data sidebar pattern. URL-synced tabs so support can deep-link to a specific entity + view.

### 4.4 Forms & validation (Zod + RHF)

Per entity, two Zod schemas matching OpenAPI:

- Create (tenant) — required fields, enums, max lengths.
- Update (tenant) — partial.

Cross-field rules to add:

- **Vitals:** `critical_low ≤ normal_low ≤ normal_high ≤ critical_high`. `.refine()` with field-level error.
- **Medicines:** `strength_value` requires `strength_unit`. Schedule enum locked.
- **Unit conversion:** `from_unit_code ≠ to_unit_code`. `factor ≠ 0`.

Global rows aren't editable from this UI v1, so no form schemas for them.

### 4.5 Import dialog

A single shared component per entity:

- Multi-select checkboxes in the library table feed an "Import selected (N)" button.
- Confirm dialog summarizes: "Import N items into your catalog. Imported rows can be edited and deactivated independently."
- On success: toast with count; navigate to `view=catalog`; invalidate the catalog query key.
- On partial success (some skipped because already imported): toast lists skipped count.

### 4.6 Bulk CSV + Columns dropdown

**Phase 2.** Not in scope for the first delivery.

---

## 5. Testing strategy (preserved from draft 1, with rev 2 additions)

### 5.1 Layers

| Layer | Tool | Scope |
|---|---|---|
| A. Contract | Schemathesis (or equivalent) | Every 2xx response validates against OpenAPI components; fuzz query params |
| B. Backend unit | pytest | Repos: filters, pagination, uniqueness, **import idempotency**, tenant isolation |
| C. Validation | Vitest | Every Zod schema in `features/master-data/visitpad/validation.ts` |
| D. Component | Vitest + RTL | Shell tab + view switching, import dialog open/select/confirm |
| E. E2E | Playwright | Per-entity matrix below |

### 5.2 Playwright matrix

Add `data-testid` to: shell tab buttons, view toggle (catalog/library), primary "+ Add", first-row `is_active` toggle, library row checkbox, "Import selected" button.

Minimum per entity:

1. Catalog list loads, no errors.
2. Switch to library, list loads.
3. Multi-select 2 rows in library, click Import, confirm. Toast appears. Catalog now shows imported rows.
4. Re-import same rows. Skipped count = 2, no duplicates.
5. Toggle `is_active` on a catalog row. API 200. Row state flips.
6. Edit an imported row's display name. Re-fetch global row (in a test seam) — global is unchanged.

Negative paths: PATCH with invalid body → `toast.error`; cross-tenant token denied at API.

### 5.3 Non-functional

- A11y: every `Switch` and import checkbox has `aria-label`.
- Pagination caps: default 50, max 200 per list endpoint.
- Cerbos integration test with two tenant tokens if available.

### 5.4 Definition of Done (per entity)

- OpenAPI paths + schemas merged.
- Alembic migration + repos + handlers.
- Web: catalog list + library list + import dialog + create/edit dialog + `is_active` toggle + `mutationErrorMessage` on all `mutateAsync`.
- B + C tests for that entity. E2E rows added once the API stabilizes.

---

## 6. Risks & dependencies

- **Stale-after-import.** Global updates do not propagate. Admin UI must eventually surface "imported row out of sync with global" hints (Phase 2 — track `global.updated_at > imported_at` on the tenant row).
- **Bulk import of large libraries.** Drugs especially. Cap a single `/import` call at e.g. 500 rows; document in the spec. Frontend should batch.
- **Cerbos policy file.** Needs `visitpad:*` resources and tenant scoping rule. Add to the same PR as the first entity slice (units).
- **No backend today.** Frontend cannot ship against real data until M2 lands.

---

## 7. Milestones

| Milestone | Deliverable |
|---|---|
| M0 | This plan committed; Cerbos policy stub for `master_data:visitpad:*`. |
| M1 | OpenAPI stubs for Units + Unit Conversions (all 10 operations × 2 entities); BFF already proxies — no change. |
| M2 | Alembic migrations + Units + Conversions CRUD + import endpoint end-to-end. |
| M3 | Web shell + sidebar entry + Units + Conversions UI (catalog + library + import dialog). |
| M4 | Remaining entities in §3.3 order — backend slices. |
| M5 | Remaining UI tabs + polish (search, filters, `is_active` toggles per §1a, error toasts). |
| M6 | Columns dropdown + Bulk CSV (only if in scope at that point). |
| M7 | Testing layers — Vitest validation full coverage, Playwright matrix, contract CI gate. |

---

## 8. Immediate next steps

1. Open a PR with this plan committed at `docs/architecture/lld/master-data/visitpad-implementation-plan.md`.
2. Extend `specs/openapi/master-data.v1.yaml` with the Units + Unit Conversions block (10 operations × 2 entities).
3. Scaffold `modules/master-data/app/visitpad/` (Python subpackage) with one vertical slice for `unit`.
4. Add Cerbos resource policies for `master_data:visitpad:*` in the existing master-data policy directory.
5. Register sidebar entry "Visitpad templates" under Master Data with one route `/master-data/visitpad` (units tab first).

No new service, no new BFF upstream, no new port.

---

## Appendix — for context

- **HLD §4.2** — Master Data ownership of clinical reference data: `docs/architecture/hld/02-core-modules.md`.
- **Master Data LLD** — schema conventions this subdomain follows: `docs/architecture/lld/master-data/01-schema-design.md`.
- **Issue #25** — historical context on the global-vs-tenant data discussion. Product walked back from the inheritance/overlay model recommended there; rev 2 reflects the new disjoint-import model. See the pinned comment on #25 for the resolution.
- **CLAUDE.md** rules applied: `tenant_id` on every table; no cross-module imports (all internal to master-data); spec-first; soft delete via `is_deleted`.
