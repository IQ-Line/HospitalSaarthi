# Master Data — Visitpad Master (visit templates catalog)

**Product name:** Visitpad templates / Visitpad Master (admin UI).  
**Implementation owner:** [Master Data service](../../../../modules/master-data) — **same** FastAPI app, **same** OpenAPI file [`specs/openapi/master-data.v1.yaml`](../../../../specs/openapi/master-data.v1.yaml), **same** BFF prefix `/api/v1/master-data` (no extra microservice).

**Companion docs:** [Schema design](./01-schema-design.md) | [HTTP API contracts](./02-api-contracts.md) | [Dual schema catalog](./01-catalog-dual-schema.md) | [Tenant master migration runbook](./05-tenant-master-migration-runbook.md) | [Implementation plan (step-by-step)](../../../../docs/plans/visitpad-master-implementation-plan.md) | [E2E verification (sections 1→end)](../../../../docs/plans/visitpad-master-e2e-verification.md)

---

## 1. Why Visitpad lives in Master Data

- **Operational simplicity:** One Python service, one port (`8010`), one Alembic chain, one OpenAPI contract — matches how operators already run Master Data.
- **Domain fit:** Visitpad rows are **reference catalogs** (same class of data as modules, permissions, picklists), maintained by platform admins. **Global** rows live in schema **`public`** and have **no** `iq_tenant_id` column after migration **`011`**. **Per-tenant** copies live in **`master_tenant`** with **`iq_tenant_id` UUID** on each row (see [dual-schema LLD](./01-catalog-dual-schema.md) and [ADR-0021](../../adr/0021-master-data-catalog-tenant-key-type.md)).
- **Spec-first:** New routes are added to **`master-data.v1.yaml`** in the **same PR** as migrations and handlers (see [02-api-contracts.md §4](./02-api-contracts.md#4-changelog-discipline)).

**Not** a separate `modules/visitpad` service and **not** a second BFF upstream unless an ADR later splits the deployment artifact.

---

## 2. HTTP surface (path convention)

All Visitpad HTTP paths are nested under the existing Master Data base path:

| Prefix | Example |
|--------|---------|
| `/api/v1/master-data/visitpad` | Collection resources for visit templates |

**Proposed resource layout** (exact names must match OpenAPI once authored):

| Resource | Example path | Notes |
|----------|--------------|--------|
| Units | `GET/POST /visitpad/units`, `GET/PATCH/DELETE /visitpad/units/{unitId}` | Paginated list `{ data, total }` |
| Unit conversions | `GET/POST /visitpad/unit-conversions`, `GET/PATCH/DELETE /visitpad/unit-conversions/{id}` | No `is_active` in v1 unless product changes mind |
| Vitals, medicines, … | `/visitpad/vitals`, `/visitpad/medicines`, … | Phased; same list contract |

Use **OpenAPI tags** such as `Visitpad — Units` so generated clients and docs group Visitpad operations separately from `Modules` / `Permissions`.

---

## 3. Database layout

- **Dual physical schemas (current):** Visitpad uses the same pattern as platform master catalog tables (modules, permissions, …). See [01-catalog-dual-schema.md](./01-catalog-dual-schema.md).
  - **`public`:** Global Visitpad tables (`units`, `unit_conversions`, `vitals`, …) **without** an `iq_tenant_id` column after revision **`011_master_tenant_visitpad`** (legacy `tenant_id` was dropped from `public` once rows were copied).
  - **`master_tenant`:** Parallel tables with the same logical names; each row includes **`iq_tenant_id` UUID NOT NULL** for tenant-scoped catalog data.
- **Alembic:** Single history under `modules/master-data/alembic/`. Do not assume “one nullable tenant column on `public`” — that was superseded by the dual-schema design (**ADR-0020**, **ADR-0021**).
- **Conventions:** Align with existing Master Data patterns: `is_deleted` for soft delete where applicable, `is_active` for user-visible enablement (see product matrix in the [visitpad implementation plan](../../../../docs/plans/visitpad-master-implementation-plan.md)), `display_order`, timestamps.

Update [`schema-reference.json`](./schema-reference.json) and [`master-data.erd.json`](./master-data.erd.json) when tables are added.

---

## 4. Frontend (`services/web`)

- **Feature folder:** `services/web/src/features/visitpad/` — routes, TanStack Query hooks, Zod validation, and Visitpad-specific shell/tabs.
- **Reuse:** Shared table/dialog/toggle patterns from [`services/web/src/features/master-data/`](../../../../services/web/src/features/master-data/) (`MasterDataPageShell`, `EntityFormDialog`, `TableActiveToggle`, `mutationErrorMessage`, etc.) — do not fork duplicate “master table” abstractions.
- **Routing:** e.g. `/visitpad` (or under `/master-data/visitpad` if product prefers nesting); keep URL-synced tabs per [frontend LLD](../frontend/01-frontend-structure.md).
- **Permissions:** UI gating via `usePermissionsStore` / `hasModuleAccess` for the chosen module slug (align slug with Cerbos resource naming when policies are added).

---

## 5. Python module layout (mandatory split)

Mirror **`module_service.py` / `modules.py`**, not a single mega-file. Visitpad code is grouped under **`app/services/visitpad/`**, **`app/repositories/visitpad/`**, **`app/schemas/visitpad/`**, **`app/api/v1/visitpad/`**, and **`app/catalog/visitpad/`** (see [04-visitpad-package-layout.md](./04-visitpad-package-layout.md)).

- **One service module per product section** (plain functions), e.g. `app/services/visitpad/units.py` (units + conversions), `vitals.py`, `chief_complaints.py`, `diagnoses.py`, `allergies.py` (allergens + reactions), `rx_columns.py`, `medicines.py`, `chronic_illnesses.py`, `procedures.py`.
- **One HTTP module per section** under `app/api/v1/visitpad/` exporting a `router` with the appropriate `prefix` (e.g. `/visitpad/vitals`).
- **Units** and **Allergies** may pair two URL prefixes in one HTTP module (units + conversions; allergens + reactions); register routers from `app/api/v1/router.py`.
- **Repositories:** one module per table (or aggregate) under `app/repositories/visitpad/`; wire factories through `deps.py`.

Full table: [visitpad implementation plan §11.5](../../../../docs/plans/visitpad-master-implementation-plan.md#115-python-layout--one-domain-per-file-mandatory).

---

## 6. Authorization and Cerbos (outline)

- **Authoritative:** Cerbos PDP (same as rest of platform).
- **Resources:** Prefer a dedicated resource kind or attribute namespace for Visitpad entities (e.g. `visitpad_unit:read`) — exact strings belong in policy YAML and OpenAPI `description` notes; document in the same ADR or policy PR that introduces the routes.

---

## 7. Phasing link

The **step-by-step** delivery order (OpenAPI waves, vertical slices, frontend milestones) lives in the working plan:

[docs/plans/visitpad-master-implementation-plan.md](../../../../docs/plans/visitpad-master-implementation-plan.md)

Keep this LLD file **stable** (invariants and ownership); keep the **plan** file **actionable** (checklists and current wave).
