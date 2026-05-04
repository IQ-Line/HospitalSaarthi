# Analysis: Configurator dev-doubts — batch 1

**Doubts:** [01.md](./01.md)  
**Related:** [01-schema-design.md](../01-schema-design.md), [HLD-05 Integration and Interop](../../hld/05-integration-and-interop.md), [ADR-0010](../../adr/0010-fhir-hl7-interop-standards.md), [User Management dev-doubts/02-analysis.md](../../lld/user-management/dev-doubts/02-analysis.md)

---

## Doubt 1: FHIR/HL7v2 versioning — should we account for it?

### Short answer

Yes. Add a `protocol_version` column to `integration_profiles`. It affects the Integration Hub's behavior at runtime.

### What the versions are and why they matter

**FHIR versions** are major specification releases from HL7 International. Each version changes resource structures, search parameters, and validation rules:

| Version | Status | Relevance to us |
|---------|--------|-----------------|
| DSTU2 (1.0.2) | Historic | Some older EHR systems still expose only DSTU2 endpoints |
| STU3 (3.0.2) | Widely deployed | Many large hospital systems in India run FHIR STU3 (e.g., older OpenMRS, some commercial EHRs) |
| **R4 (4.0.1)** | **Current normative** | **Our primary target. ABDM mandates R4.** Our modules expose FHIR R4 at their boundaries (ADR-0010). |
| R4B (4.3.0) | Minor update | Backward-compatible extension of R4. Some newer systems advertise R4B. |
| R5 (5.0.0) | Latest | Newest release. Few deployments in India today, but will grow. |

**Concrete impact on development:** When our platform integrates with a partner hospital's FHIR endpoint, we need to know which FHIR version they support. A `Patient` resource in STU3 has structural differences from R4 (fields renamed, elements reorganized). If we send an R4 `Patient` to an STU3 endpoint, it will be rejected. The Integration Hub's mapping engine must know the target version to apply the correct translation.

**HL7v2 versions** are incremental releases of the v2 messaging standard. They matter because:

| Version | What changes | Common in |
|---------|-------------|-----------|
| 2.3 / 2.3.1 | Base version for most Indian lab analyzers | Older Cobas, Siemens, Sysmex, Beckman analyzers |
| 2.4 | Added segments for specimens, pharmacy | Some modern analyzers |
| 2.5 / 2.5.1 | Extended vocabulary, specimen handling | Newer Abbott, Roche analyzers, some PACS |
| 2.6+ | Further extensions | Rare in Indian installations |

The version determines which segments and fields are present in a message. An HL7v2.5.1 ORU (lab result) message may include segments that don't exist in 2.3. The Integration Hub's HL7v2 parser needs to know the version to correctly parse the message structure.

**DICOM** versions are less of a concern — DICOM is backward-compatible by design and version differences rarely affect parsing. But tracking the version is still good practice for troubleshooting.

### How this affects the schema

The `integration_profiles.protocol` column currently stores `'fhir_r4' | 'hl7v2' | 'dicom' | 'rest' | 'custom'`. There are two approaches to adding version:

**Option A: Encode version in the protocol enum** — `'fhir_r4'`, `'fhir_stu3'`, `'fhir_r5'`, `'hl7v2_3'`, `'hl7v2_5_1'`

**Option B: Separate `protocol_version` column** — keep `protocol` as the protocol family, add `protocol_version TEXT` for the specific version.

**Option B is better** because:
1. The protocol enum stays stable — no need to add new enum values for every version combination
2. The version can be queried/filtered independently ("show me all HL7v2 integrations regardless of version" vs "show me all v2.3 integrations")
3. For `rest` and `custom` protocols, `protocol_version` can reference an API version (e.g., `'v2'`, `'2024-01'`)
4. `protocol_version` can be nullable — for protocols where version doesn't apply, or where we don't know the version yet

### What this means for development

1. **Integration Hub** must support version-aware translation. When processing an inbound HL7v2 message, it checks `protocol_version` to select the correct parser. When sending outbound FHIR to a partner system, it checks `protocol_version` to determine whether to send R4 or apply R4→STU3 translation.

2. **ABDM specifically** mandates FHIR R4. All ABDM integration profiles will have `protocol = 'fhir_r4'`, `protocol_version = '4.0.1'`. No ambiguity there.

3. **Lab analyzers** are the most version-sensitive. Each analyzer model speaks a specific HL7v2 version with vendor-specific variations. The `protocol_version` column captures the base version; vendor-specific quirks go in `mapping_rules` JSONB.

4. **No code complexity explosion.** The version doesn't mean we need to support every possible FHIR/HL7v2 version from day one. For MVP: R4 (required for ABDM), HL7v2.3 and 2.5 (covers most Indian lab analyzers). Other versions are added when a concrete integration demands it. The schema just needs to be ready to record them.

