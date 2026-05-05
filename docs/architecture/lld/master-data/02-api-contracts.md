# Master Data — HTTP API contracts (v1)

**Module:** Master Data  
**Companion docs:** [Schema design](./01-schema-design.md) | [ERD](./master-data.erd.json) | [Schema reference](./schema-reference.json)

**Normative machine-readable OpenAPI:** [`specs/openapi/master-data.v1.yaml`](../../../../specs/openapi/master-data.v1.yaml) (repository root). Handlers MUST match this file before merge; extend the YAML when promoting rows from the **Planned** table below.

---

## 1. Standard HTTP contract

| Topic | Rule |
|--------|------|
| **Base path** | `/api/master-data` (no trailing slash on collection paths in this spec). |
| **Versioning** | Path-styled namespace `master-data`; breaking changes require a new OpenAPI file (e.g. `master-data.v2.yaml`) and explicit ADR. |
| **Format** | `Content-Type: application/json; charset=utf-8` for request and response bodies. |
| **Timestamps** | RFC 3339 / ISO-8601 in UTC (e.g. `2026-05-04T12:00:00Z`). |
| **IDs** | UUIDs as lowercase string with hyphens in JSON. |
| **Authentication** | `Authorization: Bearer <JWT>` unless the deployment marks an endpoint as internal-only; 401 if missing/invalid token. |
| **Authorization** | Cerbos PDP is authoritative; API returns **403** when the principal is authenticated but not allowed (see [module shape template](../../hld/03-module-shape-template.md)). |
| **List success envelope** | `{ "data": [ ... ], "total": <int> }` where `total` is the count of items in `data` for the current response (same semantics as the existing list endpoint; pagination query params TBD when added). |
| **Item success** | When a single-resource GET is added, prefer `{ "data": { ... } }` for consistency with list wrapping. |
| **Errors** | JSON body per **§2**; use the appropriate 4xx/5xx status. |
| **Idempotency** | Not required for read-only GET; future mutating endpoints should document `Idempotency-Key` when introduced. |

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
| **401** | Missing/invalid bearer token. |
| **403** | Authenticated but Cerbos (or equivalent) denies the action. |
| **404** | Resource path not found (for future single-resource routes). |
| **500** | Unexpected server failure. |

---

## 3. API index

### 3.1 Implemented (in OpenAPI + service)

| Method | Path | Operation (OpenAPI) | Summary |
|--------|------|---------------------|---------|
| `GET` | `/api/master-data/modules` | `listModules` | List registered platform modules; optional filter by catalog `category`. |

**Success — 200**

Response schema name: **`ModuleListResponse`**.

Structure:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "category": "core | clinical | administrative | support",
      "version": "string",
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
| `GET` | `/api/master-data/modules/{moduleId}` | Get one module by id | `{ "data": Module }` |
| `GET` | `/api/master-data/modules/by-slug/{slug}` | Get one module by slug | `{ "data": Module }` (Module gains `slug`, `description`, … when DB matches ERD) |
| `GET` | `/api/master-data/permissions` | List permission definitions | `{ "data": Permission[], "total": int }` |
| `GET` | `/api/master-data/module-permissions` | List module↔permission links | `{ "data": ModulePermission[], "total": int }` |
| `GET` | `/api/master-data/system-roles` | List role templates | `{ "data": SystemRole[], "total": int }` |
| `GET` | `/api/master-data/picklists` | List picklist domains | `{ "data": Picklist[], "total": int }` |
| `GET` | `/api/master-data/picklists/{picklistId}/values` | List values for a picklist | `{ "data": PicklistValue[], "total": int }` |
| `GET` | `/api/master-data/module-config-schemas` | List declared config schemas | `{ "data": ModuleConfigSchema[], "total": int }` (optional `module_id`, `schema_version`) |
| `GET` | `/api/master-data/feature-flags` | List feature flag definitions | `{ "data": FeatureFlag[], "total": int }` |

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

When the database model gains ERD-only columns (`is_active`, `is_deleted`, audit fields), extend these objects in OpenAPI together with migrations.

---

## 4. Changelog discipline

| Change | Action |
|--------|--------|
| New route or field | Update `master-data.v1.yaml` first; then implement handler; keep this doc’s §3 tables in sync. |
| Planned → implemented | Move the row from §3.2 to §3.1 with the canonical response name. |
