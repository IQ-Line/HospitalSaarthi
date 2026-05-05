# Master Data — Schema Design

**Module:** Master Data (core platform module)  
**Schema name:** `master_data`  
**Related HLD:** [02-core-modules.md §4](../../hld/02-core-modules.md#4-master--tenant-data) | [03-module-shape-template.md §8](../../hld/03-module-shape-template.md#8-configurator-integration)  
**Related ADRs:** [ADR-0002](../../adr/0002-multi-tenant-fragmentable-adoption.md) (Multi-tenant fragmentable adoption) | [ADR-0006](../../adr/0006-four-core-platform-modules.md) (Four core modules) | [ADR-0012](../../adr/0012-multi-tenancy-isolation-strategy.md) (Multi-tenancy isolation)  
**ERD (visual):** [`master-data.erd.json`](./master-data.erd.json) — open in VS Code with ERD Editor extension  
**Schema reference:** [`schema-reference.json`](./schema-reference.json) — full column descriptions, indexes, check constraints, Citus distribution notes  
**HTTP API (v1):** [`02-api-contracts.md`](./02-api-contracts.md) — standard headers/envelopes, endpoint index, response shapes ([OpenAPI](../../../../specs/openapi/master-data.v1.yaml))

**Phasing:** The MVP ships the **platform catalog** (module tree, permission definitions, module–permission links, role templates, `picklist` + `picklist_values`) and the **Configurator contract** (config schemas and feature flag definitions). Catalog change history can be traced via **`created_*` / `updated_*`** columns on each row (and optionally platform observability outside this schema). Healthcare reference data (ICD codes, drug catalogs, LOINC, SNOMED, departments, etc.) is Post-launch — sketched in §16.

| Phase | What ships |
|-------|-----------|
| **MVP** | **Catalog (reference):** `modules`, `permissions`, `module_permissions`, `system_roles`, `picklist`, `picklist_values`. **Configurator integration (reference):** `module_config_schemas`, `feature_flags`. All MVP tables are Citus reference tables. Lifecycle events carry rich payloads for projections. |
| **Post-launch** | Healthcare reference data tables (code systems, codes, code mappings, drug catalogs, department/ward master), tenant override mechanism (two-layer inheritance model per HLD §4.1), FHIR terminology endpoints. |

---

## 1. Two-domain model

Master Data owns two distinct domains with different lifecycles:

| Domain | What | Citus mode | Changes via | Phase |
|--------|------|------------|-------------|-------|
| **Platform catalog + module/feature registry** | Module registry and admin tree; permission and role *definitions*; picklists; config schemas; feature flag definitions | **Reference table** (replicated to all nodes) | Deployment migrations, platform operator actions | MVP |
| **Healthcare reference data** | ICD codes, drug catalogs, LOINC, SNOMED, departments, wards, fee schedules | **Reference** (global catalogs) + **Distributed** (tenant overrides) | Platform data team (global), hospital admins (tenant overrides) | Post-launch |

The module and configurator-facing registry were originally part of the Configurator module. The EM and tech lead consolidated “what exists in the platform” under Master Data, reserving the Configurator for per-tenant operational state (enablement, overrides, config values) and the resolution API. See the [Configurator LLD](../configurator/01-schema-design.md) for the rationale.

**Authorization boundary.** Rows in `permissions`, `module_permissions`, and `system_roles` describe the **catalog** (what can be named in policies and onboarding). **Cerbos** remains the runtime PDP; **User Management** owns assignments (which user holds which role, which tenant-scoped grants apply). Master Data does not store per-user permissions.

**Slug on every MVP table.** Each catalog table has a **`slug`** column — URL-safe and **unique within that table** — for stable references in APIs, routing, and events, alongside natural keys (`name`, `code`, composite uniqueness, etc.). Junction rows (`module_permissions`) use a deterministic slug (e.g. derived from module and permission slugs). `picklist` keeps both **`code`** (often uppercase, internal) and **`slug`** (URL-safe).

---

## 2. Module registry and navigation tree (`modules`)

Registry of all deployable modules — 4 core + ~38 feature modules from the AIIMS EOI scope. Platform-defined; no tenant creates modules.

`parent_id` adds a **bounded hierarchy** (see `level` check in [`schema-reference.json`](./schema-reference.json)) for admin IA and shell navigation: group headers and leaf modules share one table. **`name`** stays the stable identifier for APIs and events; **`slug`** is a URL-safe unique key for routing and external links. **`description`** is optional narrative only. **`category`** (`core` \| `clinical` \| `administrative` \| `support`) groups modules in the **admin catalog** — it is not an access control boundary (Cerbos governs that). **Display labels**, **default routes**, and **which modules are mandatory for every tenant** still come from the shell / Configurator / convention (e.g. known `name`/`slug` sets), not from extra columns on `modules`.

### Design decisions

- **`category` classification.** Used by the admin UI to organize the module list. Not an authorization boundary.
- **`version` tracking.** Semver updated by the module's deployment migration. Post-launch hydration may use this to detect config schema upgrades.
- **`is_active`.** Soft-hide from default navigation without deleting registry rows (which would orphan projections and tenant state).

---

## 3. Permission definitions (`permissions`)

Platform-wide list of permission verbs with **`slug`** (policy-stable) and **`action`** (`create` \| `read` \| `update` \| `delete` \| `manage`). Seeded or extended by migrations and platform ops.

---

## 4. Module–permission mapping (`module_permissions`)

Join table: which **`permissions`** apply to which **`modules`**. Each row has its own **`slug`** (unique) for stable external references. **`is_default`** hints suggested defaults when provisioning tenant role templates; it does not grant access by itself.

---

## 5. Role templates (`system_roles`)

Named role **templates** (e.g. Ward Clerk). **`is_template`** distinguishes catalog rows from instantiated roles elsewhere. Real membership and Cerbos principal attributes live outside `master_data`.

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

Modules announce themselves via **database migrations**, not runtime API calls, so the registry always matches what is deployed.

### How it works

1. **Module deploys.** CI/CD runs the module's migrations.
2. **Migration seeds the registry.** `INSERT INTO master_data.modules ... ON CONFLICT (name) DO UPDATE` (or conflict target on `slug` where appropriate) registers the module and updates `version`.
3. **Navigation fields.** Same migration sets `parent_id`, `slug`, `category`, `level`, `icon`, `is_active` consistently with the admin shell.
4. **Catalog rows.** Migrations may insert **`permissions`**, **`module_permissions`**, **`system_roles`**, and **`picklist` / `picklist_values`** rows the module depends on.
5. **Config schema declaration.** If the module is configurable, insert **`module_config_schemas`** (with **`slug`**).
6. **Feature flag registration.** If the module defines flags, insert **`feature_flags`** (with **`slug`**).
7. **Master Data publishes events.** `module.registered` / `module.updated` and (as needed) companion events for catalog rows — rich payloads for projections (§12).
8. **Tenant enablement is separate.** Operators enable modules per tenant in the Configurator (`tenant_modules`, `tenant_module_configs`).

### Why migrations, not runtime API

- **Deployment = registration.** No startup ordering chicken-and-egg.
- **Idempotent.** `ON CONFLICT ... DO UPDATE` keeps re-deploys safe.
- **Version tracking** follows the migration that bumps `version`.

### Lifecycle states

There is no separate `status` column on `modules`: presence in the table means registered; per-tenant enablement is in the Configurator. Removing a module row is a rare operator action that would orphan tenant state — expected path is register → upgrade → …

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

All MVP `master_data` tables above are **reference tables** — replicated on every Citus worker so catalog reads are local.

### No cross-schema queries

The Configurator does **not** query `master_data.*` directly at runtime. It maintains local projections (`module_projection`, `config_schema_projection`, `feature_flag_projection`, and any future permission/picklist projections) in its own schema, synced via domain events (§12). Tenant tables reference projections, not `master_data` — per [database principle §4](../../analysis/03-database-principles.md#4-no-cross-schema-foreign-keys). Intra-schema FKs (`module_config_schemas.module_id` → `modules.id`, etc.) are normal PostgreSQL foreign keys.

---

## 11. Audit column exceptions

[Database principle §5](../../analysis/03-database-principles.md#5-every-table-has-standard-audit-columns) requires `created_at`, `updated_at`, `created_by`, `updated_by` on every table where practical. The following deviate:

| Table | Missing | Justification |
|-------|---------|---------------|
| `modules` | `created_by`, `updated_by` | Seeded by deployments/migrations |
| `module_config_schemas` | `created_by`, `updated_by` | Declared by deployments |
| `permissions`, `module_permissions`, `system_roles`, `picklist`, `picklist_values` | `created_by`, `updated_by` | Same — catalog seeded/migrated; optional to add later for human edits |

`feature_flags` retains `created_by` / `updated_by` for operator-defined flags.

---

## 12. Events published

All registry events carry **rich payloads** — every field projection consumers need to upsert local copies without calling back to Master Data (see CLAUDE.md).

| Event | When | Payload includes (non-exhaustive) | Consumers |
|-------|------|-------------------------------------|-----------|
| `module.registered` | New module row | `module_id`, `name`, `slug`, `parent_id`, `description`, `category`, `version`, `level`, `icon`, `is_active` | Configurator (`module_projection`), admin shell |
| `module.updated` | Module metadata or tree change | Above + `old_version`, `new_version` where applicable | Configurator, admin shell |
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
| `module_projection.id` | `configurator.module_projection` | `master_data.modules.id` | Configurator | Event-synced projection (same UUID, no FK) |
| `config_schema_projection.*` | `configurator.config_schema_projection` | `master_data.module_config_schemas` identity | Configurator | Event-synced |
| `feature_flag_projection.id` | `configurator.feature_flag_projection` | `master_data.feature_flags.id` | Configurator | Event-synced |
| `feature_flags.module_id` | `master_data.feature_flags` | `master_data.modules.id` | Master Data | Intra-schema FK |
| `module_config_schemas.module_id` | `master_data.module_config_schemas` | `master_data.modules.id` | Master Data | Intra-schema FK |
| `modules.parent_id` | `master_data.modules` | `master_data.modules.id` | Master Data | Self-FK (tree) |
| `module_permissions.module_id` | `master_data.module_permissions` | `master_data.modules.id` | Master Data | Intra-schema FK |
| `module_permissions.permission_id` | `master_data.module_permissions` | `master_data.permissions.id` | Master Data | Intra-schema FK |
| `picklist_values.category_id` | `master_data.picklist_values` | `master_data.picklist.id` | Master Data | Intra-schema FK |

---

## 15. MVP vs implementation pace

The **ERD and this document** describe the full MVP **`master_data`** contract (**eight** reference tables). Individual migrations may land tables in waves (for example, ship `modules` first, then permissions and picklists) as long as OpenAPI and migrations stay consistent with the adopted slice. [`schema-reference.json`](./schema-reference.json) is the column-level source of truth.

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

- The `master_data` schema namespace already exists.
- MVP catalog tables are orthogonal to healthcare code tables.
- A dedicated audit or history table may be introduced later outside or alongside MVP tables if regulators require finer-grained change logs than row metadata.

No migration of existing MVP tables is required to add Post-launch healthcare reference data.
