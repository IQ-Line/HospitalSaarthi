# Master Data — Schema Design

**Module:** Master Data (core platform module)  
**PostgreSQL schemas:** `master_global` (global catalog) and `master_tenant` (per-tenant catalog); `public` holds Alembic metadata only  
**Related HLD:** [02-core-modules.md §4](../../hld/02-core-modules.md#4-master--tenant-data) | [03-module-shape-template.md §8](../../hld/03-module-shape-template.md#8-configurator-integration)  
**Related ADRs:** [ADR-0002](../../adr/0002-multi-tenant-fragmentable-adoption.md) (Multi-tenant fragmentable adoption) | [ADR-0006](../../adr/0006-four-core-platform-modules.md) (Four core modules) | [ADR-0012](../../adr/0012-multi-tenancy-isolation-strategy.md) (Multi-tenancy isolation)  
**ERD (visual):** [`master-data.erd.json`](./master-data.erd.json) — open in VS Code with ERD Editor extension  
**Schema reference:** [`schema-reference.json`](./schema-reference.json) — full column descriptions, indexes, check constraints, Citus distribution notes  
**HTTP API (v1):** [`02-api-contracts.md`](./02-api-contracts.md) — standard headers/envelopes, endpoint index, response shapes ([OpenAPI](../../../../specs/openapi/master-data.v1.yaml))

**Visitpad Master (visit templates):** Owned by the same Master Data service and database; global catalog tables in **`master_global`** (e.g. `units`, `vitals`, `medicines`). See **[03-visitpad-master.md](./03-visitpad-master.md)** and the [step-by-step implementation plan](../../../../docs/plans/visitpad-master-implementation-plan.md).

**Phasing:** The MVP ships the **platform catalog** (module tree, permission definitions, module–permission links, role templates, `picklist` + `picklist_values`) and the **Configurator contract** (config schemas and feature flag definitions). Catalog change history can be traced via **`created_*` / `updated_*`** columns on each row (and optionally platform observability outside this schema). Healthcare reference data (ICD codes, drug catalogs, LOINC, SNOMED, departments, etc.) is Post-launch — sketched in §16. **Visitpad** catalogs are delivered incrementally on top of the MVP service (same OpenAPI file and Alembic app).

| Phase | What ships |
|-------|-----------|
| **MVP** | **Catalog (reference):** `modules`, `permissions`, `module_permissions`, `system_roles`, `picklist`, `picklist_values`. **Configurator integration (reference):** `module_config_schemas`, `feature_flags`. All MVP tables are Citus reference tables. Lifecycle events carry rich payloads for projections. |
| **MVP+ (incremental)** | **Visitpad Master:** tables in `master_global` / `master_tenant` (e.g. `units`, `unit_conversions`, …) and HTTP routes under `/api/v1/master-data/visitpad/...` per [03-visitpad-master.md](./03-visitpad-master.md). |
| **Post-launch** | Healthcare reference data tables (code systems, codes, code mappings, drug catalogs, department/ward master), tenant override mechanism (two-layer inheritance model per HLD §4.1), FHIR terminology endpoints. |

---

## 1. Two-domain model

Master Data owns two distinct domains with different lifecycles:

| Domain | What | Citus mode | Changes via | Phase |
|--------|------|------------|-------------|-------|
| **Platform catalog + module/feature registry** | Module registry and admin tree; permission and role *definitions*; picklists; config schemas; feature flag definitions | **Reference table** (replicated to all nodes) | Superadmin Master Data API, deployment migrations (seeds), platform operator actions | MVP |
| **Healthcare reference data** | ICD codes, drug catalogs, LOINC, SNOMED, departments, wards, fee schedules | **Reference** (global catalogs) + **Distributed** (tenant overrides) | Platform data team (global), hospital admins (tenant overrides) | Post-launch |

The module and configurator-facing registry were originally part of the Configurator module. The EM and tech lead consolidated “what exists in the platform” under Master Data, reserving the Configurator for per-tenant operational state (enablement, overrides, config values) and the resolution API. See the [Configurator LLD](../configurator/01-schema-design.md) for the rationale.

**Authorization boundary.** Rows in `permissions`, `module_permissions`, and `system_roles` describe the **catalog** (what can be named in policies and onboarding). **Cerbos** remains the runtime PDP; **User Management** owns assignments (which user holds which role, which tenant-scoped grants apply). Master Data does not store per-user permissions.

**Slug on every MVP table.** Each catalog table has a **`slug`** column — URL-safe and **unique within that table** — for stable references in APIs, routing, and events, alongside natural keys (`name`, `code`, composite uniqueness, etc.). Junction rows (`module_permissions`) use a deterministic slug (e.g. derived from module and permission slugs). `picklist` keeps both **`code`** (often uppercase, internal) and **`slug`** (URL-safe).

---

## 2. Module registry and navigation tree (`modules`)

Registry of all deployable modules — 4 core + ~38 feature modules from the AIIMS EOI scope. **Tenants do not create modules.** Platform **superadmins** maintain the catalog via **`POST` / `PATCH` / `DELETE` (soft)** on the Master Data modules API; **`GET`** serves read models for shells and tooling. Migrations may still **seed** baseline rows in fresh environments (see §9).

`parent_id` adds a **bounded hierarchy** (see `level` check in [`schema-reference.json`](./schema-reference.json)) for admin IA and shell navigation: group headers and leaf modules share one table. **`name`** stays the stable identifier for APIs and events; **`slug`** is a URL-safe unique key for routing and external links. **`description`** is optional narrative only. **`category`** (`core` \| `clinical` \| `administrative` \| `support`) groups modules in the **admin catalog** — it is not an access control boundary (Cerbos governs that). **Display labels**, **default routes**, and **which modules are mandatory for every tenant** still come from the shell / Configurator / convention (e.g. known `name`/`slug` sets), not from extra columns on `modules`.

### Design decisions

- **`category` classification.** Used by the admin UI to organize the module list. Not an authorization boundary.
- **`version` tracking.** Semver updated by the module's deployment migration. Post-launch hydration may use this to detect config schema upgrades.
- **`is_active`.** Soft-hide from default navigation without deleting registry rows (which would orphan projections and tenant state).

---

## 3. Permission definitions (`permissions`)

Platform-wide list of permission verbs with **`slug`** (policy-stable) and **`action`** (`create` \| `read` \| `update` \| `delete` \| `manage`). Seeded or extended by migrations and platform ops.

CRUD is exposed under `/api/v1/master-data/permissions` (`GET/POST`) and
`/api/v1/master-data/permissions/{permissionId}` (`GET/PATCH/DELETE`) with soft-delete semantics.

---

## 4. Module–permission mapping (`module_permissions`)

Join table: which **`permissions`** apply to which **`modules`**. Each row has its own **`slug`** (unique among active rows, partial index) for stable external references. **`(module_id, permission_id)`** is unique among active rows so each pair appears at most once while not soft-deleted. **`is_default`** hints suggested defaults when provisioning tenant role templates; it does not grant access by itself.

HTTP CRUD is under **`/api/v1/master-data/module-permissions`** (see OpenAPI). **`module_id`** / **`permission_id`** must reference **non-deleted** **`modules`** and **`permissions`** rows; writes validate this before insert/update (**400** when invalid).

---

## 5. Role templates (`system_roles`)

Named role **templates** (e.g. Ward Clerk). **`is_template`** distinguishes catalog rows from instantiated roles elsewhere. Real membership and Cerbos principal attributes live outside this catalog (User Management / Cerbos).

Catalog CRUD is exposed under **`/api/v1/master-data/system-roles`** (see OpenAPI and [`02-api-contracts.md`](./02-api-contracts.md)); **`slug`** is unique among active rows (partial unique index), matching the **`permissions`** pattern.

---

## 6. Two-table picklists (`picklist`, `picklist_values`)

**`picklist`** holds domain headers (display **`name`**, stable **`code`**, URL-safe **`slug`**). **`picklist_values`** rows reference **`picklist.id`** via **`category_id`**. The stored enumeration key remains **`value`**; **`label`** is default UI text; **`metadata`** JSONB can carry icons or Post-launch coding metadata. Large clinical code systems remain in §16 (Post-launch).

---

## 7. Config schema declarations (`module_config_schemas`)

Each module declares a JSON Schema describing its configurable parameters — types, defaults, constraints, UI hints. The Configurator reads these schemas to render admin UI forms and validate tenant config values. Each row has a **`slug`** unique across the table (e.g. encoding module + schema version).

### Design decisions

- **One schema per module per version.** The `(module_id, schema_version)` unique constraint ensures coexistence of v1.0.0 and v1.1.0. The Configurator's runtime hydration (Post-launch) merges the latest schema's defaults with stored tenant values.
- **`defaults` JSONB.** Default values when a tenant has no explicit config — the "zero-config works" principle.
- **`config_schema` JSONB.** JSON Schema (draft-07 or later). The Configurator validates `tenant_module_configs.config_values` against this schema before saving.
- **No `created_by` / `updated_by`.** Declared by module deployments (code). Audit of "who deployed" belongs in CI/CD.

---

## 8. Feature flag definitions (`feature_flags`)

Platform-wide feature flag definitions with defaults. Tenant-specific overrides are stored in the Configurator's `tenant_feature_flags` table. Each flag row has a **`slug`** (URL-safe, unique) in addition to **`name`**.

### Design decisions

- **Flag types.** `boolean`, `percentage`, `string`, `json`. The type determines how the Configurator validates and applies overrides.
- **`module_id` is nullable.** `NULL` = platform-wide flag. Non-null = flag scoped to a module (Configurator resolution may ignore when the module is disabled).
- **`value_schema` for JSON flags (Post-launch).** When `flag_type = 'json'`, optional JSON Schema for override validation. Column ships in MVP (nullable).
- **`default_value` JSONB.** Platform-wide default when no tenant override exists.

---

## 9. Module registration lifecycle

The **authoritative day-to-day path** is the **Master Data modules API**: a platform **superadmin** creates and edits rows in `public.modules` (`POST` / `PATCH`). **Removal** is **`is_deleted = true`** via **`DELETE`** (soft delete only — no hard row delete in normal flows). **`name`** and **`slug`** are unique among **active** rows (partial unique indexes); a soft-deleted row frees its keys for reuse.

### Bootstrap and CI (migrations still matter)

Migrations remain useful to:

1. **Create schema** and reference-table hooks (`001` …).
2. **Seed** core modules in empty databases (`INSERT … ON CONFLICT … DO UPDATE` in Alembic).
3. Ship **companion catalog data** the module owns (`permissions`, `module_config_schemas`, etc.) in the same deployment pipeline.

Those seeds **do not replace** superadmin CRUD for ongoing catalog management unless your process chooses migration-only updates deliberately.

### Event and tenant layers

4. **Master Data publishes events.** `module.registered` / `module.updated` / soft-delete semantics — rich payloads for projections (§12).
5. **Tenant enablement is separate.** Operators enable modules per tenant in the Configurator (`tenant_modules`, `tenant_module_configs`).

### Lifecycle states

There is no separate `status` column on `modules`: an active row (`is_deleted = false`) is part of the catalog; per-tenant enablement is in the Configurator. **Retiring** uses **`is_deleted = true`**, preserving FK integrity for historical joins while hiding the module from default **GET** list/detail responses.

See [Configurator dev-doubts/01-analysis.md §3](../configurator/dev-doubts/01-analysis.md) for the original lifecycle analysis.

---

## 10. Citus distribution strategy

| Table | Distribution | Color (ERD) | Notes |
|-------|-------------|-------------|-------|
| `modules` | **Reference** | Yellow | Platform-defined, tens of rows |
| `permissions` | **Reference** | Yellow | Definition catalog |
| `module_permissions` | **Reference** | Yellow | Join rows |
| `system_roles` | **Reference** | Yellow | Templates only |
| `picklist` | **Reference** | Yellow | Picklist domain headers |
| `picklist_values` | **Reference** | Yellow | Values per picklist |
| `module_config_schemas` | **Reference** | Yellow | One row per module per schema version |
| `feature_flags` | **Reference** | Yellow | Flag definitions |

All MVP Master Data catalog tables above are **reference tables** — replicated on every Citus worker so catalog reads are local.

### No cross-schema queries

The Configurator does **not** query `public.*` Master Data tables directly at runtime. Two access patterns are used, depending on the data:

- **`modules`** is fetched via HTTP from Master Data's API with a TTL cache (Configurator-side); `module.*` events bust the cache. **No projection table.** See [Configurator LLD §3.1](../configurator/01-schema-design.md#31-module-metadata-access-pattern-http--cache).
- **`module_config_schemas`** and **`feature_flags`** are projected into the Configurator schema (`config_schema_projection`, `feature_flag_projection`) and synced via domain events (§12). These projections are tagged for a follow-up review against the same decision criteria — they may also be downgraded to HTTP+cache.

Tenant tables in the Configurator either reference local projections (within `configurator`) or store soft references (UUIDs that match Master Data's IDs by convention, validated at write time) — per [database principle §4](../../analysis/03-database-principles.md#4-no-cross-schema-foreign-keys). Intra-schema FKs (`module_config_schemas.module_id` → `modules.id`, etc.) are normal PostgreSQL foreign keys.

---

## 11. Audit column exceptions

[Database principle §5](../../analysis/03-database-principles.md#5-every-table-has-standard-audit-columns) requires `created_at`, `updated_at`, `created_by`, `updated_by` on every table where practical. The following deviate:

| Table | Missing | Justification |
|-------|---------|---------------|
| `module_config_schemas` | `created_by`, `updated_by` | Declared by deployments |
| `module_permissions`, `system_roles`, `picklist`, `picklist_values` | `created_by`, `updated_by` | Catalog rows currently seeded/migrated; optional to add later for human edits |

`permissions` and `feature_flags` retain `created_by` / `updated_by` for operator-defined edits.

---

## 12. Events published

All registry events carry **rich payloads** — every field projection consumers need to upsert local copies without calling back to Master Data (see CLAUDE.md).

| Event | When | Payload includes (non-exhaustive) | Consumers |
|-------|------|-------------------------------------|-----------|
| `module.registered` | New module row | `module_id`, `name`, `slug`, `parent_id`, `description`, `category`, `version`, `level`, `icon`, `is_active`, `is_deleted` | Configurator (module catalog cache invalidation — see [Configurator LLD §3.1](../configurator/01-schema-design.md#31-module-metadata-access-pattern-http--cache)), admin shell |
| `module.updated` | Module metadata or tree change | Above + `old_version`, `new_version` where applicable | Configurator (cache invalidation), admin shell |
| `module.deleted` / `module.deactivated` | Module soft-deleted or deactivated | `module_id`, `slug`, `is_deleted`/`is_active` | Configurator (cache invalidation + soft-disable affected `tenant_modules` rows), admin shell |
| `feature-flag.defined` / `feature-flag.updated` | Flag rows | `flag_id`, `slug`, `name`, `flag_type`, `module_id`, `default_value`, `value_schema` | Configurator (`feature_flag_projection`) |
| `config-schema.declared` | New schema version | `schema_id`, `slug`, `module_id`, `schema_version`, `config_schema`, `defaults` | Configurator (`config_schema_projection`) |

**Catalog extensions (permissions, `module_permissions`, `system_roles`, picklists):** emit dedicated events (e.g. `permission.defined`, `picklist-value.updated`) or batch `master-data.catalog-updated` with typed payloads — exact names can align with projection consumers when those projections are added; payloads must include **`slug`** per platform rules for stable references.

### Post-launch events (healthcare reference data)

| Event | When | Payload includes | Consumers |
|-------|------|-----------------|-----------|
| `master-data.updated` | Global reference dataset updated | `data_domain`, `version` | Modules caching reference data |
| `tenant-override.changed` | Tenant override delta | `iq_tenant_id`, `data_domain`, `entity_id` | Affected modules |

---

## 13. Dependencies

Master Data depends on **User Management** for authenticated operators (identity adapter, PEP middleware). It does not depend on the Configurator, EMPI, or feature modules. The Configurator subscribes to Master Data events — one-directional.

---

## 14. Cross-module identifier references

| Column | On table | References | In module | Mechanism |
|--------|----------|------------|-----------|-----------|
| `tenant_modules.module_id` | `configurator.tenant_modules` | `public.modules.id` | Master Data | Soft reference (no FK); HTTP-validated at write, event-driven soft-disable on `module.deleted` — see [Configurator LLD §3.1](../configurator/01-schema-design.md#31-module-metadata-access-pattern-http--cache) |
| `config_schema_projection.*` | `configurator.config_schema_projection` | `public.module_config_schemas` identity | Configurator | Event-synced projection |
| `feature_flag_projection.id` | `configurator.feature_flag_projection` | `public.feature_flags.id` | Configurator | Event-synced projection |
| `feature_flags.module_id` | `public.feature_flags` | `public.modules.id` | Master Data | Intra-schema FK |
| `module_config_schemas.module_id` | `public.module_config_schemas` | `public.modules.id` | Master Data | Intra-schema FK |
| `modules.parent_id` | `public.modules` | `public.modules.id` | Master Data | Self-FK (tree) |
| `module_permissions.module_id` | `public.module_permissions` | `public.modules.id` | Master Data | Intra-schema FK |
| `module_permissions.permission_id` | `public.module_permissions` | `public.permissions.id` | Master Data | Intra-schema FK |
| `picklist_values.category_id` | `public.picklist_values` | `public.picklist.id` | Master Data | Intra-schema FK |

---

## 15. MVP vs implementation pace

The **ERD and this document** describe the full MVP **Master Data catalog** contract (**eight** reference tables). Individual migrations may land tables in waves (for example, ship `modules` first, then permissions and picklists) as long as OpenAPI and migrations stay consistent with the adopted slice. [`schema-reference.json`](./schema-reference.json) is the column-level source of truth.

---

## 16. Post-launch: Healthcare reference data (sketch)

> **Validation probe, not a build plan.** Proves the MVP foundation can absorb healthcare reference data without migrating existing catalog rows.

### Two-layer inheritance model

Per HLD §4.1, global reference datasets are the baseline; tenant overrides are deltas. The Master Data API resolves inheritance; consumers see merged results.

### Planned tables (Post-launch)

| Table | Distribution | Purpose |
|-------|-------------|---------|
| `code_systems` | Reference | ICD-10, ICD-11, LOINC, SNOMED CT, local |
| `codes` | Reference | Global code entries |
| `code_mappings` | Reference | Cross-walks |
| `tenant_code_overrides` | Distributed by `iq_tenant_id` | Tenant deltas |
| `drug_catalog` | Reference | Global drug data |
| `tenant_drug_overrides` | Distributed by `iq_tenant_id` | Formulary |
| `departments` | Reference | Templates |
| `tenant_departments` | Distributed by `iq_tenant_id` | Hospital structure |
| `wards` | Distributed by `iq_tenant_id` | Ward/bed structure |

### Why the MVP schema accommodates this

- Catalog DDL uses the default PostgreSQL **`public`** schema (no separate schema object required).
- MVP catalog tables are orthogonal to healthcare code tables.
- A dedicated audit or history table may be introduced later outside or alongside MVP tables if regulators require finer-grained change logs than row metadata.

No migration of existing MVP tables is required to add Post-launch healthcare reference data.
