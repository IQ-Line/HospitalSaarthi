# Visitpad catalog: global (platform) vs tenant scope

> **Purpose:** Explain how Visitpad master-data lists and edits choose **platform (`public`)** vs **tenant** catalogs, how **Import from library** works, and how this design behaves under many tenants and traffic. Intended for engineers extending Visitpad or wiring real auth.
>
> **Prerequisites:** [01-frontend-structure.md](./01-frontend-structure.md) (stores, React Query), [03-permissions-catalog-vs-runtime.md](./03-permissions-catalog-vs-runtime.md) (catalog vs runtime vs SPA map), workspace rule “Frontend auth is UX; backend Cerbos is authoritative”, [catalog scope tests](../../../../modules/master-data/tests/test_api/test_catalog_scope_headers.py) (backend `iq_tenant_id` behavior).

---

## 1. Two catalogs, one API surface

| Catalog | Meaning | Typical data |
|--------|---------|----------------|
| **Platform (global)** | Shared definitions all tenants can copy from | SNOMED-aligned rows, standard units, default picklists |
| **Tenant** | Per–`iq_tenant_id` overlay / extensions | Imported rows, hospital-specific codes, disabled platform rows hidden here |

Same REST paths (for example `GET /api/v1/master-data/visitpad/units`). **Scope is not a different URL**; it is chosen by the **`iq_tenant_id` request header** (when present and valid) on the server. The backend resolves scope (see `get_catalog_scope` in master-data) and returns the appropriate rows.

---

## 2. How the browser decides scope

### 2.1 Active tenant id (`tenant.store`)

After login (today: mock **Dev login** or **Tenant dev login** on `/login`), `useTenantStore` holds:

- `tenantId` — string the app treats as the active tenant key.

### 2.2 When `iq_tenant_id` is sent

`services/web/src/lib/api-client.ts` (`apiClient`) attaches header **`iq_tenant_id`** only when `catalogIqTenantHeaderValue(tenantId)` returns a non-null string.

`services/web/src/lib/catalog-tenant.ts` implements that with a **lexical UUID** check (segments `8-4-4-4-12` hex), aligned with backend `UUID` parsing:

- **UUID-shaped `tenantId`** (including the dev sentinel `00000000-0000-0000-0000-000000000007`) → header is sent → list/create/update/delete hit **tenant** catalog.
- **Slug or non-UUID** (e.g. `tenant-001` on **Dev login**) → header omitted → same routes hit **platform** catalog.

So “global vs tenant” in the UI is a **direct consequence** of whether the session’s `tenantId` is a UUID string.

### 2.3 Write safety (platform catalog)

If the user has a non-UUID `tenantId` but issues a **write** (POST/PATCH/DELETE) to a Visitpad path, `apiClient` **throws** before fetch so edits cannot silently hit the global catalog. Reads still omit the header (global read).

---

## 3. Frontend feature hook: `useVisitpadTenantCatalog`

`services/web/src/features/visitpad/hooks/use-visitpad-tenant-catalog.ts` exposes:

- `tenantCatalog: boolean` — same predicate as “would we send `iq_tenant_id`?”
- `tenantId` — for debugging or future use

Visitpad route pages use this to:

- Switch **page copy** (“Platform …” vs “Tenant … import from library or add local …”).
- Show **Import from library** only when `tenantCatalog === true` (`VisitpadHeaderActions` receives `onImportFromLibrary` only in that case).
- Label actions (“Add unit” vs “Add local unit”).

This is **UX only**. A malicious client could skip headers; **Cerbos + master-data handlers** must enforce authorization for production.

---

## 4. List queries (TanStack Query)

`services/web/src/features/visitpad/api/catalog.ts` uses `apiClient` for normal list hooks (e.g. `useVisitpadUnits`). Each `queryKey` includes **`visitpadCatalogQueryScopeKey()`** (`catalogIqTenantHeaderValue(tenantId) ?? 'global'`) so switching between platform and tenant sessions in the same browser does not reuse the wrong cached list.

Default list requests use a bounded `limit` (see `buildVisitpadCatalogListUrl`); **server-side pagination** is the right lever for very large catalogs under traffic (see TODO in `catalog.ts` and master-data API contracts).

---

## 5. Import from library (tenant only)

### 5.1 Why a second client

`apiClientGlobalCatalogRead` in `api-client.ts` performs **GET without `iq_tenant_id`**, even when the user is in a tenant UUID session. That always reads the **platform library** for the import modal.

Without this, opening “import” while tenant-scoped would request the tenant list again, not the platform seed library.

### 5.2 User flow

