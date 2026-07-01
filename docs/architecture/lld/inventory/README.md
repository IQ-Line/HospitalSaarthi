# Inventory module — source reuse & implementation guide

HospitalSaarthi inventory is built from three reference codebases:

| Source | Path | Role |
|--------|------|------|
| **Schema (done)** | `hims-backend/src/modules/inventory/` | PostgreSQL tables, constraints, RPC names |
| **Server logic** | `hims-backend/src/modules/inventory/` | Validation, services, repositories, routes |
| **UI / client** | `IQSandbox/apps/iqhealth/src/modules/inventory/` | Pages, hooks, zod schemas, field-level UX |

## HospitalSaarthi layout

| Layer | Location | API base |
|-------|----------|----------|
| DB migrations | `modules/inventory/migrations/` | — |
| inventory-svc | `modules/inventory/src/` | `/api/inventory/v1` (BFF → port 3008) |
| Web UI | `services/web/src/features/inventory/` | via BFF |
| Masters (items, stores, …) | `services/web/src/features/inventory-masters/` + `master-data-svc` | `/api/v1/master-data/` |

**Do not** proxy operational inventory to iqhealthserver. All writes go through `inventory-svc`.

Enable live operational APIs in dev: `VITE_INVENTORY_API_ENABLED=true` in `services/web/.env` (defaults on in dev).

---

## Submodule status (sidebar)

| Submodule | Sidebar | API status |
|-----------|---------|------------|
| Dashboard | Yes | Mock |
| Stock | Yes | Mock |
| Indents | Yes | Mock |
| Transfers | Yes | Mock |
| GRN | Yes | **Live** (partial) |
| Masters | Via admin (`inventory-supply-masters`) | Partial |
| Items | Hidden (masters UI) | **Live** (list/create) |
| Adjustments | Hidden | Not started |
| Consume | Hidden | Not started |
| Physical counts | Hidden | Not started |
| Reorder | Hidden | Not started |

---

## Cross-source reuse matrix

Legend: **✓** ported or in use · **◐** partial · **○** not started · **—** N/A in source

### Operational submodules

| Capability | hims-backend schema | hims validation/service | iqhealth UI/schemas | HospitalSaarthi status |
|------------|--------------------|-------------------------|---------------------|------------------------|
| Stores list | `masters/stores/` | `stores.validation.ts`, `stores.service.ts` | `masters/stores/store-validation.ts`, pages | ◐ `GET /stores` live |
| Items CRUD | `items/` | `items.validation.ts`, `items.service.ts` | `masters/items/`, supply attributes | ◐ `GET/POST /items` live |
| GRN | `grn/` | `grn.validation.ts`, `grn.service.ts`, `submit_inventory_grn` RPC | `grn/`, `shared/schemas/grn-schema.ts` | ◐ CRUD + submit; no stock RPC |
| Stock levels | `stock/` | `stock.service.ts`, `stock-status.ts` | `stock/`, `inventory-stock-levels-shared.ts` | ○ mock UI |
| Indents | `indents/` | `indent.validation.ts`, `indent.service.ts` | `indents/indent-draft-validation.ts` | ○ mock UI |
| Transfers | (stock ledger) | via stock service | `shared/schemas/transfer-schema.ts` | ○ mock UI |
| Adjustments | (ledger) | stock paths | `shared/schemas/stock-adjustment-schema.ts` | ○ |
| Consume | — | — | `consume/` | ○ |
| Physical count | — | — | `shared/hooks/use-physical-count.ts` | ○ |
| Reorder alerts | — | — | `shared/hooks/use-reorder-alerts.ts` | ○ |
| Dashboard KPIs | `stock/` aggregates | `stock.service.ts` | dashboard pages | ○ mock |

### Masters (reference data)

