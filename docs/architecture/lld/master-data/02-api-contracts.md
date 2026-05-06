# Master Data — HTTP API contracts (v1)

**Module:** Master Data  
**Companion docs:** [Schema design](./01-schema-design.md) | [ERD](./master-data.erd.json) | [Schema reference](./schema-reference.json)

**Normative machine-readable OpenAPI:** [`specs/openapi/master-data.v1.yaml`](../../../../specs/openapi/master-data.v1.yaml) (repository root). Handlers MUST match this file before merge; extend the YAML when promoting rows from the **Planned** table below.

### Module registry — CRUD and auth

Catalog rows live in PostgreSQL (`master_data.modules`). Operators create, update, and retire modules through the **Master Data HTTP API** (`POST`, `PATCH`, `DELETE`). **`DELETE` is a recursive soft-delete** (`is_deleted = true` on the target and active descendants); there is no hard row removal for normal catalog operations.

- **Reads (`GET /modules`, …):** Return active rows (`is_deleted = false`). OpenAPI marks **`security: []`**; a gateway may still enforce identity.
- **Mutations (`POST` / `PATCH` / `DELETE`):** Phase 0 Python handlers do **not** require `Authorization` at the app layer; OpenAPI uses **`security: []`** on these operations. Production should rely on an **API gateway** (or re-attached FastAPI **`Depends(require_superadmin)`**) before exposing writes. When JWT-based **`require_superadmin`** is enabled, a verified **`sub`** (UUID) fills **`created_by` / `updated_by`**; test-only and dev-bypass paths in **`app/utils/auth_policy.py`** intentionally leave those columns **`NULL`** (no synthetic actor UUIDs). Configure **`MASTER_DATA_JWT_SECRET`** for HS256 verification when JWT validation is on. See [`modules/master-data/.env.example`](../../../../modules/master-data/.env.example) and **`modules/master-data/tests/test_utils/test_auth_policy.py`**.

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
| **Authorization** | Cerbos PDP is authoritative; API returns **403** when the principal is authenticated but not allowed (see [module shape template](../../hld/03-module-shape-template.md)). |
| **List success envelope** | `{ "data": [ ... ], "total": <int> }` where `total` is the count of items in `data` for the current response (same semantics as the existing list endpoint; pagination query params TBD when added). |
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
| `GET` | `/api/v1/master-data/permissions` | List permission definitions | `{ "data": Permission[], "total": int }` |
| `GET` | `/api/v1/master-data/module-permissions` | List module↔permission links | `{ "data": ModulePermission[], "total": int }` |
| `GET` | `/api/v1/master-data/system-roles` | List role templates | `{ "data": SystemRole[], "total": int }` |
| `GET` | `/api/v1/master-data/picklists` | List picklist domains | `{ "data": Picklist[], "total": int }` |
| `GET` | `/api/v1/master-data/picklists/{picklistId}/values` | List values for a picklist | `{ "data": PicklistValue[], "total": int }` |
| `GET` | `/api/v1/master-data/module-config-schemas` | List declared config schemas | `{ "data": ModuleConfigSchema[], "total": int }` (optional `module_id`, `schema_version`) |
| `GET` | `/api/v1/master-data/feature-flags` | List feature flag definitions | `{ "data": FeatureFlag[], "total": int }` |

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

The implemented **`Module`**, **`ModuleCreate`**, and **`ModuleUpdate`** schemas cover CRUD. **`created_by` / `updated_by`** are populated from a verified JWT **`sub`** only when **`require_superadmin`** (or equivalent) is attached and the token carries a UUID subject; otherwise they remain **`NULL`**. When you add the §3.2 resources, extend **`Permission`**, **`ModulePermission`**, etc. in OpenAPI in the same PR as Alembic — especially **`module_permissions.module_id`** → **`modules.id`** (respect soft-delete in joins or document tombstone behavior).

---

## 4. Changelog discipline

| Change | Action |
|--------|--------|
| New route or field | Update `master-data.v1.yaml` first; then implement handler; keep this doc’s §3 tables in sync. |
| Planned → implemented | Move the row from §3.2 to §3.1 with the canonical response name. |