1. User has UUID `tenantId` → `tenantCatalog` true.
2. User clicks **Import from library** → modal opens.
3. `useVisitpad*GlobalLibrary(enabled: modalOpen)` runs **only while the modal is open**, reducing background traffic.
4. Modal shows platform rows with **search** (client-side filter over returned page). User finds rows (search by code, label, etc.).
5. Rows already present in the tenant list are disabled via **`importedKeys`** / **`getRowKey`** (stable key per entity: `code`, `from→to` for conversions, `section::code` for Rx columns, ICD-10 for chronic illness, CPT for procedures, etc.).
6. User selects one or many rows → **Import** runs sequential `POST` via `apiClient` (tenant header attached) with bodies built by `visitpad-global-import-payloads.ts` (same shape as create forms).

So today: **select specific rows or multi-select**; there is no separate “import entire platform catalog in one click” button (that would be a product/API decision: batch endpoint, job queue, and Cerbos rules).

### 5.3 Search at global scale

Modal search filters **the current response page** (and global library query uses the same `limit` as lists). For **millions** of platform rows, you need **server-side search** (query params already passed through on many hooks) and **pagination or virtualized infinite scroll** in the modal. The architecture already sends `search` to the API where the list URL supports it; extend the global-library query the same way when you raise limits.

---

## 6. Tenant edit and delete

With UUID `tenantId`, **PATCH** and **DELETE** go through `apiClient` with `iq_tenant_id` set, so the server applies changes to **tenant** rows. Soft-delete patterns stay server-defined.

Users can **edit or remove** tenant-owned or tenant-imported rows without affecting platform rows (unless a future “push to platform” feature exists; it does not today).

---

## 7. Many tenants, traffic, and stability

| Concern | Approach |
|--------|----------|
| **Many tenants** | Each tenant is keyed by `iq_tenant_id` (UUID). Data is partitioned on the server (Citus / tenant column per DB principles). No cross-tenant reads if headers are correct. |
| **Caching** | React Query dedupes identical requests; invalidate or refetch lists after successful import/mutations so UI stays consistent. |
| **Import storms** | Sequential POST in a loop is simple but slow for hundreds of rows; a **batch API** or **worker job** with progress UI scales better. |
| **Large global catalogs** | Prefer **server search + pagination** over shipping 100k rows to the browser. |
| **Correctness under load** | Idempotent keys in the UI reduce double-import mistakes; server should still enforce unique constraints and return 409/conflict as needed. |
| **Authz** | Every mutating request must pass **Cerbos** (and session identity) on the backend; frontend gating is not security. |

---

## 8. Dev login vs tenant dev login (current mock)

| Button on `/login` | `tenantId` | `iq_tenant_id` on Visitpad reads/writes | Import from library |
|--------------------|------------|----------------------------------------|----------------------|
| **Dev login** | `null` (platform operator) | Omitted → **platform** | Hidden |
| **Tenant dev login** | `00000000-0000-0000-0000-000000000007` | Sent → **tenant** for that UUID | Shown |

Production: `tenantId` should come from **better-auth / tenant registry** (real tenant UUID for tenant catalog, or unset/`null` for platform-only operators). A **non-null slug** (e.g. `tenant-001`) without a UUID mapping still triggers the Visitpad **write block** in `apiClient` if someone selects it while attempting catalog writes — avoid that shape for Visitpad editors.

**Dev mock session persistence:** In `import.meta.env.DEV`, auth, tenant, and permissions stores use **Zustand `persist`** with **`sessionStorage`**. `services/web/src/main.tsx` awaits `persist.rehydrate()` before mounting the router so `_authenticated` `beforeLoad` sees a restored session after refresh.

---

## 9. File map (quick reference)

| Area | File(s) |
|------|---------|
| UUID vs slug, dev sentinel | `services/web/src/lib/catalog-tenant.ts`, `catalog-tenant.test.ts` |
| Headers + global read | `services/web/src/lib/api-client.ts` |
| Tenant flag for UI | `services/web/src/features/visitpad/hooks/use-visitpad-tenant-catalog.ts` |
| List + global library hooks | `services/web/src/features/visitpad/api/catalog.ts`, `api/index.ts` |
| Import modal | `services/web/src/features/visitpad/components/import-from-platform-catalog-dialog.tsx` |
| Create bodies from platform rows | `services/web/src/features/visitpad/lib/visitpad-global-import-payloads.ts` |
| Mock login | `services/web/src/routes/login.tsx` |
| Dev session persist + rehydrate | `services/web/src/stores/*.store.ts`, `services/web/src/main.tsx` |

---

## 10. Summary

1. **Scope = `iq_tenant_id` header**, driven by **UUID-shaped `tenantId`** in the tenant store.
2. **Platform lists** when slug / non-UUID; **tenant lists** when UUID.
3. **Import from library** uses a **dedicated GET client without header** to read platform rows, then **POST with header** to copy into the tenant.
4. **Search** in the modal is the primary way to find one row among many; **server pagination** is required for huge catalogs.
5. **Scale and safety** depend on backend partitioning, Cerbos, batch APIs for bulk import, and React Query cache rules—not on the Visitpad pages alone.

When you add “1000 different tenant logins,” each session carries **one** `tenantId` UUID; the app does not mix catalogs unless that value changes or cache keys omit tenant (avoid that).