| Master | hims-backend | iqhealth | HospitalSaarthi |
|--------|--------------|----------|-----------------|
| Store types | `masters/store-types/` | `masters/store-types/store-types-validation.ts` | master-data-svc |
| Categories | `masters/categories/` | `masters/categories/` | master-data-svc |
| Item types | `masters/item-types/` | `masters/item-types/` | master-data-svc |
| UOMs | `masters/uoms/` | `masters/uoms/` | master-data-svc |
| Manufacturers | `masters/manufacturers/` | `masters/manufacturers/` | master-data visitpad catalog (see Masters) |
| HSN/GST | `masters/hsn-gst/` | `masters/hsn-gst/hsn-gst-validation.ts` | master-data-svc |
| Storage conditions | `masters/storage-conditions/` | `masters/storage-conditions/` | master-data-svc |
| Lookups | `masters/lookups/` | `masters/lookups/` | master-data-svc |

Masters UI: `services/web/src/features/inventory-masters/`. Operational inventory-svc calls masters via `HttpMasterDataGateway`.

### Key RPCs / atomic writes (still needed)

| RPC / operation | hims-backend | HospitalSaarthi |
|-----------------|--------------|-----------------|
| `submit_inventory_grn_as` | Posts stock + ledger on GRN submit | **Missing** — submit only updates GRN header |
| Stock transfer receive | stock service | Not started |
| Indent approve / fulfill | indent service | Not started |
| Adjustment post | stock service | Not started |

Implement as Drizzle transactions or Postgres RPCs in `modules/inventory/migrations/` before production use.

---

## Porting checklist (any submodule)

1. **Schema** — already in `modules/inventory/migrations/` from hims-backend.
2. **OpenAPI** — add paths to `specs/openapi/inventory.v1.yaml` before handlers.
3. **Server** — port `*.validation.ts` + `*.service.ts` into `use-cases/` + `domain/`.
4. **Zod REST** — port `*.schemas.ts` into `rest-handlers/`.
5. **UI** — port iqhealth pages into `services/web/src/features/inventory/components/`; TanStack Router + React Query + `api-client`.
6. **Client validation** — port iqhealth `shared/schemas/*` into `features/inventory/lib/`.
7. **Flag** — wire behind `VITE_INVENTORY_API_ENABLED` until stable (GRN/stores/items default live in dev).

### Validation ownership

| Layer | Source to port | HospitalSaarthi target |
|-------|----------------|------------------------|
| REST shape | hims `*.schemas.ts` | `modules/inventory/src/rest-handlers/*.schemas.ts` |
| Business rules | hims `*.validation.ts` | `modules/inventory/src/domain/*.validation.ts` |
| Use-case orchestration | hims `*.service.ts` | `modules/inventory/src/use-cases/` |
| Form / inline UX | iqhealth `*-validation.ts`, `shared/schemas/` | `services/web/src/features/inventory/lib/` |

Server validation is authoritative; client validation mirrors it for faster feedback.

### File mapping convention

```
hims-backend/src/modules/inventory/<area>/
  *.validation.ts  →  modules/inventory/src/domain/<area>.validation.ts
  *.service.ts     →  modules/inventory/src/use-cases/
  *.repository.ts  →  modules/inventory/src/data-access/
  *.schemas.ts     →  modules/inventory/src/rest-handlers/

IQSandbox/apps/iqhealth/src/modules/inventory/<area>/
  *-validation.ts, shared/schemas/  →  services/web/src/features/inventory/lib/
  pages, hooks                       →  services/web/src/features/inventory/components/, api/
```

---

## GRN (Goods Receipt Note)

| Layer | Status | Location |
|-------|--------|----------|
| Schema | ✓ | `inventory_grns`, `inventory_grn_lines` |
| API | ◐ | CRUD + submit (see below) |
| Server validation | ◐ | `domain/grn.validation.ts`, `use-cases/validate-grn-input.ts`, `rest-handlers/grn.schemas.ts` |
| Stock posting on submit | ○ | hims `submit_inventory_grn_as` not ported |
| Web UI | ◐ | `inventory-grn-logs-page.tsx`, `inventory-grn-form-page.tsx` |
| Client validation | ◐ | `features/inventory/lib/grn-validation.ts` |

