# Master Data — HTTP API contracts (v1)

**Module:** Master Data  
**Companion docs:** [Schema design](./01-schema-design.md) | [ERD](./master-data.erd.json) | [Schema reference](./schema-reference.json) | [Visitpad Master](./03-visitpad-master.md) | [Visitpad packages](./04-visitpad-package-layout.md)

**Normative machine-readable OpenAPI:** [`specs/openapi/master-data.v1.yaml`](../../../../specs/openapi/master-data.v1.yaml) (repository root). Handlers MUST match this file before merge; extend the YAML when promoting rows from the **Planned** table below.

### Module registry — CRUD and auth

Catalog rows live in PostgreSQL (`master_data.modules`). Operators create, update, and retire modules through the **Master Data HTTP API** (`POST`, `PATCH`, `DELETE`). **`DELETE` is a recursive soft-delete** (`is_deleted = true` on the target and active descendants); there is no hard row removal for normal catalog operations.

- **Reads (`GET /modules`, …):** Return active rows (`is_deleted = false`). OpenAPI marks **`security: []`**; a gateway may still enforce identity.
- **Mutations (`POST` / `PATCH` / `DELETE`):** Phase 0 Python handlers do **not** require `Authorization` at the app layer; OpenAPI uses **`security: []`** on these operations. Production should rely on an **API gateway** (or re-attached FastAPI **`Depends(require_superadmin)`**) before exposing writes. When JWT-based **`require_superadmin`** is enabled, a verified **`sub`** (UUID) fills **`created_by` / `updated_by`**; test-only and dev-bypass paths in **`app/middleware/auth_policy.py`** intentionally leave those columns **`NULL`** (no synthetic actor UUIDs). Configure **`MASTER_DATA_JWT_SECRET`** for HS256 verification when JWT validation is on. See [`modules/master-data/.env.example`](../../../../modules/master-data/.env.example) and **`modules/master-data/tests/test_utils/test_auth_policy.py`**.

