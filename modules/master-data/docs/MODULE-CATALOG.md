# Master Data — module catalog (`master_data.modules`)

This document describes how the **modules** slice is implemented in the Python service and how it maps to architecture artifacts.

## Catalog lifecycle

- **Runtime (Phase 0):** **`POST`**, **`PATCH`**, and **`DELETE`** on `/api/v1/master-data/modules` are **not** gated by this service’s bearer dependency; a gateway may still authenticate. **`DELETE` sets `is_deleted = true`** — no hard SQL delete in application flows. When **`require_superadmin`** is wired back, **`created_by` / `updated_by`** are set only from a verified JWT **`sub`** (UUID); test bypass / dev shared secret / **`auth_disabled`** leave those columns **`NULL`** (see **`app/utils/auth_policy.py`** and **`tests/test_utils/test_auth_policy.py`**). HS256 verification uses **`MASTER_DATA_JWT_SECRET`** when set — [`.env.example`](../.env.example).
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
| `001_initial_schema` | Creates `master_data.modules` with seed rows for core modules. Uses `gen_random_uuid()` defaults (no `uuid-ossp`). |
| `002_extend_modules_catalog` | Adds LLD columns: `parent_id`, `slug`, `description`, `level`, `icon`, `is_active`; FK and indexes; backfills `slug` from `name`. |
| `003_soft_delete_audit` | Adds `is_deleted` (soft delete; default `false`), optional `created_by` / `updated_by`, index on `is_deleted`. |
| `004_partial_unique` | Replaces global unique on `name`/`slug` with **partial unique** indexes (`WHERE NOT is_deleted`) so soft-deleted rows do not block reuse of names/slugs. |
| `005_level_max_10` | Widens `modules.level` check constraint from **4** to **10** for deeper nesting. |

**Run migrations on any machine** (same Alembic chain; only `MASTER_DATA_DATABASE_URL` changes):

1. Install deps once: from repo root, `pnpm nx run master-data:setup`, **or** `cd modules/master-data && uv sync`.
2. Copy [`../.env.example`](../.env.example) to `../.env` and set **`MASTER_DATA_DATABASE_URL`** to your Postgres (Docker in this repo defaults to port **5433** — see [`SETUP.md`](../SETUP.md)).
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

## HTTP endpoints (implemented)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/v1/master-data/modules` | List (`ModuleListResponse`); active rows only. Optional `category` query. |
| `POST` | `/api/v1/master-data/modules` | Create (`ModuleCreate`); **201**; **409** on `name`/`slug` clash among active rows. |
| `GET` | `/api/v1/master-data/modules/by-slug/{slug}` | **404** if missing or soft-deleted. |
| `GET` | `/api/v1/master-data/modules/{moduleId}` | **404** if missing or soft-deleted. |
| `PATCH` | `/api/v1/master-data/modules/{moduleId}` | Partial update (`ModuleUpdate`); may set `is_deleted: false` to restore. |
| `DELETE` | `/api/v1/master-data/modules/{moduleId}` | **Soft-delete**; returns updated `Module` with `is_deleted: true`. |

Errors use **`ErrorResponse`** (`error.code`, `error.message`). **`tests/test_api/test_modules_crud_integration.py`** exercises full CRUD against SQLite + real repository.

## Relation to the permissions slice (next)

When you implement **`permissions`** and **`module_permissions`**, keep **`module_permissions.module_id`** consistent with **`modules.id`** (intra-schema FK). Filter joins by **`modules.is_deleted`** (and **`is_active`** where relevant) so soft-deleted modules do not surface in admin UIs; align OpenAPI and repositories together.

## Tests

```bash
cd modules/master-data
uv run pytest
```

Repository tests use SQLite in memory with schema translation; API/service tests use fakes where noted.

## Next slices (order)

Per LLD MVP: **permissions** → **module_permissions** → **system_roles** → picklists → config schemas / feature flags — each slice gets Alembic revision(s), OpenAPI updates, handlers, and tests.
