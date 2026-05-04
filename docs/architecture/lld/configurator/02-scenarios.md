# Configurator — Operational & Red Team Scenarios

**Purpose:** This document stress-tests the Configurator schema against complex, adversarial real-world hospital operations. It is designed to be used by the architecture team to identify gaps, edge cases, and vulnerabilities in the current LLD. 

It is split into two parts:
1. **Product & Operational Scenarios:** Deep, PM-level hospital workflows that test if the schema can support complex healthcare business models.
2. **Adversarial & Edge-Case Scenarios:** Red-team technical stress tests focusing on data integrity, audit trails, and cache invalidation.

---

## Part 1: Product & Operational Scenarios

### 1. The "Hub and Spoke" Lab Model (Cross-Tenant Routing)

**Operational Reality:** Apollo Hospitals operates a massive central reference lab in Chennai (Tenant A) and a small rural collection clinic (Tenant B). The clinic registers patients and draws blood, but test processing happens in the central lab.

**Architectural Challenge:** How does the Configurator facilitate tenant-to-tenant communication? Tenant B needs to send an HL7 ORM (Order) message to Tenant A. Does the `integration_profiles` schema require this traffic to exit the platform and route back through the external Integration Hub, or is there a concept of an "internal" integration target? Furthermore, how does Tenant B's billing config handle "outsourced processing" while Tenant A handles "internal processing"?

**Vulnerability / Gap:** The `integration_profiles` schema assumes `target_system` is an external entity. There is no native construct for inter-tenant trust or internal routing profiles without paying the latency/security cost of externalizing the traffic.

**Resolution (Post-launch):** Documented in §6. Inter-tenant communication uses integration profiles with `target_system = 'internal:<tenant-slug>'` and `protocol = 'rest'`. The Integration Hub recognizes the `internal:` prefix and routes internally without externalizing. The Configurator stores the profile like any other; the routing intelligence lives in the Hub. Billing for outsourced processing is a Billing module concern, not the Configurator's.

### 2. The 3-Day Rural Health Camp (Ephemeral Tenants)

**Operational Reality:** A government medical college sets up a 3-day eye-camp in a remote village. They need a temporary HIMS instance to register patients, record vitals, and issue spectacles. After 3 days, the camp is closed.

**Architectural Challenge:** Creating the tenant is trivial. However, when the 3 days are up, the tenant is marked `provisioning_status = 'decommissioned'`. What happens to the clinical data? The main hospital needs those patient records merged into their primary EMPI. 

**Vulnerability / Gap:** The Configurator treats all tenants as permanently isolated islands. There is no concept of a "child" tenant, "ephemeral" tenant, or a configuration directive that instructs the EMPI to automatically merge or transfer data to a parent tenant upon decommissioning. 