### Recommendation

Add `protocol_version TEXT` (nullable) to `integration_profiles`. Update the schema design doc, schema-reference.json, and ERD.

---

## Doubt 2: Master Data two-layer model — global + tenant overrides

### Short answer

Yes, confirmed. Master Data will have a two-layer data model: global reference datasets + tenant-specific overrides. This is explicitly described in [HLD-02 §4](../../hld/02-core-modules.md#4-master--tenant-data) and [database principles §9](../../analysis/03-database-principles.md#9-reference-data-tables-are-read-heavy-cache-friendly).

### The two layers

| Layer | What | Example | Distribution |
|-------|------|---------|-------------|
| **Global** | Platform-wide reference datasets from external authorities | ICD-10 codes from WHO, LOINC codes from Regenstrief, SNOMED CT, national drug formulary | Citus reference tables (replicated to all nodes) |
| **Tenant overrides** | Per-tenant additions, modifications, or deactivations of global records | Hospital A's custom formulary (which drugs they stock), local pricing for procedures, department-specific code subsets | Distributed by `iq_tenant_id` |

### How it works at query time

Database principles §9 describes the pattern:

```sql
-- Global catalog
master_data.drugs           -- reference table (replicated everywhere)

-- Tenant overrides
master_data.drug_overrides  -- distributed by iq_tenant_id

-- Query: effective drug catalog for Tenant X
SELECT d.*, COALESCE(o.price, d.default_price) AS effective_price,
       COALESCE(o.is_available, true) AS is_available
FROM master_data.drugs d
LEFT JOIN master_data.drug_overrides o
  ON o.drug_id = d.id AND o.iq_tenant_id = :tenant_id
WHERE COALESCE(o.is_available, true) = true;
```

The global table is a reference table (replicated to all nodes), so the LEFT JOIN is always node-local. The consuming module sees one resolved view — it never has to merge two layers itself.

### How this parallels the Configurator

Both modules use a "platform defaults + tenant customization" pattern, but for different data domains:

| Aspect | Configurator | Master Data |
|--------|-------------|-------------|
| Global layer | Module registry, feature flag definitions, config schemas | ICD codes, drug catalog, LOINC, SNOMED, procedure codes |
| Tenant layer | Module enablement, flag overrides, config values | Formulary selections, local pricing, code set customizations |
| Data origin | Internal (platform team, module developers) | External (WHO, Regenstrief, national authorities) |
| Change cadence | Per sprint / per deployment | Per WHO revision / per regulatory update (months to years) |
| Cache TTL | 5 min (flags), 1 hour (config) per HLD-02 §3.5 | 24 hours per HLD-02 §4.5 |

### The open design question

HLD-02 §4 calls out an explicit open question about how the two layers relate internally:

- **Approach A (recommended in HLD): Inheritance model.** Global defaults are the base. Tenant overrides layer on top as deltas. Query time resolves internally, consumers see one merged view.
- **Approach B: Separate types.** No inheritance — tenants either copy the full global dataset and customize, or consuming modules merge at the application layer.

The EM and co-lead preferred Approach B for simplicity. The HLD recommends Approach A. This is flagged as a meeting decision point. The Configurator's schema doesn't depend on which approach Master Data uses — Master Data's internal design is its own concern. The cross-module interface is the API (resolved view per tenant) and events (`master-data.updated`, `tenant-override.changed`).

### Bottom line

Yes, Master Data will have a two-layer "global + tenant" model. It's a different flavor from Configurator's two-layer model (different data domain, different change cadence, different caching strategy), but the structural pattern is the same.

---

## Doubt 3: Module registration lifecycle in the Configurator

### What User Management does with capabilities

When a module is built or updated, its migration seeds new capabilities into the `user_management.capabilities` reference table:

```sql
-- OPD module's initial migration
INSERT INTO user_management.capabilities (id, module, name, display_name, ...)
VALUES
  (gen_random_uuid(), 'opd', 'opd:registration:create', 'Register patient', ...),
  (gen_random_uuid(), 'opd', 'opd:registration:read', 'View registration', ...);
```

When OPD ships a new feature (e.g., telemedicine), a new migration adds new capabilities:

```sql
-- OPD sprint 15 migration
INSERT INTO user_management.capabilities (id, module, name, display_name, ...)
VALUES
  (gen_random_uuid(), 'opd', 'opd:telemedicine:create', 'Start telemedicine', ...),
  (gen_random_uuid(), 'opd', 'opd:telemedicine:join', 'Join telemedicine', ...);
```

Single source of truth — the module's own migration. No second system to update.

### What the Configurator equivalent is

The Configurator has three tables that need analogous seeding:

| Table | What needs seeding | When | By whom |
|-------|-------------------|------|---------|
| `modules` | Module registry entry (name, display name, category, is_core) | First deployment of a new module | Module's first migration |
| `module_config_schemas` | Configuration schema declaration (what settings this module supports) | First deployment, and on config schema changes | Module's migration |
| `feature_flags` | Feature flag definitions (new toggleable features) | When a new feature is added that should be independently toggleable per tenant | Module's migration |

### The lifecycle in detail

#### New module is built and deployed for the first time

1. **Module migration seeds `modules` table:**
   ```sql
   INSERT INTO configurator.modules (id, name, display_name, category, is_core, version)
   VALUES (gen_random_uuid(), 'telemedicine', 'Telemedicine', 'clinical', false, '1.0.0');
   ```

2. **Module migration seeds `module_config_schemas`:**
   ```sql
   INSERT INTO configurator.module_config_schemas (id, module_id, schema_version, config_schema, defaults)
   VALUES (
     gen_random_uuid(),
     (SELECT id FROM configurator.modules WHERE name = 'telemedicine'),
     '1.0.0',
     '{"type":"object","properties":{"max_session_duration_minutes":{"type":"integer","default":30},"recording_enabled":{"type":"boolean","default":false}}}',
     '{"max_session_duration_minutes":30,"recording_enabled":false}'
   );
   ```

3. **Module migration seeds capabilities** (in User Management):
   ```sql
   INSERT INTO user_management.capabilities (id, module, name, display_name, ...)
   VALUES ...;
   ```

4. **Module migration optionally seeds feature flags:**
   ```sql
   INSERT INTO configurator.feature_flags (id, name, description, flag_type, default_value, module_id)
   VALUES (
     gen_random_uuid(), 'telemedicine_recording',
     'Enable session recording for telemedicine consultations',
     'boolean', 'false'::jsonb,
     (SELECT id FROM configurator.modules WHERE name = 'telemedicine')
   );
   ```

5. **Tenant enablement** is a separate admin action — the module exists in the registry but is not enabled for any tenant until a platform operator or hospital admin enables it via the admin UI (creating a `tenant_modules` row).

#### Existing module ships a feature update

1. **Module migration may add new feature flags** if the feature should be independently toggleable per tenant.

2. **Module migration may register a new config schema version** if the update introduces new configurable parameters:
   ```sql
   INSERT INTO configurator.module_config_schemas (id, module_id, schema_version, config_schema, defaults)
   VALUES (
     gen_random_uuid(),
     (SELECT id FROM configurator.modules WHERE name = 'opd'),
     '1.1.0',
     '{"type":"object","properties":{"appointment_slot_duration_minutes":{"type":"integer","default":15},"telemedicine_enabled":{"type":"boolean","default":false}}}',
     '{"appointment_slot_duration_minutes":15,"telemedicine_enabled":false}'
   );
   ```

3. **Module migration updates its version** in the `modules` table:
   ```sql
   UPDATE configurator.modules SET version = '1.1.0', updated_at = now()
   WHERE name = 'opd';
   ```

4. **Existing tenant configs** may need validation against the new schema. If the new schema adds parameters that aren't in the tenant's existing `config_values`, the defaults from `module_config_schemas.defaults` apply. If the new schema removes or renames parameters, the admin UI flags the tenant as needing config migration.

5. **Module migration seeds new capabilities** in User Management for any new authorization actions.

### Key principle: modules own their metadata

Just like capabilities are seeded by module migrations (not by a separate admin process), the Configurator's module registry, config schemas, and feature flag definitions are seeded by module migrations. The module itself is the authority on what it offers. This is the same "single source of truth" principle established in the [capabilities ownership analysis](../../lld/user-management/dev-doubts/02-analysis.md).

The Configurator provides the **storage and admin UI** for this metadata. The module provides the **metadata itself** via migrations. The Configurator doesn't "discover" modules — modules announce themselves.

### Cross-schema migration note

Module migrations write to tables in both their own schema AND the `configurator` schema (and `user_management.capabilities`). This works because:

1. Migrations run with elevated database permissions (migration runner has write access to all schemas)
2. The target tables (`configurator.modules`, `configurator.module_config_schemas`, `configurator.feature_flags`, `user_management.capabilities`) are all Citus reference tables — writes go to the coordinator and replicate to all nodes
3. This is a deployment-time operation, not a runtime operation — it happens once per migration, not on every request

If the team is uncomfortable with cross-schema writes in migrations, an alternative is a registration API: the module calls the Configurator's API on startup to register itself. But this adds runtime complexity (what if the Configurator is down during module startup?) and is harder to make idempotent. The migration approach is simpler and more reliable.