**API contract**

```
GET    /api/inventory/v1/grns
POST   /api/inventory/v1/grns
GET    /api/inventory/v1/grns/:grnId
PATCH  /api/inventory/v1/grns/:grnId
PUT    /api/inventory/v1/grns/:grnId/lines
POST   /api/inventory/v1/grns/:grnId/submit
```

**Reuse from IQSandbox**

| File | Reuse |
|------|-------|
| `shared/schemas/grn-schema.ts` | Ported → `lib/grn-validation.ts` |
| `grn/grn-line-validation.ts` | Inline field errors, qty vs requested cap |
| `grn/grn-item-rules.ts` | `itemRequiresBatch` / `itemRequiresExpiry` |
| `grn/grn-domain.ts` | Scope notes (inventory vs pharmacy GRN) |
| `shared/hooks/use-grn-editor.ts` | Draft/save/submit flow |
| `grn/api.ts`, `grn/types.ts` | → `inventory-api-client.ts` + `api-types.ts` |

**Reuse from hims-backend**

| File | Reuse |
|------|-------|
| `grn.validation.ts` | Ported → `domain/grn.validation.ts` |
| `grn.schemas.ts` | Ported → `rest-handlers/grn.schemas.ts` |
| `grn.service.ts` | → use-cases |
| `grn.repository.ts` | Done → `data-access/grn.repo.ts` |
| `submit_inventory_grn` RPC | **Required next** |

**Server rules (ported):** `assertGrnDateNotFuture`, `assertPurchaseManufacturer`, `assertPurchaseHeader` (on submit), `assertLineAgainstItem`, duplicate line guard.

**Client rules (iqhealth):** future date; purchase manufacturer + voucher on submit; `grn_qty` / `purchase_rate` > 0; lot + expiry per item tracking.

**Next steps:** stock RPC on submit; wire client validation into form; `grn-line-validation.ts` blur errors; OpenAPI paths; PR line linking (`pr_line_id`, `requested_qty`).

---

## Stock

| Layer | Status |
|-------|--------|
| Schema | ✓ `inventory_stock`, `inventory_lots`, `inventory_transactions` |
| API | ○ |
| Web UI | ○ mock — `inventory-stock-page.tsx`, `inventory-stock-status.tsx` |

**IQSandbox:** `stock/api.ts`, `inventory-stock-levels-shared.ts`, `inventory-stock-prd-status.ts`, `inventory-stock-export.ts`, `stock-ledger-cross-module.ts`.

**hims-backend:** `stock.service.ts`, `stock.repository.ts`, `stock.schemas.ts`, `stock-status.ts`, `stock-export.ts`.

**Suggested endpoints:** `GET /api/inventory/v1/stock`, `GET /api/inventory/v1/stock/:itemId/lots`.

**Next steps:** Port repository to Drizzle; replace mock in `api/queries.ts`; wire stock detail sheet.

---

## Indents

| Layer | Status |
|-------|--------|
| Schema | ✓ `inventory_indents`, `inventory_indent_lines` |
| API | ○ |
| Web UI | ○ mock — `inventory-indents-page.tsx`, `inventory-indent-form-page.tsx` |

**IQSandbox:** `indent-draft-validation.ts`, `indent-from-stock.ts`, `indent-store-options.ts`, `indent-active-check.ts`, `indent-shared.ts`, `api.ts`.

**hims-backend:** `indent.validation.ts`, `indent.schemas.ts`, `indent.service.ts`, `indent.repository.ts`.

**Suggested endpoints:** `GET/POST /indents`, `PATCH /indents/:id`, `POST .../submit|approve|fulfill`.

**Next steps:** OpenAPI lifecycle; port validation + repository; replace mock fetch.

---

## Transfers

| Layer | Status |
|-------|--------|
| Schema | ✓ transfer tables in inventory migration |
| API | ○ |
| Web UI | ○ mock — `inventory-transfers-page.tsx`, `inventory-transfer-dialog.tsx` |

