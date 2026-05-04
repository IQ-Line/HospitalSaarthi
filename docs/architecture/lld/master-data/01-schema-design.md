# Master Data — Schema Design

**Module:** Master Data (core platform module)  
**Schema name:** `master_data`  
**Related HLD:** [02-core-modules.md §4](../../hld/02-core-modules.md#4-master--tenant-data) | [03-module-shape-template.md §8](../../hld/03-module-shape-template.md#8-configurator-integration)  
**Related ADRs:** [ADR-0002](../../adr/0002-multi-tenant-fragmentable-adoption.md) (Multi-tenant fragmentable adoption) | [ADR-0006](../../adr/0006-four-core-platform-modules.md) (Four core modules) | [ADR-0012](../../adr/0012-multi-tenancy-isolation-strategy.md) (Multi-tenancy isolation)  
**ERD (visual):** [`master-data.erd.json`](./master-data.erd.json) — open in VS Code with ERD Editor extension  
**Schema reference:** [`schema-reference.json`](./schema-reference.json) — full column descriptions, indexes, check constraints, Citus distribution notes

**Phasing:** The MVP ships the module/feature registry and its audit trail. Healthcare reference data (ICD codes, drug catalogs, LOINC, SNOMED, departments, etc.) is Post-launch — sketched in §12 to validate that the schema foundation holds, but not implemented in the first release.

| Phase | What ships |
|-------|-----------|
| **MVP** | All 4 tables: `modules`, `module_config_schemas`, `feature_flags`, `registry_change_audit`. Module registration lifecycle. Events for module/feature registry changes. |
| **Post-launch** | Healthcare reference data tables (code systems, codes, code mappings, drug catalogs, department/ward master), tenant override mechanism (two-layer inheritance model per HLD §4.1), FHIR terminology endpoints. |

---

## 1. Two-domain model

Master Data owns two distinct domains with different lifecycles:

| Domain | What | Citus mode | Changes via | Phase |
|--------|------|------------|-------------|-------|
| **Module/feature registry** | What modules exist, what config schemas they declare, what feature flags are defined | **Reference table** (replicated to all nodes) | Deployment migrations, platform operator actions | MVP |
| **Healthcare reference data** | ICD codes, drug catalogs, LOINC, SNOMED, departments, wards, fee schedules | **Reference** (global catalogs) + **Distributed** (tenant overrides) | Platform data team (global), hospital admins (tenant overrides) | Post-launch |

The module/feature registry was originally part of the Configurator module. The EM and tech lead decided to consolidate all "what exists in the platform" reference data under Master Data, reserving the Configurator for per-tenant operational state (enablement, overrides, config values) and the resolution API. See the [Configurator LLD](../configurator/01-schema-design.md) for the rationale and the original design.

---

## 2. Module registry (`modules`)

Registry of all deployable modules — 4 core + ~38 feature modules from the AIIMS EOI scope. Platform-defined; no tenant creates modules.

Each module registers itself during its first deployment (see §5 — Module registration lifecycle). The row exists as long as the module exists in the platform.

### Design decisions

- **`is_core` flag.** The four core modules (User Management, EMPI, Configurator, Master Data) are marked `is_core = true`. The Configurator's provisioning workflow seeds `tenant_modules` rows for all `is_core` modules and enforces a CHECK constraint preventing their disablement. The `is_core` flag here is the source of truth for which modules are core.
- **`category` classification.** `core`, `clinical`, `administrative`, `support`. Used by the admin UI to organize the module catalog. Not an access control boundary — authorization is handled by Cerbos policies, not by category.
- **`version` tracking.** Semver string updated by the module's deployment migration. The Configurator's runtime hydration logic (Post-launch) uses this to determine whether a module's config schema has been upgraded.
- **Machine-readable `name`.** The `name` column is the stable identifier used in APIs, events, and cross-module references (e.g., `opd`, `pharmacy`, `user_management`). The `display_name` is for UI rendering only.

---

## 3. Config schema declarations (`module_config_schemas`)

Each module declares a JSON Schema describing its configurable parameters — types, defaults, constraints, UI hints. The Configurator reads these schemas to render admin UI forms and validate tenant config values.

### Design decisions

- **One schema per module per version.** The `(module_id, schema_version)` unique constraint ensures that a module's v1.0.0 schema and v1.1.0 schema coexist. The Configurator's runtime hydration (Post-launch) merges the latest schema's defaults with the tenant's stored config values.
- **`defaults` JSONB.** Default values for all configurable parameters. When a tenant has no explicit config for a module, the Configurator serves these defaults. This is the "zero-config works" principle — a newly enabled module has sensible behavior without admin intervention.
- **`config_schema` JSONB.** JSON Schema (draft-07 or later). Used for validation and UI rendering. The Configurator validates `tenant_module_configs.config_values` against this schema before saving.
- **No `created_by` / `updated_by`.** These schemas are declared by module deployments (code, not humans). The deployment pipeline is the author. Audit of "who deployed this version" belongs in the CI/CD system, not the database.

---

## 4. Feature flag definitions (`feature_flags`)

Platform-wide feature flag definitions with defaults. Tenant-specific overrides are stored in the Configurator's `tenant_feature_flags` table.

### Design decisions

- **Flag types.** `boolean` (on/off), `percentage` (0–100 gradual rollout), `string` (variant selection), `json` (complex config). The type determines how the Configurator validates and applies overrides.
- **`module_id` is nullable.** `NULL` = platform-wide flag (not tied to any module). Non-null = the flag belongs to a specific module and is excluded from resolution when that module is disabled for a tenant (the Configurator's flag resolution query handles this).
- **`value_schema` for JSON flags (Post-launch).** When `flag_type = 'json'`, the `value_schema` column holds a JSON Schema for validating override values. Same validation pattern as `module_config_schemas.config_schema`. The column ships in MVP (nullable); validation logic is Post-launch since `json`-type flags are Post-launch.
- **`default_value` JSONB.** The platform-wide default, applied when no tenant override exists. JSONB rather than TEXT to support all flag types uniformly (boolean `false`, percentage `50`, string `"variant_a"`, JSON objects).

---

## 5. Module registration lifecycle

Modules announce themselves to the platform via database migrations, not via runtime API calls. This ensures the registry is always consistent with what's deployed.

### How it works

1. **Module deploys.** The CI/CD pipeline runs the module's database migrations.
2. **Migration seeds the registry.** The module's initial migration includes an `INSERT INTO master_data.modules ... ON CONFLICT (name) DO UPDATE SET version = ...` statement. This registers the module on first deploy and updates its version on subsequent deploys.
3. **Config schema declaration.** If the module has configurable parameters, the same migration inserts a row into `master_data.module_config_schemas` with the schema and defaults.
4. **Feature flag registration.** If the module defines feature flags, the migration inserts rows into `master_data.feature_flags`.
5. **Master Data publishes events.** `module.registered` (or `module.updated`) event is emitted. The Configurator consumes this to make the module available for tenant enablement in the admin UI.
6. **Tenant enablement is separate.** A platform operator or hospital admin enables the module for specific tenants via the Configurator's admin UI. This creates `tenant_modules` and optionally `tenant_module_configs` rows in the Configurator schema.

### Why migrations, not runtime API

- **Deployment = registration.** A module that's deployed is available. A module that's not deployed can't register. Tying registration to migrations makes the registry an accurate reflection of what's running.
- **No chicken-and-egg.** If registration required a runtime API call, the module would need Master Data to be running before it could register — creating a startup ordering dependency. Migrations run against the database directly, avoiding this.
- **Idempotent.** `ON CONFLICT ... DO UPDATE` makes re-registration safe. Rolling back a deployment and re-deploying doesn't corrupt the registry.
- **Version tracking is automatic.** The migration updates `version` on every deploy, so the registry always reflects the currently deployed version.

### Lifecycle states

The `modules` table has no explicit `status` column. A module's availability is determined by whether it has a row in the table (registered = exists) and whether it's enabled per tenant in the Configurator's `tenant_modules` table. Deregistering a module (removing its row) is a platform operator action that should never happen in normal operations — it would orphan tenant enablement records and config values. The expected lifecycle is: register → upgrade → upgrade → ... (modules are never removed, only superseded).

See [Configurator dev-doubts/01-analysis.md §3](../configurator/dev-doubts/01-analysis.md) for the original analysis of this lifecycle.

---

## 6. Registry change audit (`registry_change_audit`)

All changes to module/feature registry data are recorded. This is Master Data's equivalent of the Configurator's `config_change_audit` for its domain.

### What is audited

- Module registration and version updates
- Config schema declarations and updates
- Feature flag definitions, default value changes, and flag metadata updates

### Entity types

```
'module'               — Module registered or updated
'module_config_schema'  — Config schema declared or updated
'feature_flag'          — Feature flag defined or updated
```

### Actions

```
'created'    — New entity registered/defined
'updated'    — Entity modified (version bump, default change, schema upgrade)
```

### Distribution strategy for audit

Registry changes are platform-wide actions, not tenant-scoped. The audit record uses the acting admin's `iq_tenant_id` from their JWT as the distribution key — same pattern as the Configurator's organization-level audit exception (see [Configurator §9](../configurator/01-schema-design.md#9-config-change-audit)). This is acceptable because:
- Registry changes are rare (module deployments, flag definitions)
- "All changes to module X" is a platform admin query, not a hot path — scatter is fine
- The acting admin is always authenticated in a tenant context

For migration-triggered changes (module registration during deployment), `changed_by` is `NULL` and `iq_tenant_id` uses a designated platform-operations tenant ID. The audit record still captures what changed and when; the "who" is the deployment pipeline, tracked in CI/CD.

---

## 7. Citus distribution strategy

| Table | Distribution | Color | Notes |
|-------|-------------|-------|-------|
| `modules` | **Reference table** | Yellow | Platform-defined, ~42 rows |
| `module_config_schemas` | **Reference table** | Yellow | One per module per version, ~50–100 rows |
| `feature_flags` | **Reference table** | Yellow | Platform-defined flag definitions, ~100–200 rows |
| `registry_change_audit` | Distributed by `iq_tenant_id` | Green | Actor's tenant context, append-only |

### Why reference tables for the registry

The module/feature registry tables are the canonical example of reference data in Citus:
1. **Row count.** ~42 modules, ~50 schemas, ~100–200 flags. Replication cost is negligible.
2. **Universal read pattern.** The Configurator subscribes to registry events and maintains local projections. Other modules may also need registry data in the future — reference table distribution ensures any node can serve it locally.
3. **Write frequency.** Changes only during deployments or platform admin actions. The replication overhead of writes is trivial at this frequency.

### No cross-schema queries

The Configurator does **not** query Master Data's tables directly. Instead, the Configurator maintains local read projections (`module_projection`, `config_schema_projection`, `feature_flag_projection`) in its own schema, kept in sync via the events listed in §9. All config resolution queries run entirely within the `configurator` schema. This follows the principle that each module queries only its own schema — cross-module data flows through events, not JOINs.

---

## 8. Audit column exceptions

[Database principle §5](../../analysis/03-database-principles.md#5-every-table-has-standard-audit-columns) requires `created_at`, `updated_at`, `created_by`, `updated_by` on every table. The following tables deviate:

| Table | Missing | Justification |
|-------|---------|---------------|
| `modules` | `created_by`, `updated_by` | Platform-seeded by deployments/migrations, not by users |
| `module_config_schemas` | `created_by`, `updated_by` | Declared by module deployments, not user actions |
| `registry_change_audit` | all four | IS the audit trail — uses `changed_at`/`changed_by`. Meta-auditing is unnecessary. |

---

## 9. Events published

All registry events carry **rich payloads** — every field the Configurator's projection consumer needs to upsert its local copy without calling back to Master Data's API. This follows the platform's "rich event payloads" principle (see CLAUDE.md).

| Event | When | Payload includes | Consumers |
|-------|------|-----------------|-----------|
| `module.registered` | New module registers via migration | `module_id`, `name`, `display_name`, `category`, `is_core`, `version` | Configurator (upsert `module_projection`) |
| `module.updated` | Module version bumped via migration | `module_id`, `name`, `display_name`, `category`, `is_core`, `old_version`, `new_version` | Configurator (update `module_projection`, flag tenants needing config migration review) |
| `feature-flag.defined` | New flag defined | `flag_id`, `name`, `flag_type`, `module_id`, `default_value`, `value_schema` | Configurator (upsert `feature_flag_projection`, make available for tenant overrides) |
| `feature-flag.updated` | Flag default or metadata changed | `flag_id`, `name`, `flag_type`, `module_id`, `default_value`, `value_schema` | Configurator (update `feature_flag_projection`, propagate to tenants without overrides) |
| `config-schema.declared` | New config schema version registered | `module_id`, `schema_version`, `config_schema`, `defaults` | Configurator (upsert `config_schema_projection`, trigger runtime hydration for affected tenants) |

### Post-launch events (healthcare reference data)

| Event | When | Payload includes | Consumers |
|-------|------|-----------------|-----------|
| `master-data.updated` | Global reference dataset updated (new ICD codes, drug recalls) | `data_domain`, `version` | All modules caching reference data |
| `tenant-override.changed` | Tenant-specific override created/modified/removed | `iq_tenant_id`, `data_domain`, `entity_id` | Affected modules (refresh tenant-specific cache) |

---

## 10. Dependencies

Master Data depends on:

- **User Management** — for authentication and authorization of admin users managing registry data and (Post-launch) healthcare reference data. This dependency is via the identity adapter and PEP middleware (standard module shape), not via database-level coupling.

Master Data has no dependency on the Configurator, EMPI, or any feature module. The dependency is one-directional: the Configurator subscribes to Master Data's domain events and maintains local read projections — Master Data never queries the Configurator's schema.

---

## 11. Cross-module identifier references

| Column | On table | References | In module | Mechanism |
|--------|----------|-----------|-----------|-----------|
| `module_projection.id` | `configurator.module_projection` | `master_data.modules.id` | Configurator | Event-synced projection (same UUID, no FK) |
| `config_schema_projection.id` | `configurator.config_schema_projection` | `master_data.module_config_schemas.(module_id, schema_version)` | Configurator | Event-synced projection |
| `feature_flag_projection.id` | `configurator.feature_flag_projection` | `master_data.feature_flags.id` | Configurator | Event-synced projection (same UUID, no FK) |
| `feature_flags.module_id` | `master_data.feature_flags` | `master_data.modules.id` | Same module | Standard FK (intra-schema) |
| `module_config_schemas.module_id` | `master_data.module_config_schemas` | `master_data.modules.id` | Same module | Standard FK (intra-schema) |

Per [database principle §4](../../analysis/03-database-principles.md#4-no-cross-schema-foreign-keys), there are **no cross-schema foreign keys**. The Configurator maintains local projections of Master Data's registry tables, synced via domain events. Projection IDs match the source IDs by convention (the event consumer preserves the original UUID). The Configurator's tenant tables reference these local projections, not `master_data.*` tables. Intra-schema references (`feature_flags.module_id` → `modules.id`, `module_config_schemas.module_id` → `modules.id`) use standard foreign keys.

---

## 12. Post-launch: Healthcare reference data (sketch)

> **This section is a validation probe, not a build plan.** It sketches the healthcare reference data schema to prove that the MVP foundation holds — specifically, that adding these tables later requires no migration of existing data and no architectural rework. See [design-process-learnings.md §5](../../design-process-learnings.md) for why this matters.

### Two-layer inheritance model

Per HLD §4.1 (Approach A — recommended), global reference datasets are the platform-wide baseline. Tenant overrides layer on top as deltas. The Master Data API resolves inheritance internally and returns the merged result — consuming modules never see the two-layer model.

### Planned tables (Post-launch)

| Table | Distribution | Purpose |
|-------|-------------|---------|
| `code_systems` | Reference | Registry of code systems (ICD-10, ICD-11, LOINC, SNOMED CT, local) |
| `codes` | Reference | Global code entries across all code systems |
| `code_mappings` | Reference | Cross-walks between code systems (ICD-10 ↔ SNOMED CT) |
| `tenant_code_overrides` | Distributed by `iq_tenant_id` | Tenant-specific additions, removals, display name overrides |
| `drug_catalog` | Reference | Global drug catalog (formulations, dosages, interactions) |
| `tenant_drug_overrides` | Distributed by `iq_tenant_id` | Hospital formulary — which drugs are stocked, local naming, pricing |
| `departments` | Reference | Global department templates |
| `tenant_departments` | Distributed by `iq_tenant_id` | Tenant's actual department list and hierarchy |
| `wards` | Distributed by `iq_tenant_id` | Tenant-specific ward/bed structure |

### Why the MVP schema accommodates this

- The `master_data` schema namespace exists. Adding tables is a standard migration.
- The registry tables (`modules`, `module_config_schemas`, `feature_flags`) are independent of healthcare reference data — no shared columns, no shared constraints.
- The audit pattern (`registry_change_audit`) extends naturally: a `reference_data_change_audit` table (distributed by `iq_tenant_id`) captures changes to healthcare reference data. Different table, same pattern.
- The Citus distribution strategy (reference for global, distributed for tenant overrides) is already established by the registry tables.

No schema migration of MVP tables is required to add Post-launch healthcare reference data.
