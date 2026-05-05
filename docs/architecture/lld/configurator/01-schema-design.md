# Configurator — Schema Design

**Module:** Configurator (core platform module)  
**Schema name:** `configurator`  
**Related HLD:** [02-core-modules.md §3](../../hld/02-core-modules.md#3-configurator) | [03-module-shape-template.md §8](../../hld/03-module-shape-template.md#8-configurator-integration)  
**Related ADRs:** [ADR-0002](../../adr/0002-multi-tenant-fragmentable-adoption.md) (Multi-tenant fragmentable adoption) | [ADR-0006](../../adr/0006-four-core-platform-modules.md) (Four core modules) | [ADR-0012](../../adr/0012-multi-tenancy-isolation-strategy.md) (Multi-tenancy isolation)  
**ERD (visual):** [`configurator.erd.json`](./configurator.erd.json) — open in VS Code with ERD Editor extension  
**Schema reference:** [`schema-reference.json`](./schema-reference.json) — full column descriptions, indexes, check constraints, Citus distribution notes

**Design decision — module/feature registry ownership:** The module registry (`modules` and related **platform catalog** tables — permissions, role templates, picklists — see [Master Data LLD](../master-data/01-schema-design.md)), `module_config_schemas`, and `feature_flags` are owned by the [Master Data module](../master-data/01-schema-design.md). The Configurator owns the per-tenant operational state: which modules are enabled, how they're configured, and which flag overrides apply. The Configurator maintains **local read projections** of Master Data's registry tables (`module_projection`, `config_schema_projection`, `feature_flag_projection`, and future projections as needed) kept in sync via events — it never queries Master Data's schema directly. All JOINs are within the `configurator` schema. Consuming modules talk to the Configurator, not Master Data, for config resolution.

**Phasing:** Most of the schema is MVP — the tables, columns, and constraints ship with the initial deployment. Subsections tagged **Post-launch** describe features that the MVP schema accommodates without migrations but that are not implemented in the first release. All Post-launch features are additive (new tables or nullable columns already present), never requiring migration of existing data.

| Phase | What ships |
|-------|-----------|
| **MVP** | All 11 tables, all columns, all constraints. Tenant registry, module enablement, tenant-level feature flag overrides, module configuration with ETag polling + optimistic locking, integration profiles (ABDM + lab analyzers), provisioning workflow, config change audit. 3 local projections of Master Data's registry (synced via events). |
| **Post-launch** | Runtime hydration across schema versions, nested/scoped config structures, inter-tenant integration profiles, decommissioning workflow, tenant hierarchy tree view UI, `tenant.org_changed` event. |

---

## 1. Two-layer data model

The Configurator's data splits into two layers with different distribution strategies:

| Layer | What | Citus mode | Changes via |
|-------|------|------------|-------------|
| **Platform reference** | Organizations, tenant registry | **Reference table** (replicated to all nodes) | Platform operator actions |
| **Projections** | Local copies of Master Data's module registry, config schemas, feature flag definitions | **Reference table** (replicated to all nodes) | Event consumers (synced from Master Data events) |
| **Tenant configuration** | Module enablement, flag overrides, config values, integration profiles | **Distributed by `iq_tenant_id`** | Admin UI, provisioning workflows, API |

Module and feature reference data (what modules exist, what flags are defined, what config schemas are declared) is owned by the [Master Data module](../master-data/01-schema-design.md). The Configurator maintains **local read projections** of this data in its own schema, kept in sync via Master Data's domain events. All config resolution queries JOIN only within the `configurator` schema — no cross-schema queries.

Tenant configuration data follows the standard distribution pattern: all of a tenant's configuration co-locates on the same shard as the tenant's data in other modules.

---

## 2. Organization and tenant hierarchy

### Hierarchy

```
Organization (e.g., "AIIMS", "Apollo Hospitals")
├── Tenant (e.g., "AIIMS Delhi")
├── Tenant (e.g., "AIIMS Patna")
└── Tenant (e.g., "AIIMS Jodhpur")
```

An organization owns one or more tenants. A tenant belongs to exactly one organization. Tenants within an organization may optionally form a hierarchy via `parent_tenant_id` (e.g., AIIMS Delhi → AIIMS Delhi Trauma Centre), but this is organizational metadata — each tenant remains an independent operational unit with its own configs, modules, and data. The hierarchy supports:

- **Hospital chains** — Apollo Hospitals (org) → Apollo Chennai, Apollo Hyderabad, Apollo Delhi (tenants)
- **Medical colleges** — AIIMS (org) → AIIMS Delhi, AIIMS Patna (tenants)
- **Standalone hospitals** — City Hospital (org) → City Hospital (single tenant)

### Tenant hierarchy within an organization

> The `parent_tenant_id` column ships in the MVP schema. The tree view admin UI that consumes it is **Post-launch**.

Tenants carry a nullable `parent_tenant_id` column — a self-reference to another tenant within the same organization. This captures the organizational reporting structure (regional hub → satellite facility → sub-unit) without affecting how tenants operate:

```
Organization: AIIMS
├── Tenant: AIIMS Delhi                    (parent_tenant_id = NULL)
│   ├── Tenant: AIIMS Delhi Trauma Centre  (parent_tenant_id = AIIMS Delhi)
│   └── Tenant: AIIMS Delhi Cardio Centre  (parent_tenant_id = AIIMS Delhi)
├── Tenant: AIIMS Patna                    (parent_tenant_id = NULL)
└── Tenant: AIIMS Jodhpur                  (parent_tenant_id = NULL)
```

What this enables:
- **Admin UI** renders a tree view under each org instead of a flat list
- **AuthZ** can optionally reference hierarchy in Cerbos policies (e.g., "regional admin of AIIMS Delhi can also admin its child tenants") — a policy choice, not a schema enforcement
- **Product helpers** — "assign this role to all child tenants" is a convenience query (`WHERE parent_tenant_id = :id`), not a cascade

What this deliberately does NOT do:
- No config inheritance — child does not inherit parent's feature flags or module configs
- No automatic access propagation — admin of parent does not automatically access child tenants
- No cascade on decommissioning — decommissioning a parent does not decommission children

These hierarchies are realistically 2–3 levels deep, so a simple self-referencing column is sufficient.

### Why organizations and tenants are both reference tables

Both `organizations` and `tenants` are Citus reference tables (replicated to all nodes), not distributed tables. This is a deliberate deviation from the "every table distributed by `iq_tenant_id`" default, justified by:

1. **Row count.** A large deployment might have 20 organizations and 200 tenants. Replication cost is negligible.
2. **Universal read pattern.** Every module queries tenant metadata (timezone, locale, provisioning status) on startup and periodically. Reference tables make these lookups node-local from any shard.
3. **Cross-tenant queries are normal.** Platform operators listing all tenants, organization admins viewing their hospitals — these are routine admin operations, not exceptional. A distributed table would scatter every such query.
4. **The `tenants` table is NOT tenant-scoped data.** It is metadata *about* tenants. The `iq_tenant_id` column is the primary key (the identity of the tenant), not a distribution differentiator in the usual sense.

The `organizations` table has no `iq_tenant_id` column at all — it sits above the tenant level. This is the only module where a table legitimately lacks `iq_tenant_id`, and reference table distribution resolves the Citus requirement.

### Organization types

```
'hospital_chain'        — Multi-hospital corporate group (Apollo, Fortis, Max)
'medical_college'       — Teaching hospital network (AIIMS, JIPMER)
'standalone_hospital'   — Single independent hospital
'government_network'    — Government health directorate managing multiple facilities
```

### Tenant types

```
'full_platform'   — All modules available, full HIMS deployment
'fragmented'      — Subset of modules, co-existing with legacy systems (the primary adoption model per ADR-0002)
'lite'            — Minimal deployment (e.g., embedded mode for a small clinic)
```

### Tenant provisioning status

```
'provisioning'     → 'active'     — Normal lifecycle
'active'           → 'suspended'  — Administrative hold (billing, compliance)
'suspended'        → 'active'     — Reactivation
'active'           → 'decommissioned'  — Permanent shutdown
'suspended'        → 'decommissioned'  — Shutdown from suspended state
```

`decommissioned` is terminal. Data retention for decommissioned tenants is governed by regulatory requirements (DPDP Act, NABH) and handled by a separate archival process, not by the Configurator schema.

### Cerbos scope key

Each tenant carries a `cerbos_scope_key` column — the scope identifier that Cerbos policies use for tenant-specific authorization overrides. This lives on the `tenants` table rather than in a separate mapping table because the relationship is 1:1 (one tenant, one scope key) and having it on the tenant record avoids a JOIN during the most common lookup.

The Configurator publishes this mapping to the Cerbos policy deployment pipeline. When Cerbos evaluates a request with `iq_tenant_id = X`, the PDP resolves the scope via this mapping.

---

## 3. Module enablement

The module registry (`modules`), config schema declarations (`module_config_schemas`), and feature flag definitions (`feature_flags`) are owned by [Master Data](../master-data/01-schema-design.md). This section covers the per-tenant enablement state.

### Module enablement (`tenant_modules`)

Which modules are active for each tenant. This is the mechanism behind fragmented adoption — a hospital running only OPD + Lab + Pharmacy has three rows in `tenant_modules` (plus the four core modules, which are always enabled and seeded during provisioning). The `module_id` column references `configurator.module_projection.id` (local projection of Master Data's module registry, kept in sync via events).

Design decisions:

- **Core modules are always enabled.** The provisioning workflow seeds `tenant_modules` rows for all four core modules with `is_core_override = true`. These cannot be disabled through the admin UI. The database enforces this with a CHECK constraint: `NOT (is_core_override AND NOT is_enabled)` — defense-in-depth against API bypass.
- **Enable/disable is a soft state.** Disabling a module sets `is_enabled = false` and records `disabled_at`. The module's data is not deleted — re-enabling restores access. This supports the "try a module, turn it off, turn it back on" workflow without data loss.
- **BFF route filtering.** The BFF reads `tenant_modules` (cached) to determine which module routes to expose in the frontend. A disabled module's routes are not rendered in the navigation.

---

## 4. Feature flag overrides

Feature flag definitions are owned by [Master Data](../master-data/01-schema-design.md). The Configurator maintains a local projection (`feature_flag_projection`) synced via events, stores per-tenant overrides in `tenant_feature_flags` (distributed by `iq_tenant_id`), and serves the resolved effective value. All JOINs are within the `configurator` schema.

### Resolution logic

When a module calls the Configurator's feature flag API (`GET /flags/{flag_name}?iq_tenant_id={id}`):

1. Look up `configurator.tenant_feature_flags` for this tenant + flag combination
2. If override exists and `is_enabled = true`, return override `value`
3. If no override, return `configurator.feature_flag_projection.default_value`

This is a single query with a LEFT JOIN from `configurator.feature_flag_projection` (reference, replicated to all nodes) to `configurator.tenant_feature_flags` (distributed). All tables are in the `configurator` schema.

### Flag resolution and module enablement

The recommended flag resolution query includes a module enablement check: JOIN through `feature_flag_projection.module_id` → `configurator.tenant_modules` to exclude flags for disabled modules. If a module is disabled for a tenant, its flag overrides are preserved in `tenant_feature_flags` (for re-enablement) but excluded from resolution results.

### Cache TTL

Feature flags use a 5-minute cache TTL at consuming modules (per HLD-02 §3.5). The Configurator publishes `feature-flag.changed` events for immediate invalidation when rapid toggling is needed (e.g., disabling a broken feature).

---

## 5. Tenant module configuration

### Config values (`tenant_module_configs`)

Stores the actual configuration values for each module per tenant. The `config_values` JSONB column holds the settings, validated against the module's declared config schema via `configurator.config_schema_projection` (local projection of Master Data's `module_config_schemas`, kept in sync via events).

This is a justified use of JSONB per [database principle §12](../../analysis/03-database-principles.md#12-json-columns-for-truly-unstructured-data-only): the shape of configuration varies per module (Pharmacy has dispensation windows, OPD has appointment slots, Lab has auto-release thresholds). A relational model would require either a module-specific config table per module (42+ tables) or an EAV pattern (worse). JSONB with JSON Schema validation is the right tool.

### ETag for cache invalidation

Each `tenant_module_configs` row carries an `etag` column (a hash of the config content). Modules poll the Configurator's configuration API with `If-None-Match: <etag>`. If the config hasn't changed, the API returns 304 Not Modified. This supports the efficient polling pattern described in HLD-02 §3.3 without full-payload transfers on every poll.

The `etag` is regenerated on every config update. The Configurator also publishes a `config.changed` event for push-based invalidation, so modules don't rely solely on polling.

### Optimistic locking on writes

The `etag` column also serves as a concurrency control mechanism for writes. The Configurator API enforces `If-Match: <etag>` on config update requests. If the stored ETag doesn't match the client's ETag, the API returns `409 Conflict` — the client must re-fetch, re-merge, and re-save. This prevents the lost-update problem when two admins edit the same config simultaneously.

### Config versioning

`schema_version` on `tenant_module_configs` tracks which version of the module's config schema the values target. When a module upgrades its schema, existing config values are validated against the new schema. If validation fails, the admin UI highlights the tenant as needing config migration.

### Runtime hydration across schema versions

> **Post-launch.** Becomes relevant when the first module ships a config schema upgrade. MVP modules ship v1.0.0 schemas.

When a module upgrades its config schema (e.g., OPD ships v1.1.0 adding `telemedicine_enabled`), existing tenants still have v1.0.0 config values. The Configurator API handles this by merging: it takes the tenant's stored `config_values`, overlays them onto the latest `module_config_schemas.defaults`, and serves the merged result. Missing keys get defaults from the new schema; existing keys are preserved.

The ETag on the API response reflects the **effective** (merged) config, not just the stored `config_values`. When a schema upgrade introduces new defaults, the effective ETag changes even if the tenant's stored config didn't. This ensures modules polling with `If-None-Match` receive the updated defaults. The stored `etag` column is updated only on explicit saves — the API-computed ETag may differ from the stored ETag when schema defaults have changed.

### Nested and scoped config structures

> **Post-launch.** The JSONB column supports this from day one; module teams use it when their domain requires location-specific settings.

The `config_values` JSONB naturally supports nested and scoped structures — a module whose domain requires location-specific or department-specific settings can declare that shape in its config schema, and the Configurator validates and stores it without schema changes.

---

## 6. Integration profiles

Integration profiles define how a tenant connects to external systems — lab analyzers (HL7v2), ABDM gateway (FHIR), PACS (DICOM), insurance clearinghouses (REST), legacy HIS installations (various).

### Design decisions

- **Credentials are never stored in the database.** The `credential_vault_ref` column stores a reference to the credential in the platform's secret store (Azure Key Vault or equivalent). The Configurator's API resolves this reference at runtime when the Integration Hub requests connection details.

- **Mapping rules as JSONB.** Integration profiles carry transformation/mapping rules (e.g., "map local drug code X to SNOMED code Y") as JSONB. This is justified per principle §12: mapping rules vary wildly per integration type and are consumed by the Integration Hub's transformation engine, not queried/filtered by SQL.

- **Protocol types.** The platform supports five integration protocol families, matching the inter-module communication hierarchy from [HLD-03 §7](../../hld/03-module-shape-template.md#7-inter-module-communication-hierarchy):

```
'fhir'       — FHIR REST API (ABDM, health information exchanges)
'hl7v2'      — HL7v2 MLLP/TCP (lab analyzers, legacy HIS, PACS bridges)
'dicom'      — DICOM (PACS, modality worklists)
'rest'       — Generic REST API (insurance, third-party SaaS)
'custom'     — Vendor-specific protocols requiring custom adapters
```

- **Protocol version.** Each profile carries a `protocol_version` column that specifies the exact version of the protocol the external system supports. This is essential because protocol versions have structural differences that affect parsing and translation:

  - **FHIR:** `'4.0.1'` (R4, required for ABDM), `'3.0.2'` (STU3, some older hospital systems), `'4.3.0'` (R4B), `'5.0.0'` (R5). Resource structures differ between versions — a FHIR STU3 `Patient` has different fields than R4.
  - **HL7v2:** `'2.3'`, `'2.3.1'`, `'2.5'`, `'2.5.1'`. Most Indian lab analyzers speak 2.3 or 2.5. Message segment availability and field positions differ between versions.
  - **DICOM:** Largely backward-compatible; version is recorded for reference but rarely affects parsing.
  - **REST / custom:** Version refers to the external API version (e.g., `'v2'`, `'2024-01'`).

  The Integration Hub uses `protocol_version` to select the correct parser/translator. ABDM integrations will always be `protocol = 'fhir'`, `protocol_version = '4.0.1'`. The column is nullable — for new integrations where the version is not yet known, null signals "determine during setup."

  See [dev-doubts/01-analysis.md](./dev-doubts/01-analysis.md) for the full analysis of why protocol versioning matters.

- **Direction.** Each profile specifies whether the integration is `'inbound'` (external system pushes to the platform), `'outbound'` (platform pushes to external system), or `'bidirectional'`.

- **Multiple profiles per target.** A tenant may have multiple integration profiles for the same `target_system` and `protocol` — for example, separate test and production endpoints for the ABDM gateway, or multiple lab analyzers of the same model. There is no unique constraint on `(iq_tenant_id, target_system, protocol)` by design. When a tenant has multiple profiles for the same target system (e.g., three identical Cobas 6000 analyzers), the Integration Hub distinguishes them via `connection_config` fields — IP address, port, HL7v2 Sending Facility (MSH-4), DICOM AE Title. Combined with the profile's `name` and `id`, this provides unambiguous routing.

- **Inter-tenant integration (Post-launch).** For hub-and-spoke models (e.g., a central reference lab receiving orders from satellite clinics), inter-tenant communication uses internal integration profiles with `target_system` set to `'internal:<tenant-slug>'` and `protocol = 'rest'`. The Integration Hub routes these internally rather than externalizing the traffic. The Configurator stores the profile; the Hub resolves the routing.

---

## 7. Tenant provisioning

### Provisioning workflow

When a platform operator creates a new tenant, the Configurator orchestrates a multi-step provisioning workflow:

1. Create organization record (if new org)
2. Create tenant record with `provisioning_status = 'provisioning'`
3. Seed `tenant_modules` rows for all four core modules
4. Create default feature flag overrides (if any tenant-type-specific defaults)
5. Call User Management API to create the initial tenant admin user
6. Publish `tenant.provisioned` event
7. Wait for downstream modules to acknowledge (EMPI initializes patient index, Master Data makes reference data available, enabled feature modules initialize schemas)
8. Set `provisioning_status = 'active'`

### Provisioning log (`tenant_provisioning_log`)

Each provisioning step is recorded in `tenant_provisioning_log` with its status, timestamps, and any error details. This provides:

- **Visibility** into which steps completed and which failed during provisioning
- **Retryability** — a failed step can be retried without re-running completed steps
- **Audit trail** — who initiated provisioning, when each step completed

Provisioning steps:
```
'org_created'              — Organization record created (skipped if org exists)
'tenant_created'           — Tenant record created
'core_modules_seeded'      — Core module enablement rows created
'feature_flags_seeded'     — Tenant-type-specific feature flag overrides created (skipped if none)
'admin_user_created'       — Initial admin user created via User Management
'event_published'          — tenant.provisioned event published
'downstream_acknowledged'  — All enabled modules confirmed initialization
```

Step statuses:
```
'pending'      — Not yet started
'in_progress'  — Currently executing
'completed'    — Successfully finished
'failed'       — Failed (error_details captures why)
'skipped'      — Not applicable (e.g., org_created when org already exists)
```

### Decommissioning workflow

> **Post-launch.** No tenants are decommissioned during initial rollout.

When a tenant is decommissioned (`provisioning_status = 'decommissioned'`):

1. All `integration_profiles` for the tenant are set to `is_active = false` — prevents the Integration Hub from continuing to poll external systems on behalf of a decommissioned tenant
2. A `tenant.decommissioned` event is published — all modules stop accepting new operations for the tenant
3. Data retention is handled by a separate archival process governed by regulatory requirements (DPDP Act, NABH)

The decommissioning workflow does NOT delete `tenant_modules`, `tenant_feature_flags`, or `tenant_module_configs` — these are preserved for audit and potential data recovery.

---

## 8. Module registration lifecycle

Module registration (how modules announce themselves to the platform via migrations) is documented in the [Master Data LLD](../master-data/01-schema-design.md), since the target tables (`modules`, `module_config_schemas`, `feature_flags`) are owned by Master Data. See also [dev-doubts/01-analysis.md §3](./dev-doubts/01-analysis.md) for the original analysis.

When a module registers itself in Master Data, the Configurator receives the resulting events (`module.registered`, `config-schema.declared`, `feature-flag.defined`) and upserts local projections. A platform operator or hospital admin then enables the module for specific tenants via the Configurator's admin UI — creating `tenant_modules` and `tenant_module_configs` rows in the Configurator schema. All resolution queries run entirely within the `configurator` schema using these projections.

---

## 9. Config change audit

All changes to configuration data are recorded in `config_change_audit`. This is the Configurator's equivalent of User Management's `permission_change_audit`.

### What is audited

- Tenant lifecycle changes (provisioning, suspension, reactivation, decommissioning)
- Module enablement/disablement per tenant
- Feature flag tenant override changes (platform-wide flag definition changes are audited in Master Data)
- Module configuration value changes
- Integration profile changes
- Organization changes

### Entity types

```
'tenant'                — Tenant status/metadata changes
'organization'          — Organization changes (tracked with the acting admin's tenant context)
'module_enablement'     — Module enabled/disabled for a tenant
'feature_flag'          — Tenant flag override changed
'module_config'         — Module configuration values changed
'integration_profile'   — Integration profile created/modified/deactivated
```

### Actions

```
'created'          — New entity created
'updated'          — Entity modified
'enabled'          — Module or flag enabled
'disabled'         — Module or flag disabled
'suspended'        — Tenant suspended
'reactivated'      — Tenant reactivated
'decommissioned'   — Tenant permanently shut down
```

### Audit distribution rule

For all entity types except `organization`, the `iq_tenant_id` on the audit record is the **target** tenant — the tenant whose configuration was changed. When a regional admin from Chennai disables Madurai's pharmacy, the audit record has `iq_tenant_id = tnt-madurai` and `changed_by = (the Chennai admin's user ID)`. This ensures that querying a tenant's audit history returns all changes to that tenant's configuration, regardless of which admin made them.

### Organization-level audit exception

Organization changes are not naturally tenant-scoped (organizations sit above tenants). When a platform operator modifies an organization, the audit record uses the operator's current `iq_tenant_id` (from their JWT) as the distribution key. This is acceptable because:
- The audit record is about who made the change, and the operator is always authenticated in a tenant context
- Querying "all changes made by operator X" naturally filters to the operator's tenant
- Cross-tenant audit queries (platform-level audit dashboard) are explicit scatter queries, which is fine for admin operations

---

## 10. Citus distribution strategy

| Table | Distribution | Color | Notes |
|-------|-------------|-------|-------|
| `organizations` | **Reference table** | Yellow | Few rows, joined from any shard |
| `tenants` | **Reference table** | Yellow | Few rows, queried by all modules |
| `module_projection` | **Reference table** | Yellow | Local projection of Master Data's `modules`, synced via events |
| `config_schema_projection` | **Reference table** | Yellow | Local projection of Master Data's `module_config_schemas`, synced via events |
| `feature_flag_projection` | **Reference table** | Yellow | Local projection of Master Data's `feature_flags`, synced via events |
| `tenant_modules` | Distributed by `iq_tenant_id` | Green | Co-located with all tenant data |
| `tenant_feature_flags` | Distributed by `iq_tenant_id` | Green | Co-located with tenant data |
| `tenant_module_configs` | Distributed by `iq_tenant_id` | Green | Co-located with tenant data |
| `integration_profiles` | Distributed by `iq_tenant_id` | Green | Co-located with tenant data |
| `tenant_provisioning_log` | Distributed by `iq_tenant_id` | Green | Append-only, co-located |
| `config_change_audit` | Distributed by `iq_tenant_id` | Green | Append-only, co-located |

All JOINs are within the `configurator` schema. The three projection tables replicate the module/feature registry data that Master Data owns — the Configurator never queries `master_data.*` directly.

### Co-location note

All distributed tables use `iq_tenant_id` as the distribution key. JOINs between `tenant_modules`, `tenant_feature_flags`, `tenant_module_configs`, and `integration_profiles` within a single tenant are shard-local.

JOINs from distributed tables to reference tables (`organizations`, `tenants`, `module_projection`, `config_schema_projection`, `feature_flag_projection`) are always node-local because reference tables are replicated to every node.

### No blue tables

Unlike User Management (which has better-auth tables distributed by `id`/`user_id`), the Configurator has no special-distribution tables. Every table is either a reference table or distributed by `iq_tenant_id`.

---

## 11. Audit column exceptions

[Database principle §5](../../analysis/03-database-principles.md#5-every-table-has-standard-audit-columns) requires `created_at`, `updated_at`, `created_by`, `updated_by` on every table. The following tables deviate:

| Table | Missing | Justification |
|-------|---------|---------------|
| `module_projection` | `created_by`, `updated_by` | Synced from Master Data events — the author is the deployment pipeline, not a user. Uses `synced_at` instead of `updated_at`. |
| `config_schema_projection` | `created_by`, `updated_by` | Same as `module_projection` — event-sourced, no user actor. |
| `feature_flag_projection` | `created_by`, `updated_by` | Same as `module_projection` — event-sourced, no user actor. |
| `tenant_modules` | standard names | Uses semantic equivalents: `enabled_at`/`enabled_by` for creation, `disabled_at` for soft-disable lifecycle |
| `tenant_feature_flags` | `created_by` | Uses `enabled_by` as semantic `created_by` — overrides are activated (enabled) at creation time, same pattern as `tenant_modules` |
| `tenant_provisioning_log` | `updated_at`, `updated_by` | Append-only steps — each step is written once with `started_at`/`completed_at`. Steps are not edited after completion. |
| `config_change_audit` | all four | IS the audit trail — uses `changed_at`/`changed_by`. Meta-auditing is unnecessary. |

---

## 12. Events published

| Event | When | Payload includes | Consumers |
|-------|------|-----------------|-----------|
| `tenant.provisioned` | Provisioning workflow completes | `iq_tenant_id`, `org_id`, `tenant_type`, enabled module list | All modules (initialize tenant-specific state) |
| `tenant.suspended` | Tenant suspended | `iq_tenant_id`, `reason` | All modules (block new operations for tenant) |
| `tenant.reactivated` | Tenant reactivated | `iq_tenant_id` | All modules (resume operations) |
| `tenant.decommissioned` | Tenant permanently shut down *(Post-launch)* | `iq_tenant_id`, `reason` | All modules (cease operations), Integration Hub (deactivate polling) |
| `tenant.org_changed` | Tenant re-parented to a different org *(Post-launch)* | `iq_tenant_id`, `old_org_id`, `new_org_id` | User Management (recalculate cross-tenant admin access), Cerbos (update scope policies) |
| `config.changed` | Module config values updated | `iq_tenant_id`, `module_id`, new `etag` | Affected module (refresh cached config) |
| `feature-flag.changed` | Flag toggled | `iq_tenant_id` (null if platform-wide), `flag_name`, new value | All modules caching flags |
| `integration-profile.changed` | Integration profile created, modified, or deactivated | `iq_tenant_id`, `profile_id`, `is_active` | Integration Hub (update routing, start/stop polling) |
| `module.enabled` | Module enabled for tenant | `iq_tenant_id`, `module_id` | BFF (update route list), affected module |
| `module.disabled` | Module disabled for tenant | `iq_tenant_id`, `module_id` | BFF (remove routes), affected module |

### Events consumed (from Master Data)

The Configurator subscribes to all module/feature registry events published by the [Master Data module](../master-data/01-schema-design.md) and upserts local projections on receipt:

| Event consumed | Projection updated | Action |
|----------------|--------------------|--------|
| `module.registered` | `module_projection` | INSERT new module |
| `module.updated` | `module_projection` | UPDATE version, display_name, category |
| `config-schema.declared` | `config_schema_projection` | UPSERT schema + defaults for module/version |
| `feature-flag.defined` | `feature_flag_projection` | INSERT new flag |
| `feature-flag.updated` | `feature_flag_projection` | UPDATE default_value, value_schema, flag_type |

All events carry rich payloads (all fields the projection needs), so the consumer never calls back to Master Data's API. If an event is missed (unlikely with InProcessEventBus; relevant when upgrading to a durable bus), a full-sync reconciliation job can rebuild projections from Master Data's API.

---

## 13. Dependencies

The Configurator depends on:

- **User Management** — for authentication and authorization of admin users. Platform operators and hospital admins must authenticate before modifying configuration. This dependency is via the identity adapter and PEP middleware (standard module shape), not via database-level coupling.
- **Master Data** — for module registry, config schema declarations, and feature flag definitions. This is an **event-driven** dependency: the Configurator subscribes to Master Data's domain events and maintains local read projections (`module_projection`, `config_schema_projection`, `feature_flag_projection`) in its own schema. The Configurator never queries `master_data.*` directly — all resolution queries run within the `configurator` schema. If Master Data is temporarily unavailable, the Configurator continues serving from its projections (eventually consistent).

The Configurator has no dependency on EMPI or any feature module. It is consumed by all modules (they read config from the Configurator's API), but that dependency is one-directional.

---

## 14. Cross-module identifier references

| Column | On table | References | In module |
|--------|----------|-----------|-----------|
| `users.org_id` | `user_management.users` | `configurator.organizations.id` | User Management |
| `users.iq_tenant_id` | `user_management.users` | `configurator.tenants.iq_tenant_id` | User Management |
| `tenant_modules.module_id` | `configurator.tenant_modules` | `configurator.module_projection.id` (local projection) | Configurator (projection sourced from Master Data) |
| `tenant_feature_flags.feature_flag_id` | `configurator.tenant_feature_flags` | `configurator.feature_flag_projection.id` (local projection) | Configurator (projection sourced from Master Data) |
| `tenant_module_configs.module_id` | `configurator.tenant_module_configs` | `configurator.module_projection.id` (local projection) | Configurator (projection sourced from Master Data) |
| JWT `iq_tenant_id` claim | JWT payload | `configurator.tenants.iq_tenant_id` | All modules |
| JWT `org_id` claim | JWT payload | `configurator.organizations.id` | All modules |

Per [database principle §4](../../analysis/03-database-principles.md#4-no-cross-schema-foreign-keys), there are **no cross-schema references** from Configurator to Master Data. The Configurator's tenant tables reference local projections within the `configurator` schema, not `master_data.*` tables. The projection IDs match Master Data's source IDs by convention (the event consumer preserves the original UUID), but the FK relationship is local: `tenant_modules.module_id → configurator.module_projection.id`. Cross-module identity is maintained through event-driven sync, not database-level coupling.

The `org_id` on `user_management.users` is a UUID that corresponds to `configurator.organizations.id` — a cross-schema reference maintained through the provisioning workflow (plain ID column, no `REFERENCES` constraint).
