# Master Data — dual schema catalog (`public` vs `tenant_master`)

**ADR:** rationale for choosing dual physical schemas over a nullable `tenant_id` column is recorded in [ADR-0020: dual schema](../../adr/0020-master-data-catalog-dual-schema.md). Catalog tenant key typing is [ADR-0021](../../adr/0021-master-data-catalog-tenant-key-type.md). Visitpad **code package** layout is [04-visitpad-package-layout](./04-visitpad-package-layout.md).

## Purpose

Reference catalog CRUD (platform modules, permissions, system roles, module-permissions junction, Visitpad clinical reference tables) can be stored either:

- **Globally** in PostgreSQL schema **`public`**: one shared catalog, no `iq_tenant_id` column on these tables.
- **Per tenant** in schema **`tenant_master`**: same logical table names, each row includes **`iq_tenant_id`** (UUID tenant key, same name as the HTTP header and `packages/ts-sdk-db` `tenantColumn()`). Foreign keys and partial unique indexes are scoped per tenant.

The API chooses the target schema **per HTTP request** from an optional tenant header (see below). Repositories receive an immutable `CatalogScope` (`iq_tenant_id: UUID | None`) so routing is explicit and safe under concurrent traffic (no mutable request globals).

**Why both schemas exist in migrations:** PostgreSQL needs real tables under `tenant_master` for tenant-scoped rows. That is not the same as “everything writes to tenant_master”. At runtime, **without** `iq_tenant_id`, the service uses **`public` ORM models only** (no `iq_tenant_id` column). **With** `iq_tenant_id`, it uses **`tenant_master` ORM models** and persists `iq_tenant_id` on every insert/update in that schema.

## Implementation map (verified in code)

| Piece | Role |
|-------|------|
| `app/api/deps.py` → `get_catalog_scope` | Reads `iq_tenant_id`; builds `CatalogScope(iq_tenant_id=None)` → global, or `CatalogScope(iq_tenant_id=<int>)` → tenant. |
| `app/catalog/platform_table_models.py` | `module_model(scope)`, `permission_model(scope)`, … return `*TenantModel` if `scope.is_tenant` else `*PublicModel`. |
| `app/catalog/visitpad_table_models.py` | Same pattern for all Visitpad catalog entities. |
| `app/models/*` | Each catalog has **two** mapped classes: `*PublicModel` (`__table_args__` default schema, **no** `iq_tenant_id` field) and `*TenantModel` (`schema="tenant_master"`, **`iq_tenant_id` required**). |
| `app/services/*` | On create, **`iq_tenant_id` is only passed when `repository.scope.is_tenant`** (e.g. `module_service.create_module`, `visitpad_units_service.create_visitpad_unit`). Global creates use `M(**kwargs)` without `iq_tenant_id`. |
| `app/repositories/*` | Tenant scope adds `WHERE iq_tenant_id = :scope` when listing; `get_by_id` rejects wrong tenant. |

Platform tables (`modules`, `permissions`, `system_roles`, `module_permissions`) in **`public`** never had a tenant key column in Alembic `001`–`008`. Tenant copies live only under **`tenant_master`** from revision **`012`** (column historically named `tenant_id` until **`019_tm_iq_tenant_id_col`** renamed it to `iq_tenant_id`).

Visitpad tables in **`public`** historically carried `tenant_id` in revisions **`009`–`010`**. Revision **`011`** creates `tenant_master.<same names>`, copies rows, then **drops `tenant_id` from `public`** so global Visitpad matches the rule above.

## HTTP contract

| Condition | Catalog scope | Persistence |
|-----------|---------------|-------------|
| `iq_tenant_id` absent or blank | Global | `public` tables, no `iq_tenant_id` column |
| Valid canonical UUID string in `iq_tenant_id` (e.g. `550e8400-e29b-41d4-a716-446655440000`) | Tenant | `tenant_master.<table>`, `iq_tenant_id` set on insert |