**Resolution (Deferred — not Configurator's concern):** The Configurator handles the lifecycle: `provisioning_status = 'decommissioned'`, integration profiles deactivated, `tenant.decommissioned` event emitted (§7). The `parent_tenant_id` column on `tenants` (§2) captures the camp→hospital relationship. Data merge and EMPI transfer are the EMPI module's responsibility — triggered by the `tenant.decommissioned` event, using `parent_tenant_id` to know where records should go. The Configurator doesn't own clinical data and shouldn't orchestrate its transfer.

### 3. The "Private Ward" VIP Override (Sub-Tenant Configuration)

**Operational Reality:** In the general wards, the Pharmacy module requires double-verification by two nurses to dispense narcotics. In the VIP / Private ward, the Chief Medical Officer demands this be turned *off* to ensure ultra-fast administration.

**Architectural Challenge:** Both `tenant_module_configs` and `tenant_feature_flags` are strictly scoped by `iq_tenant_id`. 

**Vulnerability / Gap:** The schema lacks sub-tenant (ward, department, or facility-level) configuration granularity. The hospital cannot configure the Pharmacy module differently for the VIP ward without spinning up an entirely separate tenant for the VIP ward, which would fracture patient records and billing.

**Resolution (Post-launch):** Documented in §5. The `config_values` JSONB naturally supports nested and scoped structures. A module whose domain requires location-specific settings declares that shape in its config schema (e.g., a `location_overrides` key with per-ward values). The Configurator validates the full blob against the JSON Schema; the module resolves the effective config by merging base + location context at runtime. No new tables or columns needed — the existing JSONB + JSON Schema validation handles it. The tenant remains one operational unit; the ward is a config scope within the module, not a separate tenant.

### 4. The Regulatory Midnight Switch (Bulk Config Operations)

**Operational Reality:** The National Health Authority (NHA) announces a new mandatory integration parameter for ABDM compliance, effective immediately at midnight. The platform operator needs to update the ABDM `integration_profiles` and feature flags for 50 different fragmented tenants simultaneously.

**Architectural Challenge:** How does a platform operator execute a fleet-wide configuration change?

**Vulnerability / Gap:** There is no platform-wide bulk-update mechanism. Updating 50 tenants requires 50 separate API calls. The `config_change_audit` will track them as 50 manual actions. The Configurator lacks a "configuration template" or "fleet policy" construct to apply changes to multiple tenants at once.

**Resolution (Deferred — operational tooling):** The schema handles 50 individual updates correctly — each produces an audit record, respects ETag concurrency, and emits the appropriate event. Fleet policies and config templates are an API/tooling layer above the schema, additive when needed (a `config_templates` table + a batch-apply endpoint). The audit trail correctly records 50 distinct changes, which is what compliance auditors want — not one opaque "bulk update" entry. No schema change needed; this is a product roadmap item.

### 5. Hospital Acquisition (Org Hierarchy Re-parenting)

**Operational Reality:** Max Healthcare (Org A) acquires a standalone facility, City Hospital (Org B). 

**Architectural Challenge:** The platform operator changes `org_id` on the `tenants` table for City Hospital to point to Org A. 

**Vulnerability / Gap:** Changing the `org_id` in the `tenants` reference table doesn't inherently emit a specific `tenant.org_changed` event in the current LLD. Because User Management relies on `org_id` for cross-tenant regional admin access and Cerbos policies, failing to cascade this hierarchy change will result in broken access controls (Org B admins might still have access, Org A admins won't).

**Resolution (Post-launch):** `tenant.org_changed` event added to §12 with payload `iq_tenant_id`, `old_org_id`, `new_org_id`. User Management consumes this to recalculate cross-tenant admin access. Cerbos consumes it to update scope policies. The Configurator API emits the event when `org_id` is updated on the `tenants` table — the schema supports this; the event contract is now documented.

### 6. The "Shadow" Training Environment (Tenant Cloning)

**Operational Reality:** Before deploying a major IPD module upgrade, a hospital requests a "shadow" training environment. They want an exact mirror of their production configurations, feature flags, and module enablements so nurses can practice safely.

**Architectural Challenge:** How do we clone `tenant_modules`, `tenant_module_configs`, and `tenant_feature_flags` from `tnt-prod` to `tnt-training`?

**Vulnerability / Gap:** The schema has no native cloning, templating, or snapshotting mechanism. Replicating a tenant's setup requires a bespoke script to read all rows from one `iq_tenant_id` and insert them into another, while carefully scrubbing `integration_profiles` to ensure the training environment doesn't accidentally send real HL7 messages to production lab analyzers.

**Resolution (Deferred — operational runbook):** The schema supports cloning by design: all tenant-scoped tables are distributed by `iq_tenant_id`, so a clone is `SELECT * FROM table WHERE iq_tenant_id = :source` → `INSERT` with `:target` tenant ID. The critical step is scrubbing `integration_profiles` (`is_active = false` and clearing `credential_vault_ref` for the clone) to prevent the training environment from sending real messages. This is an operational runbook procedure, not a schema-level feature. A future `clone_tenant` API endpoint can automate it, but the schema doesn't need changes.

---

## Part 2: Adversarial & Edge-Case Scenarios

### 7. The Cross-Tenant Organization Admin (Audit Log Leak)

**Adversarial Challenge:** Dr. Singh, a regional admin logged into "Apollo Chennai" (`tnt-chennai`), disables the Pharmacy module for "Apollo Madurai" (`tnt-madurai`). 

**Current Schema Response:** The `config_change_audit` table is distributed by `iq_tenant_id`. The LLD states: "Organization changes are tracked with the acting admin's tenant context."

