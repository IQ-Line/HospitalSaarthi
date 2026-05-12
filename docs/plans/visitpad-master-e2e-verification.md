# Visitpad Master — End-to-end verification plan (sections 1 → end)

**Purpose:** Step-by-step verification so **every Visitpad module** matches **HIMS** (OpenAPI → backend → web): legacy **screenshots and API samples** are used only to fill **§N.A parity tables**, not as the contract. Use with **Plan mode**, QA, or an agent.

**Status:** Living checklist — update when OpenAPI, routes, or product scope changes. **§1 Units** and **§2 Unit conversions:** complete (HIMS UI + API verified). **§3 Vitals:** partial — parity table + create form alignment done; product gaps and full E1–E5 verify remain.

**Related (read first):**

| Doc | Role |
|-----|------|
| [visitpad-master-implementation-plan.md](./visitpad-master-implementation-plan.md) | Build order, waves, payload ↔ UI matrix |
| [../architecture/lld/master-data/01-catalog-dual-schema.md](../architecture/lld/master-data/01-catalog-dual-schema.md) | `public` vs `tenant_master`, `iq_tenant_id` (numeric only when sent) |
| [../architecture/lld/master-data/03-visitpad-master.md](../architecture/lld/master-data/03-visitpad-master.md) | Ownership, path conventions, Python layout |
| `specs/openapi/master-data.v1.yaml` | Normative HTTP contract (paths, schemas, status codes) |
| `modules/master-data/tests/` | Automated regression |

---

## How to use this document

1. Complete **§0 Prerequisites** once per environment.
2. Execute **§1–§11** in order (unit conversions depend on units).
3. For each section, complete **§N.A** (parity) then the **Must match** / **Verify** lists; note drift in PRs.
4. Use **Add** / **Delete** as backlog: items to implement or remove after sign-off with product.
5. Check every **Verify** box before calling that section “done”.
6. Finish **§12 Cross-cutting** before release.

**Convention:** API base path is `/api/v1/master-data`. List responses use the `{ data, total }` pattern unless OpenAPI says otherwise.

---

## End-to-end parity methodology (every module)

**Goal:** Everything visible in **legacy screenshots** and **old API samples** is either **represented in HIMS** (same behaviour under snake_case + richer model) or **explicitly rejected** (documented in §N.A as dropped / gap). End-to-end verification is how we prove that, **module by module**, before moving on.

**Normative order (HIMS wins conflicts):**

1. **`specs/openapi/master-data.v1.yaml`** — paths, schemas, enums, status codes.  
2. **`modules/master-data/app/schemas/visitpad_*.py`** — `*Response`, `*Create`, `*Update`.  
3. **ORM + Alembic** under `modules/master-data/`.  
4. **Web** — `services/web/src/features/visitpad/types.ts`, `validation.ts`, `routes/_authenticated/visitpad/*.tsx`.

**Reference material (non-normative):** prior IQSandbox/Mongo JSON (camelCase), screenshots, CSVs. Use only to build the **mapping tables** in each **§N.A**; do not treat legacy field names as the contract.

**For each §1–§11, the owner must:**

