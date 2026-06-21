# Master Data — module catalog (`master_global.modules`)

This document describes how the **modules** slice is implemented in the Python service and how it maps to architecture artifacts.

## Catalog lifecycle

- **Runtime (Phase 0):** **`POST`**, **`PATCH`**, and **`DELETE`** on `/api/v1/master-data/modules` are **not** gated by this service’s bearer dependency; a gateway may still authenticate. **`DELETE` sets `is_deleted = true`** — no hard SQL delete in application flows. When **`require_superadmin`** is wired back, **`created_by` / `updated_by`** are set only from a verified JWT **`sub`** (UUID); test bypass / dev shared secret / **`auth_disabled`** leave those columns **`NULL`** (see **`app/middleware/auth_policy.py`** and **`tests/test_utils/test_auth_policy.py`**). HS256 verification uses **`MASTER_DATA_JWT_SECRET`** when set — repo root [`.env.example`](../../../.env.example).
- **Bootstrap:** Alembic still creates the table and may **seed** core modules (`001_initial_schema`, …). That complements API-driven catalog management; see [LLD §9](../../../docs/architecture/lld/master-data/01-schema-design.md#9-module-registration-lifecycle).

Cross-cutting HLD: [HLD 02 §4.2 — Owns (platform module registry)](../../../docs/architecture/hld/02-core-modules.md#42-owns).

## Sources of truth

| Artifact | Role |
|----------|------|
| [`schema-reference.json`](../../../docs/architecture/lld/master-data/schema-reference.json) | Column names, constraints, indexes for `modules`. |
| [`01-schema-design.md`](../../../docs/architecture/lld/master-data/01-schema-design.md) | Behavioural notes (tree, slugs, categories, soft delete). |
| [`master-data.v1.yaml`](../../../specs/openapi/master-data.v1.yaml) | Normative HTTP contract — update YAML **before** changing routes or JSON shapes. |
| [`02-api-contracts.md`](../../../docs/architecture/lld/master-data/02-api-contracts.md) | Human-readable API index and error envelope. |

## Migrations

| Revision | Purpose |
|----------|---------|
| `001_initial_schema` | Creates `master_global.modules` with seed rows for core modules. Uses `gen_random_uuid()` defaults (no `uuid-ossp`). |
| `002_extend_modules_catalog` | Adds LLD columns: `parent_id`, `slug`, `description`, `level`, `icon`, `is_active`; FK and indexes; backfills `slug` from `name`. |
| `003_soft_delete_audit` | Adds `is_deleted` (soft delete; default `false`), optional `created_by` / `updated_by`, index on `is_deleted`. |
| `004_partial_unique` | Replaces global unique on `name`/`slug` with **partial unique** indexes (`WHERE NOT is_deleted`) so soft-deleted rows do not block reuse of names/slugs (fresh DBs run 002 full unique first, then this replacement). |
| `005_level_max_10` | Widens `modules.level` check constraint from **4** to **10** for deeper nesting. |
| `006_permissions_catalog` | Creates `permissions` table (action enum, soft-delete/audit columns) with active-slug unique index. |
| `007_system_roles_catalog` | Creates `system_roles` (templates; soft-delete/audit, partial unique on `slug`). |
| `008_module_permissions` | Creates `module_permissions` (FKs to `modules` / `permissions`, partial uniques on `slug` and `(module_id, permission_id)`). |
| `024_visitpad_templates_module_catalog` | Idempotent seed: `visitpad-templates` module + catalog read/write `permissions` + `module_permissions` junction rows (Visitpad templates). |
| `025_visitpad_templates_catalog_manage` | Optional: `visitpad-templates-catalog-manage` (`action` = `manage`) + junction row for coarse superadmin-style Cerbos bindings (does not remove 024 rows). |
| `035_retire_visitpad_templates_catalog` | Soft-deletes legacy `visitpad-templates` L1; re-homes shell permissions on `visitpad-master`; adds `unit-conversions` L3; remaps `configurator.tenant_modules` and UM capability keys. |

All catalog tables are created in the PostgreSQL **`master_global`** schema (`master_tenant` for per-tenant copies). The shared database also holds other modules’ schemas (`configurator`, `empi`, …) and `public.alembic_version` for Alembic.

**Local development:** treat the database as disposable. Drop `master_global` and `master_tenant` (and any stray `public` catalog leftovers), then run `alembic upgrade head` on an empty `hims_dev` — no in-place migration from legacy `public` or `master_data` schemas.

**Run migrations on any machine** (same Alembic chain; only `MASTER_DATA_DATABASE_URL` changes):

1. Install deps once: from repo root, `pnpm nx run master-data:setup`, **or** `cd modules/master-data && uv sync`.
2. Copy the repo root [`.env.example`](../../../.env.example) to `.env` at the repo root and set **`MASTER_DATA_DATABASE_URL`** to your Postgres (Docker in this repo defaults to port **5433** — see [`SETUP.md`](../SETUP.md)).
3. Apply schema:

   **From repository root (recommended):**

   ```bash
   pnpm nx run master-data:migrate
   ```

   **From `modules/master-data` only:**

   ```bash
   cd modules/master-data
   uv run alembic upgrade head
   ```

`migrate` and `serve` Nx targets run `uv sync` first if needed — see `project.json`.

**Workflow:** When you add columns or endpoints (including Swagger-visible changes), read **[SETUP.md](../SETUP.md)** section **§7 — After DB or API changes** — migrate first, then code; **`uvicorn --reload`** does not apply migrations automatically.

Ad-hoc DBA / pgAdmin examples (inspect `modules` / `permissions` / `module_permissions`, optional granular Visitpad slugs, copy `master_global` → `master_tenant`): [`../scripts/visitpad_catalog_and_tenant_examples.sql`](../scripts/visitpad_catalog_and_tenant_examples.sql).

## HTTP endpoints (implemented)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/v1/master-data/modules` | List (`ModuleListResponse`); active rows only. Optional `category` query. |
| `POST` | `/api/v1/master-data/modules` | Create (`ModuleCreate`); **201**; **409** on `name`/`slug` clash among active rows. |
| `GET` | `/api/v1/master-data/modules/by-slug/{slug}` | **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/modules/{moduleId}/submodules` | Direct submodules (`parent_id` = id); **full list, no pagination**; **404** if parent missing or soft-deleted. |
| `GET` | `/api/v1/master-data/modules/{moduleId}` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/modules/{moduleId}` | Partial update (`ModuleUpdate`); may set `is_deleted: false` to restore. |
| `DELETE` | `/api/v1/master-data/modules/{moduleId}` | **Soft-delete (recursive)**; marks target module and active descendants deleted; returns updated parent module. |
| `GET` | `/api/v1/master-data/permissions` | List active permission definitions (`PermissionListResponse`); optional `action` query filter. |
| `POST` | `/api/v1/master-data/permissions` | Create (`PermissionCreate`); **201**; **409** on active slug clash. |
| `GET` | `/api/v1/master-data/permissions/by-slug/{slug}` | **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/permissions/{permissionId}` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/permissions/{permissionId}` | Partial update (`PermissionUpdate`); may set `is_deleted: false` to restore. |
| `DELETE` | `/api/v1/master-data/permissions/{permissionId}` | Soft-delete permission row; returns updated permission. |
| `GET` | `/api/v1/master-data/system-roles` | List (`SystemRoleListResponse`); optional `is_template` query. |
| `POST` | `/api/v1/master-data/system-roles` | Create (`SystemRoleCreate`); **409** on active slug clash. |
| `GET` | `/api/v1/master-data/system-roles/by-slug/{slug}` | **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/system-roles/{systemRoleId}` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/system-roles/{systemRoleId}` | Partial update (`SystemRoleUpdate`). |
| `DELETE` | `/api/v1/master-data/system-roles/{systemRoleId}` | Soft-delete template row. |
| `GET` | `/api/v1/master-data/module-permissions` | List links (`ModulePermissionListResponse`); optional `module_id` / `permission_id` query. |
| `POST` | `/api/v1/master-data/module-permissions` | Create link; **400** if parent module/permission invalid; **409** on slug or pair clash. |
| `GET` | `/api/v1/master-data/module-permissions/by-slug/{slug}` | **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/module-permissions/{modulePermissionId}` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/module-permissions/{modulePermissionId}` | Partial update (`ModulePermissionUpdate`). |
| `DELETE` | `/api/v1/master-data/module-permissions/{modulePermissionId}` | Soft-delete link row. |

Errors use **`ErrorResponse`** (`error.code`, `error.message`). **`tests/test_api/test_modules_crud_integration.py`** exercises full CRUD against SQLite + real repository.

## Relation to other catalog slices

**`module_permissions`:** junction **`modules.id`** ↔ **`permissions.id`** with its own **`slug`** and soft-delete; API validates parents are active before create/update.

**`system_roles`:** templates only — tenant role instances and user assignments live in User Management / Cerbos consumers.

## Tests

```bash
cd modules/master-data
uv run pytest
```

Repository tests use SQLite in memory with schema translation; API/service tests use fakes where noted.

## Next slices (order)

Per LLD MVP: **permissions** (done) → **module_permissions** (done) → **system_roles** (done) → picklists → config schemas / feature flags — each slice gets Alembic revision(s), OpenAPI updates, handlers, and tests.