**Identified Vulnerability (Audit Trail Fracture):** The audit record for disabling Madurai's pharmacy goes to the Chennai shard. If a compliance officer queries Madurai's audit logs (`WHERE iq_tenant_id = 'tnt-madurai'`), the disablement event is completely missing.

**Resolution (MVP):** Clarified in §9 (audit distribution rule). For all entity types except `organization`, the `iq_tenant_id` on the audit record is the **target** tenant — Madurai, not Chennai. The `changed_by` field captures who (Dr. Singh). The scenario's concern about audit fracture applies only to `organization`-type changes (which use the actor's tenant, documented as the explicit exception). The `config_change_audit.iq_tenant_id` description in schema-reference.json has been corrected.

### 8. Feature Flag JSON Corruption

**Adversarial Challenge:** The OPD module registers a feature flag `opd_advanced_triage` with `flag_type = 'json'`. A hospital admin overrides this flag but makes a typo, providing `{"triage_levels": "five"}` instead of an integer.

**Current Schema Response:** The `tenant_feature_flags` stores the value as valid JSON, but invalid schema.

**Identified Vulnerability (Lack of Flag Validation):** While `tenant_module_configs` uses rigid JSON Schema validation, `feature_flags` with `flag_type = 'json'` have *no* schema validation mechanism in the database. The admin UI allows the save, and the OPD module will crash at runtime.

**Resolution (Post-launch):** `value_schema JSONB` column added to `feature_flags` (§4). For `json`-type flags, the module developer provides a JSON Schema in this column when registering the flag. The API validates override values against it before saving — same pattern as `module_config_schemas.config_schema` validates `tenant_module_configs.config_values`. The column is nullable and ships in MVP; validation is Post-launch since `json`-type flags are Post-launch.

### 9. Ambiguous Integration Profiles

**Adversarial Challenge:** AIIMS Delhi has three identical Cobas 6000 lab analyzers, all using HL7v2.3 inbound. When the Integration Hub receives a message, how does it know which profile to use?

**Current Schema Response:** The schema omits a unique constraint on `(iq_tenant_id, target_system, protocol)`.

**Identified Vulnerability (Routing Ambiguity):** There is no `is_primary` flag, routing key, or equipment identifier (like an AETitle or Sending Facility) stored natively on the profile. The Hub must parse the `connection_config` JSONB to figure out routing, making database-level filtering impossible.

**Resolution (MVP):** Documented in §6. The Integration Hub disambiguates via `connection_config` JSONB fields — IP address, port, HL7v2 Sending Facility (MSH-4), DICOM AE Title. Combined with the profile's `name` and `id`, this provides unambiguous routing. A dedicated `routing_key` column was considered but rejected: routing identifiers are protocol-specific (MSH-4 for HL7v2, AETitle for DICOM, endpoint URL for FHIR) and already live naturally in `connection_config`. Extracting one field into a top-level column would only cover one protocol. The Hub already parses `connection_config` for connection details — adding routing resolution to the same parse is zero additional cost.

### 10. Decommissioned Tenant Zombie Integrations

**Adversarial Challenge:** A clinic is marked `decommissioned`. What happens to its active external integrations (e.g., polling an insurance clearinghouse)?

**Current Schema Response:** `provisioning_status` is updated to decommissioned.

**Identified Vulnerability (Cascading State Failure):** `integration_profiles.is_active` does not automatically cascade to `false`. The Integration Hub might continue polling external systems on behalf of a decommissioned tenant, wasting resources and violating data agreements.

**Resolution (Post-launch):** Decommissioning workflow added to §7. Step 1: all `integration_profiles` for the tenant are set to `is_active = false`. Step 2: `tenant.decommissioned` event is emitted (§12) — the Integration Hub is an explicit consumer and stops all polling. Data retention is handled by a separate archival process. The cascade is application-level (API workflow), not a database trigger — consistent with the platform's event-driven architecture.

### 11. The Config Schema Migration Race Condition

**Adversarial Challenge:** The Pharmacy module upgrades to v1.1.0 (new required parameter). Before an admin logs in to migrate the config via UI, the Pharmacy module backend restarts and polls the Configurator.

**Current Schema Response:** The Configurator returns the existing `1.0.0` config.

**Identified Vulnerability (Runtime Schema Mismatch):** The Pharmacy backend is running v1.1.0 code and expects the new configuration shape. If the Configurator API blindly returns `1.0.0`, the module might crash. The API lacks a "runtime hydration" mechanism to apply `1.1.0` defaults dynamically.