Initial environments may still **seed** baseline rows via Alembic migrations (see [§9](./01-schema-design.md#9-module-registration-lifecycle)); day-to-day catalog changes are via the API.

---

## 1. Standard HTTP contract

| Topic | Rule |
|--------|------|
| **Base path** | `/api/v1/master-data` (no trailing slash on collection paths in this spec). |
| **Versioning** | URL includes **`/api/v1/master-data`** — major API version `v1` is mandatory on every route; breaking changes ship under **`/api/v2/master-data`** with a new OpenAPI file (e.g. `master-data.v2.yaml`) and explicit ADR. |
| **Format** | `Content-Type: application/json; charset=utf-8` for request and response bodies. |
| **Timestamps** | RFC 3339 / ISO-8601 in UTC (e.g. `2026-05-04T12:00:00Z`). |
| **IDs** | UUIDs as lowercase string with hyphens in JSON. |
| **Authentication** | Module routes use **`security: []`** in OpenAPI (Phase 0). A gateway may add auth; optional service-layer JWT is documented in **`modules/master-data`** (`require_superadmin`, `auth_policy.py`). |
| **Catalog tenant scope** | Optional **`iq_tenant_id`** request header (canonical UUID string, same type as platform `ts-sdk-db` / tenant registry) routes catalog CRUD to **`tenant_master`**; omit for global **`public`** rows. JSON responses use the same name: **`iq_tenant_id`** (UUID string when tenant-scoped, otherwise `null`). See [dual-schema catalog](./01-catalog-dual-schema.md). |
| **Authorization** | Cerbos PDP is authoritative; API returns **403** when the principal is authenticated but not allowed (see [module shape template](../../hld/03-module-shape-template.md)). |
| **List success envelope** | `{ "data": [ ... ], "total": <int> }`. For paginated endpoints, `total` is the full count after filters (before `limit`/`offset`); for unpaginated endpoints, it equals `len(data)`. |
| **Item success** | When a single-resource GET is added, prefer `{ "data": { ... } }` for consistency with list wrapping. |
| **Errors** | JSON body per **§2**; use the appropriate 4xx/5xx status. |
| **Idempotency** | Not required for module GET; optional `Idempotency-Key` may be added later for writes. |

---

## 2. Standard error response body

All error responses that return a body use this shape (defined in OpenAPI as `ErrorResponse`):

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

| Field | Required | Description |
|--------|----------|-------------|
| `error.code` | Yes | Stable machine code (e.g. `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`). |
| `error.message` | Yes | Human-readable summary; avoid leaking sensitive internals in production. |
| `error.details` | No | Optional object (validation fields, trace id key, etc.). |

Typical status mapping:

| HTTP | When |
|------|------|
| **401** | Missing/invalid bearer when a route or gateway enforces JWT. |
| **403** | Authenticated but Cerbos (or equivalent) denies the action. |
| **404** | Resource not found (e.g. unknown module id, or soft-deleted row on GET). |
| **409** | Conflict (e.g. duplicate `name` / `slug` among active modules). |
| **400** | Validation (e.g. invalid `parent_id`, tree depth, cycle). |
| **500** | Unexpected server failure. |

---

## 3. API index

### 3.1 Implemented (in OpenAPI + service)

| Method | Path | Operation (OpenAPI) | Summary |
|--------|------|---------------------|---------|
| `GET` | `/api/v1/master-data/modules` | `listModules` | List active catalog modules (`is_deleted = false`); optional filter by catalog `category`. |
| `POST` | `/api/v1/master-data/modules` | `createModule` | Create module; **201** + `ModuleSingleResponse`; **409** if `name`/`slug` conflicts with another active row. |
| `GET` | `/api/v1/master-data/modules/by-slug/{slug}` | `getModuleBySlug` | Get one module by URL-safe `slug`; **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/modules/{moduleId}/submodules` | `listSubmodules` | Direct submodules (`parent_id = moduleId`); **full list, no pagination**; **200** + `ModuleListResponse`; **404** if parent missing or soft-deleted. |
| `GET` | `/api/v1/master-data/modules/{moduleId}` | `getModuleById` | Get one module by UUID; **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/modules/{moduleId}` | `updateModule` | Partial update; may set `is_deleted: false` to restore. |
| `DELETE` | `/api/v1/master-data/modules/{moduleId}` | `deleteModule` | **Recursive soft-delete** (`is_deleted = true` on target + descendants); **200** returns updated parent `Module`. |
| `GET` | `/api/v1/master-data/permissions` | `listPermissions` | List active permission definitions; optional `action` filter. |
| `POST` | `/api/v1/master-data/permissions` | `createPermission` | Create permission definition; **201**; **409** if active slug already exists. |
| `GET` | `/api/v1/master-data/permissions/by-slug/{slug}` | `getPermissionBySlug` | Get one permission by slug; **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/permissions/{permissionId}` | `getPermissionById` | Get one permission by id; **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/permissions/{permissionId}` | `updatePermission` | Partial update; may set `is_deleted: false` to restore. |
| `DELETE` | `/api/v1/master-data/permissions/{permissionId}` | `deletePermission` | Soft-delete permission (`is_deleted = true`); **200** returns updated row. |
| `GET` | `/api/v1/master-data/system-roles` | `listSystemRoles` | List active system role templates; optional `is_template` filter. |
| `POST` | `/api/v1/master-data/system-roles` | `createSystemRole` | Create role template; **201**; **409** if active slug already exists. |
| `GET` | `/api/v1/master-data/system-roles/by-slug/{slug}` | `getSystemRoleBySlug` | Get one template by slug; **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/system-roles/{systemRoleId}` | `getSystemRoleById` | Get one template by id; **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/system-roles/{systemRoleId}` | `updateSystemRole` | Partial update (`SystemRoleUpdate`); may set `is_deleted: false` to restore. |
| `DELETE` | `/api/v1/master-data/system-roles/{systemRoleId}` | `deleteSystemRole` | Soft-delete template (`is_deleted = true`); **200** returns updated row. |
| `GET` | `/api/v1/master-data/module-permissions` | `listModulePermissions` | List active module↔permission links; optional **`module_id`** / **`permission_id`** filters; paginated via **`limit`**/**`offset`**. |
| `POST` | `/api/v1/master-data/module-permissions` | `createModulePermission` | Create link; **400** if module or permission missing/soft-deleted; **409** on slug or pair clash. |
| `GET` | `/api/v1/master-data/module-permissions/by-slug/{slug}` | `getModulePermissionBySlug` | **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/module-permissions/{modulePermissionId}` | `getModulePermissionById` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/module-permissions/{modulePermissionId}` | `updateModulePermission` | Partial update (`slug` / flags only). To change `module_id` or `permission_id`, delete + create a new link. |
| `DELETE` | `/api/v1/master-data/module-permissions/{modulePermissionId}` | `deleteModulePermission` | Soft-delete link; **200** returns updated row. |
| `GET` | `/api/v1/master-data/visitpad/units` | `listVisitpadUnits` | List Visitpad units (`is_deleted = false`); **`limit`/`offset`**, optional **`search`**, **`dimension`**. |
| `POST` | `/api/v1/master-data/visitpad/units` | `createVisitpadUnit` | Create unit; **201** + `VisitpadUnitSingleResponse`; **409** on duplicate active `code`. |
| `GET` | `/api/v1/master-data/visitpad/units/{unitId}` | `getVisitpadUnitById` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/visitpad/units/{unitId}` | `updateVisitpadUnit` | Partial update (`VisitpadUnitUpdate`). |
| `DELETE` | `/api/v1/master-data/visitpad/units/{unitId}` | `deleteVisitpadUnit` | Soft-delete unit; **200** returns updated row. |
| `GET` | `/api/v1/master-data/visitpad/unit-conversions` | `listVisitpadUnitConversions` | List conversions; filters **`from_unit_code`**, **`search`**. |
| `POST` | `/api/v1/master-data/visitpad/unit-conversions` | `createVisitpadUnitConversion` | **400** if from/to invalid or unknown unit; **409** on duplicate active pair. |
| `GET` | `/api/v1/master-data/visitpad/unit-conversions/{conversionId}` | `getVisitpadUnitConversionById` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/visitpad/unit-conversions/{conversionId}` | `updateVisitpadUnitConversion` | Partial update. |
| `DELETE` | `/api/v1/master-data/visitpad/unit-conversions/{conversionId}` | `deleteVisitpadUnitConversion` | Soft-delete conversion; **200** returns updated row. |
| `GET` | `/api/v1/master-data/visitpad/rx-columns` | *(OpenAPI `operationId`)* | List Rx columns; query **`section`**, **`search`**, pagination. |
| `POST` | `/api/v1/master-data/visitpad/rx-columns` | | **201**; **409** duplicate `(section, code)` among active rows. |
| `GET/PATCH/DELETE` | `/api/v1/master-data/visitpad/rx-columns/{rxColumnId}` | | CRUD + soft-delete. |
| `GET` | `/api/v1/master-data/visitpad/allergens` | | List allergens; filters **`allergen_type`**, **`search`**. |
| `POST` | `/api/v1/master-data/visitpad/allergens` | | **201**; **409** duplicate active **`code`**. |
| `GET/PATCH/DELETE` | `/api/v1/master-data/visitpad/allergens/{allergenId}` | | CRUD + soft-delete. |
| `GET` | `/api/v1/master-data/visitpad/allergy-reactions` | | List reactions; **`search`**. |
| `POST` | `/api/v1/master-data/visitpad/allergy-reactions` | | **201**; **409** duplicate active **`code`**. |
| `GET/PATCH/DELETE` | `/api/v1/master-data/visitpad/allergy-reactions/{reactionId}` | | CRUD + soft-delete. |
| `GET` | `/api/v1/master-data/visitpad/chief-complaints` | | List; filters **`body_system`**, **`triage_priority`**, **`search`**. |
| `POST` … `DELETE` | `/api/v1/master-data/visitpad/chief-complaints/{id}` | | Full CRUD; **409** on duplicate **`code`**. |
| `GET` | `/api/v1/master-data/visitpad/diagnoses` | | List; filter **`category`**, **`search`**. |
| `POST` … `DELETE` | `/api/v1/master-data/visitpad/diagnoses/{id}` | | **409** on duplicate **`(icd10_code, icd_version)`**. |
| `GET` | `/api/v1/master-data/visitpad/chronic-illnesses` | | List; filter **`category`**, **`search`**. |
| `POST` … `DELETE` | `/api/v1/master-data/visitpad/chronic-illnesses/{id}` | | **409** on duplicate **`icd10_code`**. |
| `GET` | `/api/v1/master-data/visitpad/vitals` | | List; filter **`category`**, **`search`**. |
| `POST` … `DELETE` | `/api/v1/master-data/visitpad/vitals/{id}` | | **400** if merged **`critical_low`** \> **`critical_high`**. |
| `GET` | `/api/v1/master-data/visitpad/medicines` | | List; filter **`schedule`**, **`search`**. |
| `POST` … `DELETE` | `/api/v1/master-data/visitpad/medicines/{id}` | | **409** on duplicate **`code`**. |
| `GET` | `/api/v1/master-data/visitpad/procedures` | | List; filters **`category`**, **`billing_category`**, **`search`**. |
| `POST` … `DELETE` | `/api/v1/master-data/visitpad/procedures/{id}` | | **409** on duplicate **`cpt_code`**. |

Single-resource success envelope: **`ModuleSingleResponse`** — `{ "data": Module }` (see OpenAPI `ModuleSingleResponse`).

**Success — 200**

Response schema name: **`ModuleListResponse`**.

Structure:

```json
{
  "data": [
    {
      "id": "uuid",
      "parent_id": "uuid | null",
      "name": "string",
      "slug": "string",
      "description": "string | null",
      "category": "core | clinical | administrative | support",
      "version": "string",
      "level": 1,
      "icon": "string | null",
      "is_active": true,
      "is_deleted": false,
      "created_by": "uuid | null",
      "updated_by": "uuid | null",
      "created_at": "date-time",
      "updated_at": "date-time"
    }
  ],
  "total": 0
}
```

Query parameters:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `category` | `ModuleCategory` enum | No | Filter rows where `modules.category` matches. |

Item shape reference: **`Module`** in OpenAPI.

---

### 3.2 Planned (target v1 catalogue — not yet in OpenAPI)

These align with the MVP tables in [`schema-reference.json`](./schema-reference.json). Add paths and schemas to **`master-data.v1.yaml`** in the same PR as the implementing handler.

| Method | Path (proposal) | Summary | Success response shape (proposal) |
|--------|-----------------|--------|-------------------------------------|
| `GET` | `/api/v1/master-data/picklists` | List picklist domains | `{ "data": Picklist[], "total": int }` |
| `GET` | `/api/v1/master-data/picklists/{picklistId}/values` | List values for a picklist | `{ "data": PicklistValue[], "total": int }` |
| `GET` | `/api/v1/master-data/module-config-schemas` | List declared config schemas | `{ "data": ModuleConfigSchema[], "total": int }` (optional `module_id`, `schema_version`) |
| `GET` | `/api/v1/master-data/feature-flags` | List feature flag definitions | `{ "data": FeatureFlag[], "total": int }` |

### 3.3 Visitpad Master (backend catalog — done; web next)

Canonical design: [03-visitpad-master.md](./03-visitpad-master.md). **All Visitpad catalog HTTP resources** listed in **§3.1** are implemented in **`modules/master-data`**, with persistence in **`public`** (global) and **`tenant_master`** (per-tenant) per request header `iq_tenant_id` — see [01-catalog-dual-schema.md](./01-catalog-dual-schema.md) and Alembic from **`009_visitpad_units`** / **`010_visitpad_catalog`** through **`011`** and later tenant-master revisions (**`022`** for UUID `iq_tenant_id`). Remaining product work: **`services/web/src/features/visitpad`** (shell, tabs, tables, Cerbos policies when ready) per [implementation plan](../../../../docs/plans/visitpad-master-implementation-plan.md) §12.

**Events:** Visitpad catalog mutations **do not publish** domain events today. That is **intentional for Phase 0** — catalog rows are read through Master Data APIs and projected by consumers on demand; if a module needs invalidation or downstream projection later, add an explicit event contract in the same PR as consumers (see module event rules in the monorepo README).

**Pagination:** list endpoints support `limit` / `offset`; the web client currently uses a fixed page size — surface full pagination in UI when catalog size warrants it (see `TODO(visitpad-pagination)` in `services/web/src/features/visitpad/api/catalog.ts`).

**Illustrative JSON types (for §3.2 planning)** — normalize field names to camelCase or snake_case in OpenAPI consistently with existing `Module`; today the Python slice uses snake_case in JSON matching Pydantic.

**`Permission`** (subset):

```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string",
  "action": "create | read | update | delete | manage",
  "description": "string | null",
  "created_at": "date-time",
  "updated_at": "date-time"
}
```

**`ModulePermission`** (subset):

```json
{
  "id": "uuid",
  "slug": "string",
  "module_id": "uuid",
  "permission_id": "uuid",
  "is_default": false,
  "is_active": true,
  "is_deleted": false,
  "created_by": "uuid | null",
  "updated_by": "uuid | null",
  "created_at": "date-time",
  "updated_at": "date-time"
}
```

**`SystemRole`** (subset):

```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string",
  "is_template": true,
  "description": "string | null",
  "is_active": true,
  "is_deleted": false,
  "created_by": "uuid | null",
  "updated_by": "uuid | null",
  "created_at": "date-time",
  "updated_at": "date-time"
}
```

**`Picklist`** (subset):

```json
{
  "id": "uuid",
  "slug": "string",
  "name": "string",
  "code": "string",
  "description": "string | null",
  "is_system": true,
  "is_active": true,
  "created_at": "date-time",
  "updated_at": "date-time"
}
```

**`PicklistValue`** (subset):

```json
{
  "id": "uuid",
  "slug": "string",
  "category_id": "uuid",
  "value": "string",
  "label": "string",
  "description": "string | null",
  "metadata": {},
  "is_active": true,
  "is_default": false,
  "display_order": 0,
  "created_at": "date-time",
  "updated_at": "date-time"
}
```

**`ModuleConfigSchema`** (subset):

```json
{
  "id": "uuid",
  "slug": "string",
  "module_id": "uuid",
  "schema_version": "string",
  "config_schema": {},
  "defaults": {},
  "created_at": "date-time",
  "updated_at": "date-time"
}
```

**`FeatureFlag`** (subset):

```json
{
  "id": "uuid",
  "slug": "string",
  "name": "string",
  "description": "string | null",
  "flag_type": "boolean | percentage | string | json",
  "default_value": {},
  "module_id": "uuid | null",
  "value_schema": {},
  "created_at": "date-time",
  "updated_at": "date-time",
  "created_by": "uuid | null",
  "updated_by": "uuid | null"
}
```

The implemented **`Module`** / **`ModuleCreate`** / **`ModuleUpdate`**, **`Permission`** / **`PermissionCreate`** / **`PermissionUpdate`**, **`SystemRole`** / **`SystemRoleCreate`** / **`SystemRoleUpdate`**, and **`ModulePermission`** / **`ModulePermissionCreate`** / **`ModulePermissionUpdate`** schemas cover current CRUD. **`created_by` / `updated_by`** are populated from a verified JWT **`sub`** only when **`require_superadmin`** (or equivalent) is attached and the token carries a UUID subject; otherwise they remain **`NULL`**. When you add the remaining §3.2 resources, extend OpenAPI in the same PR as Alembic (e.g. **picklists**, **module config schemas**, **feature flags**); keep join tables and foreign keys consistent with soft-delete rules in `schema-reference.json`.

---

## 4. Changelog discipline

| Change | Action |
|--------|--------|
| New route or field | Update `master-data.v1.yaml` first; then implement handler; keep this doc’s §3 tables in sync. |
| Planned → implemented | Move the row from §3.2 (or §3.3) to §3.1 with the canonical response name. |
| Visitpad | Follow [03-visitpad-master.md](./03-visitpad-master.md); add §3.3 rows to §3.1 when shipped. |