**IQSandbox:** `shared/schemas/transfer-schema.ts` → `lib/transfer-validation.ts`; `use-inventory-transfers.ts`.

**hims-backend:** stock service ledger paths; `OPEN_TRANSFER_STATUSES` in `stores.validation.ts`.

**Suggested endpoints:** `GET/POST /transfers`, `POST .../dispatch`, `POST .../receive`.

**Next steps:** Locate hims transfer RPCs; implement handlers; fix `fetchInventoryTransfers` mock fallback.

---

## Dashboard

| Layer | Status |
|-------|--------|
| API | ○ |
| Web UI | ○ mock — `inventory-dashboard-page.tsx`, `inventory-kpi-card.tsx` |

KPIs: low stock, open indents, pending GRNs, expiring lots. **Suggested:** `GET /api/inventory/v1/dashboard/summary`.

---

## Masters (stores, lookups, reference data)

Operational inventory depends on **master-data-svc**, not inventory-svc.

| Master | master-data API | inventory-svc | Web UI |
|--------|-----------------|---------------|--------|
| Stores | ◐ | `GET /stores` + `HttpMasterDataGateway` | inventory-masters |
| Manufacturers | ◐ visitpad catalog | GRN via `useManufacturerMasterLookup()` | inventory-supply-masters |
| Item types, categories, UOMs, HSN | ◐ | item create | inventory-masters |
| Store types | ◐ | store operational config | inventory-masters |

**Manufacturers:** Inventory does **not** duplicate a manufacturers table. GRN `manufacturer_id` references the same catalog as **Inventory Supply Masters → Manufacturers**:

```
GET /api/v1/master-data/visitpad/manufacturers
```

Hook: `features/inventory-masters/api/manufacturer-lookup.ts` → `useManufacturerMasterLookup()`.

**IQSandbox:** `store-validation.ts`, `store-types-validation.ts`, `hsn-gst-validation.ts`, item supply attributes, bulk CSV, `masters/*/api.ts`.

**hims-backend:** `stores.validation.ts` (deactivation blockers), `stores.service.ts`, `store-code.ts`, `masters/*/schemas.ts`.

**Store deactivation blockers:** stock on hand, open transfers/indents, pending GRNs, dispensing, counter sales, indent target references.

**Next steps:** Port store deactivation blockers; cross-link master-data OpenAPI.

---

## Items (item master)

| Layer | Status | Location |
|-------|--------|----------|
| Schema | ✓ | `inventory_items`, sequences |
| API | ◐ | `GET/POST /items` |
| Validation | ◐ | `create-item.schema.ts` |
| Web UI | ○ | `inventory-masters` (not operational sidebar) |

**hims rules to port:** medicine ↔ formulary pairing; medicine requires `tracking_mode = lot` + `is_expirable`; `normalizeItemCode`. UI maps `by-batch` / `by-serial` / `no-tracking` → DB `lot` / `serial` / `none`.

**Next steps:** Full `items.validation.ts`; `PATCH /items/:id`; OpenAPI.

---

## Stock adjustments

**Status:** ○ not started (not in sidebar).

**IQSandbox:** `stock-adjustment-schema.ts` — `adjust_up` / `adjust_down` / `write_off`, reason enum, approval threshold.

**hims-backend:** stock service ledger + approval workflow.

---

## Consume

**Status:** ○ not started.

**IQSandbox:** `consume-stock-lots.ts`, `consume-row-utils.ts`. Pharmacy GRN stays separate (see `grn-domain.ts`).

---

## Physical counts

**Status:** ○ not started.

**IQSandbox:** `use-physical-count.ts` → Zustand session store pattern in HospitalSaarthi.

---

## Reorder alerts

**Status:** ○ not started.

**IQSandbox:** `use-reorder-alerts.ts`. **hims-backend:** `stock-status.ts` + `reorder_point` on items. **Suggested:** `GET /api/inventory/v1/reorder-alerts`.