**Resolution (Post-launch):** Runtime hydration pattern documented in §5. The Configurator API merges: latest `module_config_schemas.defaults` ← tenant's stored `config_values`. Missing keys get defaults from the new schema; existing keys are preserved. The Pharmacy module receives a v1.1.0-shaped config even though the tenant hasn't explicitly saved one. The admin UI flags the tenant as "needs config review" but the module doesn't crash.

### 12. ETag Drift on Dynamic Defaults

**Adversarial Challenge:** Assuming the Configurator API *does* dynamically merge the `1.1.0` defaults into the `1.0.0` config for the scenario above. How does ETag caching work?

**Current Schema Response:** The `etag` column is statically stored and updated only on manual save.

**Identified Vulnerability (Stale Cache Invalidations):** If defaults are merged on the fly, the served JSON payload changes, but the database `etag` doesn't. The module polls with `If-None-Match: hash-v1`, receives `304 Not Modified`, and fails to receive the newly introduced default values.

**Resolution (Post-launch):** Documented in §5. The API-served ETag reflects the **effective** (merged) config, not just the stored `config_values` column. When a schema upgrade introduces new defaults, the effective ETag changes even if the tenant's stored config didn't. The stored `etag` column is updated only on explicit saves — the API computes the response ETag from the merged result. Modules polling with `If-None-Match` will get a cache miss and receive the updated defaults.

### 13. Core Module Override Bypass

**Adversarial Challenge:** A malicious admin attempts to disable the Configurator module itself.

**Current Schema Response:** The core modules are seeded with `is_core_override = true`.

**Identified Vulnerability (Missing Check Constraint):** There is no database-level constraint preventing `is_enabled = false` when `is_core_override = true`. It relies entirely on the API to enforce the rule, violating defense-in-depth principles.

**Resolution (MVP):** CHECK constraint `NOT (is_core_override AND NOT is_enabled)` added to `tenant_modules` (§3, schema-reference.json, ERD). The database now rejects any attempt to disable a core module, regardless of whether it comes through the API or direct SQL. Defense-in-depth: the API also enforces the rule, but the DB backs it up.

### 14. Feature Flag "Module Un-deployment" Orphan

**Adversarial Challenge:** A hospital disables the OPD module permanently. What happens to its feature flag overrides?

**Current Schema Response:** The overrides remain active in `tenant_feature_flags`.

**Identified Vulnerability (Data Leakage):** Downstream consumers querying "all active feature flags" will receive overrides for disabled modules because the query does not `JOIN tenant_modules`. The frontend might attempt to render disabled features.

**Resolution (MVP):** Documented in §4 (flag resolution and module enablement). The recommended resolution query JOINs through `feature_flags.module_id` → `tenant_modules` to exclude flags for disabled modules. Overrides are preserved in `tenant_feature_flags` for re-enablement, but excluded from resolution results. The Configurator's flag API enforces this JOIN; consumers querying "all active flags for this tenant" never receive flags for modules the tenant doesn't use.

### 15. Module Dependency Chain Enforcement

**Operational Reality:** A multi-specialty hospital has enabled IPD (Inpatient), which depends on OPD (for patient registration flow and admission from OPD queue) and Lab (for inpatient order routing). A hospital admin, trying to reduce license costs, disables the OPD module.

**Architectural Challenge:** The `tenant_modules` table tracks enablement per module independently. There is no inter-module dependency mechanism that prevents disabling a module that other enabled modules depend on.

**Resolution — not a schema gap:** The platform is designed for fragmented adoption (ADR-0002). Modules communicate via events and the Integration Hub, not via direct DB coupling. A hospital running IPD without our OPD would use their existing registration system via the Integration Hub. Disabling our OPD while IPD is active is a valid operational choice, not necessarily a breakage. The four core modules are the only hard dependencies, and those are protected by `is_core` + the CHECK constraint `NOT (is_core_override AND NOT is_enabled)`. The admin UI may show soft warnings ("IPD commonly uses OPD for registration"), but enforcing dependency chains at the schema level would impose artificial coupling that contradicts the fragmentable model.

### 16. Concurrent Config Update (Lost Update Problem)