| Step | Deliverable |
|------|-------------|
| **E1** | Capture one **HIMS GET** list item JSON (Network) after seed / create. |
| **E2** | List every field on the Pydantic `*Response` model; confirm JSON includes each (or documented omission). |
| **E3** | List every field on `*Create`; confirm **Add** / **Create** UI sends the same set (or notes server defaults). |
| **E4** | If legacy sample exists: extend §N.A table (legacy → HIMS); tag **HIMS-only**, **legacy-only (drop)**, **gap (needs product)**. |
| **E5** | Run section **Verify** + [implementation plan §6 screenshot checklist](./visitpad-master-implementation-plan.md#6-screenshot-checklist-acceptance-mapping) for that tab. |

**Global naming rules**

| Topic | HIMS rule |
|-------|-----------|
| JSON property names | **snake_case** in API responses and request bodies used by the web app. |
| Identifiers | **UUID** `id` string in JSON — not Mongo `_id` / duplicate `id`. |
| Mongo / Mongoose | **Do not** add `__v`, `discriminator`, or parallel `_id` to HIMS JSON. |
| Audit users | `created_by` / `updated_by` **only** where columns + OpenAPI + UI exist (units today: optional gap — see §1.A). |
| Tenant | `iq_tenant_id`: **`null`** for global `public` rows; **integer** when `tenant_master` scope; never send slug as `iq_tenant_id` (see dual-schema LLD). |

### Master map — normative files per Visitpad section

| § | UI route (web) | HTTP prefix (under `/api/v1/master-data`) | Pydantic module (`app/schemas/`) | Primary web route file | E2E status |
|---|----------------|-----------------------------------------------|-----------------------------------|-------------------------|------------|
| 1 | `/visitpad/units` | `/visitpad/units` | `visitpad_unit.py` (`VisitpadUnit*`) | `visitpad/units.tsx` | **Done** (HIMS UI + API) |
| 2 | `/visitpad/conversions` | `/visitpad/unit-conversions` | `visitpad_unit.py` (`VisitpadUnitConversion*`) | `visitpad/conversions.tsx` | **Done** (HIMS UI + API) |
| 3 | `/visitpad/vitals` | `/visitpad/vitals` | `visitpad_vital.py` | `visitpad/vitals.tsx` | **Partial** — §3.A parity + Add form aligned to `VisitpadVitalCreate`; legacy-only gaps documented (paediatric criticals, `display_label`, category taxonomy). Full **Verify** checklist still QA-owned. |
| 4 | `/visitpad/chief-complaints` | `/visitpad/chief-complaints` | `visitpad_chief_complaint.py` | `visitpad/chief-complaints.tsx` | Pending |
| 5 | `/visitpad/diagnoses` | `/visitpad/diagnoses` | `visitpad_diagnosis.py` | `visitpad/diagnoses.tsx` | Pending |
| 6 | `/visitpad/allergens` | `/visitpad/allergens` | `visitpad_allergen.py` (`VisitpadAllergen*`) | `visitpad/allergens.tsx` | Pending |
| 7 | `/visitpad/reactions` | `/visitpad/allergy-reactions` | `visitpad_allergen.py` (`VisitpadAllergyReaction*`) | `visitpad/reactions.tsx` | Pending |
| 8 | `/visitpad/rx-columns` | `/visitpad/rx-columns` | `visitpad_rx_column.py` | `visitpad/rx-columns.tsx` | **Done** — §8.A legacy `rxcolumns` map + create code 2–8 / immutable on PATCH; add modal matches medication-type style. |
| 9 | `/visitpad/medicines` | `/visitpad/medicines` | `visitpad_medicine.py` | `visitpad/medicines.tsx` | **Partial** — §9.A add/edit form + legacy field map; code 3–8 immutable on PATCH. Full **Verify** checklist still QA-owned. |
| 10 | `/visitpad/chronic-illness` | `/visitpad/chronic-illnesses` | `visitpad_chronic_illness.py` | `visitpad/chronic-illness.tsx` | **Partial** — §10.A legacy map; UI code + prompt + categories; API `icd10_code` = legacy code (3–8). |
| 11 | `/visitpad/procedures` | `/visitpad/procedures` | `visitpad_procedure.py` | `visitpad/procedures.tsx` | **Partial** — §11.A legacy map; `cpt_code` = catalog code (3–8); `short_name`; immutable code on PATCH. |

Shared: `features/visitpad/validation.ts` (Zod), `features/visitpad/types.ts` (TypeScript row shapes), `features/visitpad/api/catalog.ts` (list hooks).

---

## 0. Prerequisites (all sections)

| # | Check | Owner |
|---|--------|--------|
| 0.1 | Database: `uv run alembic upgrade head` (from `modules/master-data`) against target DB | DevOps / dev |
| 0.2 | Master-data service healthy (`nx run master-data:serve` or deployed URL) | Dev |
| 0.3 | Web `VITE_API_BASE_URL` points to API that proxies `/api/v1/master-data` | Dev |
| 0.4 | Test user can open **Visitpad templates** (permissions / route gate) | QA |
| 0.5 | **Global catalog:** tenant store uses non-numeric slug (e.g. `tenant-001`) → `iq_tenant_id` **not** sent → reads **`public`** seed data | QA |
| 0.6 | **Tenant catalog (optional):** numeric tenant only (e.g. `1`) if testing `tenant_master` rows | QA |
| 0.7 | `uv run pytest` in `modules/master-data` passes on current branch | Dev |

---

## Per-section template (what each block means)

| Block | Meaning |
|-------|--------|
| **Must match** | OpenAPI + LLD + agreed UI; if implementation differs, either fix code or update spec with explicit ADR/note. |
| **Add** | Known gaps: fields, filters, tests, docs, Cerbos, empty states. |
| **Delete / stop** | Remove dead code, wrong assumptions, or deprecated shapes after migration. |
| **Verify** | Repeatable E2E steps (browser + Network tab, or `curl`/HTTP client). |
| **Exit criteria** | Minimum bar to move to the next section. |

---

## 1. Units

| | |
|--|--|
| **UI route** | `/visitpad/units` |
| **API** | `GET/POST /api/v1/master-data/visitpad/units`, `GET/PATCH/DELETE …/visitpad/units/{unit_id}` |
| **OpenAPI** | Tags like `Visitpad — Units`; list + create/update schemas |
| **Web implementation** | `services/web/src/routes/_authenticated/visitpad/units.tsx`, `features/visitpad/validation.ts`, `features/visitpad/types.ts` |

**Verification status (HIMS):** **Complete.** Signed off using **HIMS Visitpad Units UI** and **Network** responses (`GET/POST/PATCH/DELETE` under `/api/v1/master-data/visitpad/units`). §1.A legacy mapping reviewed; **Must match**, **Verify**, and **Delete / stop** below are satisfied. Items under **Add** remain **optional backlog** (Playwright, Cerbos, empty-state copy polish, optional `created_by`/`updated_by` parity) unless product promotes them.

### §1.B HIMS sign-off checklist (E1–E5)

| Step | Evidence | Done |
|------|----------|------|
| **E1** | HIMS `GET …/units` sample row JSON captured from Network (snake_case, `id`, `iq_tenant_id`, timestamps) | [x] |
| **E2** | `VisitpadUnitResponse` fields present in JSON (or null rules documented) | [x] |
| **E3** | “Add unit” posts all `VisitpadUnitCreate` fields (optional `ucum_code` empty → null) | [x] |
| **E4** | §1.A legacy ↔ HIMS table complete | [x] |
| **E5** | List / create / edit / enable / delete exercised in UI against API | [x] |

### §1.A Reference parity — legacy “unit” JSON (IQSandbox / Mongo) vs HIMS

Use this when migrating expectations from screenshots or old APIs. **Normative contract for HIMS** is OpenAPI + Pydantic (`VisitpadUnitResponse`, `VisitpadUnitCreate`); the legacy row is **non-normative**.

| Legacy field (camelCase) | HIMS list/detail field (snake_case) | Create form (`POST` body) | Notes |
|--------------------------|-------------------------------------|----------------------------|--------|
| `code` | `code` | Yes | HIMS: trim + lowercase on write; length **1–64** (not legacy “3–9 chars” UI copy unless product re-imposes). |
| `displayLabel` | `display_label` | Yes | |
| `displayOrder` | `display_order` | Yes | |
| `dimension` (e.g. `temperature`) | `dimension` | Yes | Same enum set (`VisitpadUnitDimension` / `VISITPAD_UNIT_DIMENSIONS`). |
| `isActive` | `is_active` | Yes (default true) | |
| — | `ucum_code` | Yes (optional) | **HIMS adds** UCUM for interoperability; legacy sample omitted it. |
| — | `is_canonical` | Yes (default false) | **HIMS adds** canonical flag per dimension; legacy sample omitted it. |
| — | `is_deleted` | No (server soft-delete) | **HIMS adds** soft-delete visibility; legacy often omitted. |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` | N/A (read-only) | ISO-8601 strings in JSON. |
| `id` / `_id` (24-char hex) | `id` (UUID string) | N/A | **Do not** expect `_id`, `__v`, or `discriminator`. |
| `createdBy` / `updatedBy` | *not exposed on units today* | N/A | **Gap vs legacy:** audit user ids are **not** on `units` table in HIMS. Add only if product + migration + OpenAPI agree (otherwise track at gateway logs). |
| — | `iq_tenant_id` | N/A | **null** in `public` global rows; integer when row served from `tenant_master`. |

**Deliberately do not add to HIMS unit JSON:** `_id`, `__v`, `discriminator`, Mongo-style duplicates, or camelCase property names in API responses (clients may camelCase only if a separate codegen layer exists; web uses snake_case to match API).

**Add form vs `VisitpadUnitCreate` (all keys accounted):**

| `VisitpadUnitCreate` field | On “Add unit” UI |
|----------------------------|------------------|
| `code` | Yes |
| `display_label` | Yes |
| `dimension` | Yes |
| `ucum_code` | Yes (optional) |
| `is_canonical` | Yes |
| `display_order` | Yes |
| `is_active` | Yes |

No extra create keys are sent; nothing required by API is missing from the dialog.

**Must match**

- [x] Field names and enums (dimension, `code`, `display_label`, `is_canonical`, `display_order`, `is_active`, `is_deleted`) align with OpenAPI components; JSON uses **snake_case** as in `VisitpadUnitResponse`.
- [x] Unique natural key for active rows matches spec (global: code uniqueness in `public`).
- [x] PATCH semantics: partial update; errors use consistent `detail` shape.

**Add** (backlog — tick when done)

- [ ] Optional: `created_by` / `updated_by` on units (DB + migration + OpenAPI + UI) **only** if product requires parity with legacy audit columns in §1.A.
- [ ] Playwright or documented manual script for create → list → patch → soft-delete flow.
- [ ] Empty state + error state copy aligned with product.
- [ ] Cerbos resource IDs documented when policies exist.

**Delete / stop**

- [x] Remove any duplicate unit table abstractions or old BFF paths if found during audit.
- [x] Stop treating **global** `public` unit rows as if they carried a tenant UUID; global responses use **`iq_tenant_id`: `null`** (omit the `iq_tenant_id` header for `public`; see dual-schema LLD).

**Verify (E2E)**

- [x] **List:** GET returns 200; `total` consistent with visible non-deleted rows.
- [x] **Create:** POST minimal valid body → 201; row appears in list.
- [x] **Duplicate:** second active row with same `code` (case rules per spec) → 409 or documented code.
- [x] **Patch:** change `is_active` / `display_label` → 200; invalid body → 422/400 per spec.
- [x] **Delete:** soft-delete → row hidden from default list; GET by id behaviour per spec (404 or include_deleted).
- [x] **UI:** table columns, search, dimension filter, Add dialog validation mirror API.

**Exit criteria:** **Met for §1** — Verify + Must match satisfied vs OpenAPI and HIMS UI/API evidence; optional **Add** items remain.

---

## 2. Unit conversions

| | |
|--|--|
| **UI route** | `/visitpad/conversions` |
| **API** | `GET/POST …/visitpad/unit-conversions`, `GET/PATCH/DELETE …/visitpad/unit-conversions/{id}` |
| **Depends on** | §1 — `from_unit_code` / `to_unit_code` must reference **active** units in the same catalog scope (`_ensure_conversion_pair_valid` in `visitpad_units_service.py`). |
| **Web implementation** | `services/web/src/routes/_authenticated/visitpad/conversions.tsx`, `features/visitpad/unit-catalog.ts`, `features/visitpad/validation.ts` (`visitpadUnitConversionCreateSchema`, …), `features/visitpad/types.ts` (`VisitpadUnitConversion`) |

**Verification status (HIMS):** **Complete.** Signed off against **Add conversion** / **Edit conversion** UI and **Network** JSON for `…/visitpad/unit-conversions`. From/To use **catalog dropdowns** (`code - display_label`, same line style as legacy Visitpad Masters); **Factor**, **Offset** (`offset_value`), and **Display order** are explicit on create. **Dual schema:** numeric `iq_tenant_id` → row in **`tenant_master.unit_conversions`** with **`iq_tenant_id`** set; no header / non-numeric tenant → **`public.unit_conversions`** and JSON **`iq_tenant_id`: `null`** (response field still present for a stable contract).

### §2.B HIMS sign-off checklist (E1–E5)

| Step | Evidence | Done |
|------|----------|------|
| **E1** | Sample `GET` row: `id`, `iq_tenant_id`, `from_unit_code`, `to_unit_code`, `factor`, `offset_value`, `display_order`, `is_deleted`, `created_at`, `updated_at` (snake_case) | [x] |
| **E2** | Matches `VisitpadUnitConversionResponse` in `visitpad_unit.py` | [x] |
| **E3** | Create dialog → `POST` body keys: `from_unit_code`, `to_unit_code`, `factor`, `offset_value`, `display_order` only (no `iq_tenant_id` in body — scope from header); From/To chosen via **units catalog** dropdowns (`code - label`) | [x] |
| **E4** | §2.A table + legacy `fromUnitId`/`toUnitId` → codes, `offset` → `offset_value` | [x] |
| **E5** | List / create / edit / delete exercised vs API | [x] |

### §2.A HIMS response ↔ Add form ↔ `VisitpadUnitConversionCreate`

| JSON / DB field (`VisitpadUnitConversionResponse`) | Add conversion UI | `POST` body (`VisitpadUnitConversionCreate`) | Notes |
|----------------------------------------------------|-------------------|-----------------------------------------------|--------|
| `id` | — | N/A | Server-generated UUID. |
| `iq_tenant_id` | — *(not a form field)* | N/A | **`null`** for global `public` rows; **integer** when request used numeric `iq_tenant_id` (`tenant_master`). Client does not send this on create. |
| `from_unit_code` | **From unit *** — catalog `Select`, each row `code - display_label` (Visitpad Masters style) | Yes | Values are **codes**; trimmed + lowercased on write. If catalog is empty, fallback text fields. |
| `to_unit_code` | **To unit *** — same pattern | Yes | Same. |
| `factor` | **Factor *** | Yes | UI default **1**; API accepts **0** if submitted (stored as sent). |
| `offset_value` | **Offset *** | Yes | Property name in API is **`offset_value`**, not legacy `offset`. |
| `display_order` | **Display order *** | Yes | Default 0. |
| `is_deleted` | — | N/A | Server sets `false` on create; soft-delete via `DELETE` route. |
| `created_at` / `updated_at` | — | N/A | Read-only timestamps. |

**Legacy Mongo sample (reference only):** `fromUnitId` / `toUnitId` are **unit row IDs** in the old store — **HIMS uses `from_unit_code` / `to_unit_code`** (strings) that must exist on active units in the same catalog scope. **`offset`** in legacy JSON maps to **`offset_value`** in HIMS. Do not send `fromUnitId` / `toUnitId` / `isActive` / `discriminator` / `__v` to HIMS.

**Intentionally absent vs some legacy APIs:** `is_active` on conversions (v1 uses `is_deleted` only), Mongo `_id` / `__v` / `discriminator`, camelCase keys.

**List / table display:** From and To columns show **`code - display_label`** when the unit exists in the loaded units list (non-deleted); otherwise **code** only.

**Must match**

- [x] Conversion formula documented in UI: `value_to = value_from × factor + offset`.
- [x] No `from_unit_code == to_unit_code` for active rows → **400** (`InvalidVisitpadUnitConversionError`).
- [x] Duplicate active `(from,to)` → **409** (unique index).
- [x] Create/update rejects unknown unit codes for the current scope → **400** with clear message.
- [x] Client search and table columns reflect **from/to codes and display labels** when units are loaded.

**Add** (backlog)

- [ ] Integration test: cannot deactivate/delete **unit** while active conversions reference its code (if product requires — check current §1 behaviour).
- [ ] Playwright for conversions tab.

**Delete / stop**

- [x] Do not send or document as normative legacy Mongo conversion payloads (`fromUnitId`, `toUnitId`, `offset` as API property name, `isActive` as conversion row flag) — see **§2.A** legacy paragraph.

**Verify (E2E)**

- [x] **List:** GET 200; `{ data, total }`; rows match scope (`iq_tenant_id` null vs set).
- [x] **Create:** valid pair with existing unit codes → **201**; response shape matches table above.
- [x] **Invalid:** same from/to → **400**.
- [x] **Unknown code:** from or to not an active unit in scope → **400**.
- [x] **Duplicate:** repeat active pair → **409**.
- [x] **Patch / delete:** **200**; tenant isolation on `GET/PATCH/DELETE` when scoped.

**Exit criteria:** **Met for §2** — parity verified for HIMS UI + Network sample; optional **Add** items remain.

---

## 3. Vitals

| | |
|--|--|
| **UI route** | `/visitpad/vitals` |
| **API** | `…/visitpad/vitals` CRUD + list filters (`category`, `search`, pagination) |

**Verification status (HIMS):** **Partial.** §3.A legacy→HIMS mapping is filled below. **Add vital** / **Edit vital** use the Visitpad **units** catalog for **default unit code** (`Select` with `display_label (code)`), with **unit label** prefilled and editable. Other optional fields (LOINC, SNOMED, ranges, `allowed_units`, pair target, etc.) as before. Remaining gaps are **legacy-only fields** with no first-class column (see table) or QA sign-off on the **Verify** matrix.

### §3.A Legacy sample → HIMS (reference only)

**Normative:** `VisitpadVitalResponse`, `VisitpadVitalCreate`, `VisitpadVitalUpdate` in `modules/master-data/app/schemas/visitpad_vital.py`. **ORM:** `app/models/visitpad_vital.py`. **Web:** `vitals.tsx`, `validation.ts` (`visitpadVitalCreateSchema`, `visitpadVitalEditFormSchema`).

| Legacy (Mongo / Visitpad-style JSON) | HIMS (OpenAPI / DB) | Tag |
|--------------------------------------|---------------------|-----|
| `code` | `code` | Match |
| `displayName` | `name` | Match |
| `shortName` | `short_name` | Match |
| `displayOrder` | `display_order` | Match |
| `displayLabel` (e.g. “Pulse”) | — | **Gap (product)** — no dedicated field; legacy UI used alongside `displayName`. Options: add column, or encode under `reference_json` by convention. |
| `category` (e.g. `cardiovascular`) | `category` (`vital_signs` \| `anthropometric` \| …) | **Map** — enums differ; map legacy clinical group to closest HIMS category or extend enum via spec ADR. |
| `dataType` | `data_type` | Match |
| `defaultUnit` (legacy unit dropdown) | `default_unit_code` + `unit` (label) | Match — **Add/Edit** use active Visitpad units list: `Select` shows `display_label (code)`; choosing a row sets code and prefills `unit` (overridable). |
| `allowedAlternateUnits` | `allowed_units` | Match — create form: comma/space separated codes (must exist as units in scope). |
| `extraAllowedTokens` | `reference_json` (optional convention) | **Map / defer** — no dedicated column; carry in JSON if product needs tokens. |
| `inputMethod` | `input_method` | Match |
| `pairedCapture` | `is_paired` | Match |
| partner vital (UI) | `pair_code` | Match — required when `is_paired` (Zod + UI). |
| `snomedCode` + `snomedObservableEntity` | `snomed_observable_code` | **Merge** — single HIMS field; prefer concept id; text-only legacy text has no separate column. |
| `loincCode` | `loinc_code` | Match — ignore duplicate typo key `lonicCode` in legacy payloads. |
| `referenceShape` (e.g. `range_min_max`) | `reference_kind` + optional `reference_json` | **Map** — HIMS uses closed `reference_kind`; shape detail belongs in `reference_json` if needed. |
| `normalRangeMin` / `Max` | `normal_range_adult` (`{ "min", "max" }`) | Match |
| `pediatricNormalRangeMin` / `Max` | `normal_range_paediatric` | Match |
| `criticalLowValue` / `criticalHighValue` | `critical_low` / `critical_high` | Match |
| `pediatricCriticalLowValue` / `High` | — | **Gap (product)** — not on ORM today; only adult criticals. Backlog: columns + OpenAPI or encode in `reference_json`. |
| `appliesUpToAgeYears` | — | **Gap / JSON** — not a column; optional `reference_json` convention or future column. |
| `isActive` | `is_active` | Match |
| `_id`, `__v`, `discriminator`, duplicate `id` | — | **Drop** — HIMS uses UUID `id` only. |

| Check | Done |
|-------|------|
| Legacy → HIMS mapping (table above) | [x] |
| Rich JSON fields (`reference_json`, `normal_range_*`) match OpenAPI `dict` shapes | [x] documented |
| Create form sends all **required** `VisitpadVitalCreate` fields + optional parity fields used in legacy Add flow | [x] |
| Zod: paired vitals require `pair_code` | [x] |
| Default unit: catalog `Select` (`display_label (code)`) from `/visitpad/units`; empty catalog falls back to typed code | [x] |

**Must match**

- [x] Category / data-type / reference-kind / input-method enums match OpenAPI and UI selects.
- [x] Create payload keys are snake_case and align with `VisitpadVitalCreate` (including `allowed_units`, ranges as objects, `pair_code` when paired).
- [x] Default unit code is chosen from the **active** Visitpad units list in UI (legacy-style dropdown); `unit` display string syncs from the selected row unless the user overrides it.
- [ ] Paediatric-only criticals — **blocked** until product + schema (see §3.A gap row).

**Add** (backlog)

- [ ] Product decision on `display_label` and legacy `category` strings vs HIMS enum.
- [ ] Paediatric critical columns (or documented `reference_json` contract) + OpenAPI + edit/create UI.
- [ ] Playwright / integration tests for vitals list + create + patch + delete.
- [ ] Optional: JSON editor for large `reference_json` if categorical payloads grow.

**Delete / stop**

- [x] Do not reintroduce Mongo keys (`_id`, `__v`, `discriminator`, `lonicCode`) into HIMS APIs.

**Verify (E2E — QA)**

- [ ] **E1** One `GET …/visitpad/vitals` row captured in Network (after seed or create).
- [ ] **E2** Every `VisitpadVitalResponse` field present in JSON or explicitly N/A in §3.A.
- [ ] **E3** `POST` body from **Add vital** matches `VisitpadVitalCreate` (required + chosen optionals).
- [ ] **E4** Legacy row (e.g. heart rate sample) walk-through against §3.A table.
- [ ] **E5** Filters (`category`, `search`), patch, soft-delete, duplicate `code` / validation errors per OpenAPI.

**Exit criteria:** Vitals tab loads without console errors; CRUD round-trip passes; §3.A gaps either implemented or accepted in writing by product.

---

## 4. Chief complaints

| | |
|--|--|
| **UI route** | `/visitpad/chief-complaints` |
| **API** | `…/visitpad/chief-complaints` |

### §4.A Reference parity — chief complaints (fill per wave)

**Normative:** `VisitpadChiefComplaintResponse`, `VisitpadChiefComplaintCreate`, `VisitpadChiefComplaintUpdate` in `visitpad_chief_complaint.py`. **Web:** `chief-complaints.tsx` + Zod.

| Check | Done |
|-------|------|
| Legacy vs HIMS field map (synonyms array, SNOMED, body_system, triage) | [ ] |
| Filters in UI match OpenAPI query params | [ ] |

**Must match**

- [ ] Filters: `body_system`, `triage_priority`, search — query names match OpenAPI.
- [ ] Synonyms / paediatric / SNOMED fields per spec.

**Add**

- [ ] Badge rendering for priority/systems if in design spec.

**Delete / stop**

- [ ] Drop mock rows that are not in seed migration (if product says single source is DB seed).

**Verify**

- [ ] Full CRUD + filter matrix; duplicate `code` behaviour.

**Exit criteria:** Section parity with implementation plan screenshot checklist for chief complaints.

---

## 5. Diagnoses

| | |
|--|--|
| **UI route** | `/visitpad/diagnoses` |
| **API** | `…/visitpad/diagnoses` |

### §5.A Reference parity — diagnoses (fill per wave)

**Normative:** `VisitpadDiagnosisResponse`, `VisitpadDiagnosisCreate`, `VisitpadDiagnosisUpdate` in `visitpad_diagnosis.py`. **Web:** `diagnoses.tsx` + Zod.

| Check | Done |
|-------|------|
| ICD-10 code + `icd_version` + flags vs legacy diagnosis JSON | [ ] |
| Category / notifiable / chronic flags parity | [ ] |

**Must match**

- [ ] ICD-10 code + version uniqueness rules; category flags.
- [ ] Pagination and search contract.

**Add**

- [ ] Import/CSV deferred items explicitly listed in implementation plan if not in scope.

**Delete / stop**

- [ ] Legacy ICD fields if replaced by structured columns (coordinate with migration).

**Verify**

- [ ] CRUD; cross-field validation (e.g. paediatric + triage); list filters.

**Exit criteria:** No 500 on large list; indexes acceptable on dev DB.

---

## 6. Allergens

| | |
|--|--|
| **UI route** | `/visitpad/allergens` |
| **API** | `…/visitpad/allergens` |

### §6.A Reference parity — allergens (fill per wave)

**Normative:** `VisitpadAllergenResponse`, `VisitpadAllergenCreate`, `VisitpadAllergenUpdate` in `visitpad_allergen.py`. **Web:** `allergens.tsx` + Zod.

| Legacy / UI (camelCase) | HIMS API (snake_case) | Notes |
|-------------------------|----------------------|--------|
| `code` | `code` | Create: **3–8** chars `[A-Za-z0-9_]`; immutable after save (omit `code` from PATCH). |
| `displayName` | `display_name` | |
| `allergenType` | `allergen_type` | Enum: `drug`, `food`, `environmental`, `other` (same values as legacy). |
| (optional in legacy list) | `reaction_severity_default` | Defaults to **`unknown`** on create if omitted; always returned on GET. |
| (optional) | `snomed_code` | Nullable; UI label SNOMED CT (substance or organism). |
| — | `drug_class` | Optional; omitted from simple add form; editable on edit (drug rows). |
| `isActive` | `is_active` | |
| — | `display_order` | Default `0` on create; column on list / edit. |

| Check | Done |
|-------|------|
| `allergen_type`, `reaction_severity_default`, `drug_class` vs legacy | [x] |
| Create form vs `VisitpadAllergenCreate` field-for-field | [x] |

**Must match**

- [x] `allergen_type` enum; reaction severity default (`unknown` default); drug class optional rules.

**Add**

- [ ] Cross-links to reactions tab where product requires (documentation only if UI not ready).

**Delete / stop**

- [ ] Consolidate duplicate allergen code paths if split routers during refactor.

**Verify**

- [x] CRUD + type filter; soft-delete semantics.

**Exit criteria:** Allergens tab independent of §7 for list; create uses valid enums only.

---

## 7. Allergy reactions

| | |
|--|--|
| **UI route** | `/visitpad/reactions` |
| **API** | `…/visitpad/allergy-reactions` |

### §7.A Reference parity — allergy reactions (fill per wave)

**Normative:** `VisitpadAllergyReactionResponse`, `VisitpadAllergyReactionCreate`, `VisitpadAllergyReactionUpdate` in `visitpad_allergen.py`. **Web:** `reactions.tsx` + Zod.

| Legacy (camelCase) | HIMS API (snake_case) | Notes |
|--------------------|------------------------|--------|
| `reactionCode` | `code` | Create: **3–8** `[A-Za-z0-9_]`; immutable after save (omit from PATCH). |
| `reactionDisplayName` | `display_name` | |
| `reactionShortName` | `short_name` | Nullable string; optional on create. |
| (often omitted in list) | `snomed_code` | Nullable; SNOMED CT in UI. |
| `isActive` | `is_active` | |
| — | `display_order` | Default `0` on create; editable on edit. |

| Check | Done |
|-------|------|
| Distinct from allergen payload; legacy “reaction” row map | [x] |

**Must match**

- [x] Distinct resource from allergens; code uniqueness for reactions.

**Add**

- [ ] Optional: reaction → allergen association if product adds later (track in implementation plan).

**Delete / stop**

- [ ] Remove combined “allergies” API assumptions if split is normative.

**Verify**

- [x] CRUD; no confusion with allergen IDs in URLs.

**Exit criteria:** Reactions list loads when allergens empty (independent catalog).

---

## 8. Rx columns

| | |
|--|--|
| **UI route** | `/visitpad/rx-columns` |
| **API** | `…/visitpad/rx-columns` |

### §8.A Reference parity — Rx columns (fill per wave)

**Normative:** `VisitpadRxColumnResponse`, `VisitpadRxColumnCreate`, `VisitpadRxColumnUpdate` in `visitpad_rx_column.py`; `VisitpadRxColumnSection` enum. **Web:** `rx-columns.tsx` + Zod.

**Legacy Integrator `rxcolumns` JSON (camelCase) ↔ HIMS**

| Legacy | HIMS API / UI |
|--------|----------------|
| `sectionKey` (e.g. `medication_type`) | `section` query + create body; same enum string |
| `displayName` | `display_name` |
| `code` (2–8, unique per section; immutable after create) | `code` on create only; not in PATCH |
| `isActive` | `is_active` |
| *(not in legacy sample)* | `extra_unit`, `display_order` (optional on edit; create defaults `null` / `0`) |

| Check | Done |
|-------|------|
| `section` + `code` composite vs legacy Rx column JSON | [x] |
| Section list: UI vs OpenAPI enum | [x] |

**Must match**

- [x] Composite key (`section`, `code`) for active rows; section enum or allow-list matches OpenAPI.

**Add**

- [x] Sidebar or section switcher UX per implementation plan if not done.

**Delete / stop**

- [x] Remove hard-coded section lists in UI if OpenAPI provides enum.

**Verify**

- [x] CRUD per section; switching section refetches list.

**Exit criteria:** Rx columns behave correctly for at least two distinct sections.

---

## 9. Medicines

| | |
|--|--|
| **UI route** | `/visitpad/medicines` |
| **API** | `…/visitpad/medicines` |

### §9.A Reference parity — medicines (fill per wave)

**Normative:** `VisitpadMedicineResponse`, `VisitpadMedicineCreate`, `VisitpadMedicineUpdate` in `visitpad_medicine.py` (large schema). **Web:** `medicines.tsx` + Zod + `medicine-create-defaults.ts`.

**Legacy Integrator `medicine` JSON (camelCase) ↔ HIMS (snake_case)**

| Legacy | HIMS |
|--------|------|
| `genericNameInn` | `generic_name` |
| `displayNameOverride` | `display_name` |
| `shortName` | `short_name` |
| `displayOrder` | `display_order` |
| `requiresPrescription` | `requires_prescription` |
| `controlledSubstance` | `is_controlled_substance` |
| `narcoticNdps` | `is_narcotic` |
| `restrictedAntibioticH1` | `is_restricted_antibiotic` |
| `blackBoxWarning` | `black_box_warning` |
| `isActive` | `is_active` |
| `pregnancyCategory` / `lactationSafety` / `pediatricUse` | same keys snake_case |
| *(catalog code in UI)* | `code` (3–8 `[A-Za-z0-9_]`, unique; **not** in PATCH) |

| Check | Done |
|-------|------|
| Full create payload parity (arrays, strengths, routes) | [x] |
| “Golden” sample JSON checked into implementation plan appendix if large | [ ] |

**Must match**

- [x] Large schema: JSON arrays, strengths, routes — OpenAPI is source of truth for required fields.

**Add**

- [ ] Form performance (debounce, split steps) if UX review requires.

**Delete / stop**

- [x] Unused drug-class options not in enum.

**Verify**

- [ ] Create with minimal vs full payload; patch subsets; list + schedule filter.

**Exit criteria:** One “golden” create payload documented in implementation plan Appendix passes UI + API.

---

## 10. Chronic illnesses

| | |
|--|--|
| **UI route** | `/visitpad/chronic-illness` |
| **API** | `…/visitpad/chronic-illnesses` |

### §10.A Reference parity — chronic illnesses (fill per wave)

**Normative:** `VisitpadChronicIllnessResponse`, `VisitpadChronicIllnessCreate`, `VisitpadChronicIllnessUpdate` in `visitpad_chronic_illness.py`. **Web:** `chronic-illness.tsx` + Zod.

**Legacy Integrator `chronic_illness` JSON (camelCase) ↔ HIMS**

| Legacy | HIMS |
|--------|------|
| *(catalog code in UI; not in sparse list sample)* | `icd10_code` (3–8 `[A-Za-z0-9_]`, unique; immutable on PATCH) |
| `displayName` | `display_name` |
| `isActive` | `is_active` |
| `chronicIllnessPrompt` | `chronic_illness_prompt` |
| `category` (when present) | `category` (enum includes autoimmune, endocrine, …) |
| SNOMED column / picker | `snomed_code` |

| Check | Done |
|-------|------|
| ICD + category vs legacy chronic row | [x] — legacy “code” is HIMS `icd10_code`; categories extended to match UI |
| Alignment with §5 diagnoses where fields overlap | [ ] |

**Must match**

- [x] ICD fields and category alignment with diagnoses where shared.

**Add**

- [ ] Cross-reference note in LLD if chronic illness reuses diagnosis validators.

**Delete / stop**

- [x] Display order on add/edit modal (defaults `0` server-side).

**Verify**

- [ ] CRUD + category filter; duplicate ICD handling.

**Exit criteria:** Chronic illness tab matches product counts vs seed.

---

## 11. Procedures

| | |
|--|--|
| **UI route** | `/visitpad/procedures` |
| **API** | `…/visitpad/procedures` |

### §11.A Reference parity — procedures (fill per wave)

**Normative:** `VisitpadProcedureResponse`, `VisitpadProcedureCreate`, `VisitpadProcedureUpdate` in `visitpad_procedure.py`. **Web:** `procedures.tsx` + Zod.

**Legacy Integrator `procedure` JSON (camelCase) ↔ HIMS**

| Legacy | HIMS |
|--------|------|
| `code` (when present) | `cpt_code` (3–8 `[A-Za-z0-9_]`, unique; immutable on PATCH) |
| `shortName` | `short_name` |
| `displayName` | `display_name` |
| `officialDescriptor` | `official_descriptor` |
| `duration` (minutes in UI) | `duration_minutes` |
| `category` | `category` (enum) |
| `billingCategory` | `billing_category` (enum) |
| type / modality | `type_modality` |
| SNOMED picker | `snomed_code` |
| `requiredConsent` | `requires_consent` |
| `isActive` | `is_active` |

| Check | Done |
|-------|------|
| CPT / `billing_category` / modality vs legacy procedure JSON | [x] |
| Filters vs OpenAPI query params | [x] |

**Must match**

- [x] Catalog code natural key; billing category filter names.

**Add**

- [ ] Procedure-specific Cerbos action names when policies land.

**Delete / stop**

- [x] Display order on add/edit modal (defaults `0` server-side).
- [x] Extra list columns vs legacy table (category, billing, SNOMED, modality) hidden from default grid; filters retained.

**Verify**

- [ ] CRUD; category + billing_category filters; duplicate code behaviour.

**Exit criteria:** Full Visitpad tab bar navigable without 4xx from header/catalog scope for global dev tenant.

---

## 12. Cross-cutting (after §1–§11)

| # | Item | Verify |
|---|------|--------|
| 12.1 | **OpenAPI drift:** run contract review — every Visitpad path in `master-data.v1.yaml` has a handler and vice versa | Architect / dev |
| 12.2 | **Dual schema:** global requests omit numeric `iq_tenant_id`; tenant requests use digits only; empty `tenant_master` returns 200 + `total: 0`, not 400 | QA |
| 12.3 | **Permissions:** UI gates and (when live) Cerbos PDP allow expected roles | QA |
| 12.4 | **Regression:** `uv run pytest` + optional Playwright smoke across all tabs | Dev |
| 12.5 | **Seed data:** documented source (Alembic seed vs manual); reproducible empty DB → migrate → minimal seed | DevOps |
| 12.6 | **Delete tech debt:** remove dead routes, unused types, duplicate `iq_tenant_id` docs in LLD if superseded by `01-catalog-dual-schema.md` | Dev |
| 12.7 | **§N.A parity:** for every §1–§11, mapping tables filled (or explicitly “no legacy sample”) and E1–E5 complete | QA lead |

---

## Agent / Plan mode hints

- Complete **§N.A** (parity) for that section **before** declaring Must match done.
- Paste **one section at a time** (e.g. “Execute §2 only”) to keep diffs reviewable.
- Every code change that touches behaviour must update **OpenAPI in the same PR** (repo rule).
- If **Must match** and code disagree, default to **fix implementation** unless product explicitly changes the contract (then update spec + this doc).

---

## Revision history

| Date | Change |
|------|--------|
| 2026-05-08 | Initial E2E verification plan (sections 1–12). |
| 2026-05-08 | §1.A: Legacy unit JSON vs HIMS form/API parity; `iq_tenant_id` typing note. |
| 2026-05-08 | §2–§11.A stubs; **End-to-end parity methodology** + master file map; §12.7; purpose clarified (HIMS normative). |
| 2026-05-11 | §2 Unit conversions **Complete**: HIMS UI + API parity table, `iq_tenant_id`/dual-schema note, `conversions.tsx` copy; E2E doc + master map. |
| 2026-05-08 | §1 Units marked **Complete**: HIMS UI + API sign-off, §1.B E1–E5, master map **E2E status** column; Must match / Verify / Delete checked. |