**Single header:** `iq_tenant_id` — canonical UUID after trim (matches platform `ts-sdk-db` / BFF tenant id). Invalid or non-UUID strings → **400** with a clear message. Omit the header entirely for global catalog.

## Migrations and ordering

Run a **single** Alembic chain (`alembic upgrade head`). Ordering is defined by revision dependencies, not by running two separate commands:

1. **`001`–`010`** — evolve **`public`** only (modules, permissions, Visitpad tables, etc.).
2. **`011_tenant_master_visitpad`** — introduces Visitpad copies under **`tenant_master`**, copies existing rows from `public` where needed, then **reshapes `public`** (e.g. drops `tenant_id` from global Visitpad tables). **Data must be copied before columns are dropped**; therefore this revision intentionally performs `tenant_master` DDL and `INSERT … SELECT` before final `public` alterations.
3. **`012_tm_platform_catalog`** — creates **empty** `tenant_master` tables for platform catalog (`modules`, `permissions`, `system_roles`, `module_permissions`) with integer tenant key column (later renamed **`iq_tenant_id`**). **`public`** is unchanged in this step.
4. **`013_tm_tenant_id_int`** — PostgreSQL only: if `tenant_master` was ever created with UUID tenant key, this revision truncates those catalog tables and alters the column to integer (breaking; re-seed if you had data). Superseded for **new** environments by **`022_tm_iq_tenant_uuid`** which restores UUID typing (see **`022`**).
5. **`019_tm_iq_tenant_id_col`** — renames `tenant_master.*.tenant_id` → **`iq_tenant_id`** on all catalog tables (Visitpad + platform) so the DB column matches the header and API JSON field.
6. **`022_tm_iq_tenant_uuid`** — PostgreSQL only: truncates all `tenant_master` catalog rows and alters **`iq_tenant_id`** from integer to **UUID** (aligns with the rest of the platform). Re-seed tenant catalog after upgrade.

So: all **foundational** `public` migrations run first; **dual-schema** migrations run later in a **data-safe** order (never drop `public` tenant columns until tenant copies exist).

## Runtime robustness

- `CatalogScope` is a **frozen dataclass** built per dependency resolution; repositories are **stateless** aside from the injected `Session` and scope.
- Each request uses the **ORM-bound `Session`** from the app’s session factory (pooling is configured in `database` settings). No shared mutable catalog state across requests.
- Tenant filters are applied in SQL (`WHERE iq_tenant_id = :id` for tenant scope) so the database enforces isolation; `get_by_id` also rejects cross-tenant row access if an ID is reused across tenants (defense in depth).

## SQLite / tests

Integration tests attach an in-memory database as **`tenant_master`** so SQLAlchemy can create both schemas. Production uses PostgreSQL only for dual-schema migrations `011`–`013` plus follow-ons such as **`019`** and **`022`**.

## Fresh database (drop and re-run)

If you wipe the database (or drop `public` objects and recreate an empty DB), run **`alembic upgrade head`** once. You will get:

- **`public`**: global catalog tables **without** `iq_tenant_id` on Visitpad (after `011`) and platform tables as before.
- **`tenant_master`**: parallel Visitpad tables (from `011`) and platform catalog tables (from `012`), **each with** `iq_tenant_id` (after **`019`**; integer after `013`).

After upgrade, **omit `iq_tenant_id`** on API calls to read/write global data in **`public`**; **send `iq_tenant_id`** (e.g. `7`) to read/write that tenant’s rows in **`tenant_master`**.

## Related

- OpenAPI: `specs/openapi/master-data.v1.yaml` (info block + optional `iq_tenant_id` on tenant-backed response schemas where applicable).
- Code: `modules/master-data/app/core/catalog_scope.py`, `app/core/catalog_tenant_id.py`, `app/api/deps.py` (`get_catalog_scope`).