**Operational Reality:** Two hospital admins open the Pharmacy config page at the same time. Admin A changes `dispensation_window_minutes` from 30 to 45 and saves. Admin B (who loaded the page before A's save) changes `require_double_verification_controlled` to `false` and saves — inadvertently reverting A's dispensation window change back to 30, because B's payload carries the stale value.

**Architectural Challenge:** The `tenant_module_configs` row has an `etag` column, but the concurrency control pattern (optimistic locking via `If-Match`) is not documented in the schema design. Without the API enforcing ETag matching on writes, the second save silently overwrites the first.

**Vulnerability / Gap:** The ETag column exists but has no documented write-side contract. Without `If-Match` enforcement, the ETag is only useful for read-side caching (`If-None-Match` / 304), leaving the lost-update problem unaddressed.

**Resolution (MVP):** Optimistic locking write contract documented in §5. The API enforces `If-Match: <etag>` on config update requests. If the stored ETag doesn't match, the API returns `409 Conflict` — Admin B's save is rejected, they must re-fetch and re-apply their change on top of Admin A's. This prevents silent overwrites. Field-level merge (automatically combining A's and B's non-conflicting changes) is deferred as API-layer sophistication beyond MVP.

### 17. Audit Trail Distribution for Cross-Tenant Admin Actions

**Operational Reality:** Dr. Singh, a regional admin logged into Apollo Chennai (`tnt-chennai`), disables the Pharmacy module for Apollo Madurai (`tnt-madurai`). A compliance officer later queries Madurai's audit logs.

**Architectural Challenge:** The `config_change_audit.iq_tenant_id` column description in schema-reference.json says "the admin's tenant context from their JWT." If taken literally, the audit record for Madurai's pharmacy disablement would land on Chennai's shard and be invisible when querying Madurai's history.

**Clarification needed:** For non-organization entity types (`tenant`, `module_enablement`, `feature_flag`, `module_config`, `integration_profile`), the `iq_tenant_id` on the audit record must be the **target** tenant's ID, not the acting admin's. The `changed_by` field captures *who* made the change. Only `organization`-type audit records use the actor's tenant context (because organizations have no natural tenant ID).

**Resolution:** This has been clarified in §9 of the schema design doc (audit distribution rule) and the `config_change_audit.iq_tenant_id` description in schema-reference.json has been updated to reflect the correct semantics.

---

## Summary for the Architecture Agent

When reviewing the LLD and Schema Reference, the Architecture Agent must resolve:

**Resolved in LLD revisions:**

| # | Resolution | Phase | Section |
|---|-----------|-------|---------|
| 1 | Inter-tenant integration routing (`target_system = 'internal:<tenant-slug>'`) | Post-launch | §6 |
| 2 | Sub-tenant config granularity — JSONB supports nested/scoped structures | Post-launch | §5 |
| 3 | Audit distribution semantics — target tenant for non-org entity types | MVP | §9 |
| 4 | JSON feature flag validation — `value_schema` column on `feature_flags` | Post-launch | §4 |
| 5 | Routing disambiguation via `connection_config` fields | MVP | §6 |
| 6 | Core module override bypass — CHECK constraint on `tenant_modules` | MVP | §3 |
| 7 | ETag drift during schema migrations — runtime hydration pattern | Post-launch | §5 |
| 8 | Decommissioned tenant zombie integrations — decommissioning workflow + event | Post-launch | §7, §12 |
| 9 | Optimistic locking write contract (`If-Match` / 409 Conflict) | MVP | §5 |
| 10 | Feature flag orphans — module enablement check in flag resolution | MVP | §4 |
| 11 | Org re-parenting event (`tenant.org_changed`) | Post-launch | §12 |
| 12 | Module dependency chains — not-a-gap per ADR-0002 fragmentable adoption | N/A | Scenario 15 |

**Acknowledged as future scope (not MVP):**
1. Fleet-wide bulk config updates / config templates (Scenario 4) — operational tooling layer.
2. Tenant cloning for training environments (Scenario 6) — operational runbook procedure.
3. Ephemeral/camp tenant data merges (Scenario 2) — EMPI's concern, not Configurator schema.
4. Concurrent config field-level merge (Scenario 16) — ETag-based optimistic locking prevents data loss; field-level merge is API-layer sophistication beyond MVP.