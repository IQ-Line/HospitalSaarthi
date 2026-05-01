# Analysis: Where should module/feature/permission metadata live?

**Doubt:** [02.md](./02.md)  
**Context:** Tech-lead proposes that Master Data owns the catalog of what sub-modules, features, and permissions exist for each module. During tenant onboarding, Configurator pulls this list from Master Data and assigns features to the tenant.  
**Relevant HLD:** [02-core-modules.md §3 (Configurator)](../../hld/02-core-modules.md#3-configurator), [02-core-modules.md §4 (Master Data)](../../hld/02-core-modules.md#4-master--tenant-data), [03-module-shape-template.md §8 (Configurator integration)](../../hld/03-module-shape-template.md#8-configurator-integration), [01-schema-design.md §2 (Capability model)](../01-schema-design.md#2-capability-model)

---

## What the tech-lead is proposing

A concrete flow for tenant onboarding:

1. **Master Data** stores a catalog of all modules + their sub-features + their permissions (e.g., OPD → registration → create/read/update/search; OPD → smart-parcha → visit → create/read).
2. During tenant onboarding, **Configurator** pulls this catalog from Master Data.
3. An admin selects which modules/features this tenant gets.
4. This selection is stored in Configurator as the tenant's entitlement.

The motivation: modules may not exist yet, so you can't wait for the module's development team to declare its features. Define them upfront in Master Data.

---

## What our architecture currently says

Three separate systems already handle aspects of this:

### Configurator (HLD-02 §3.2)
Already owns:
- **Module enablement per tenant** — which of the ~38 modules are active for each tenant
- **Feature flags** — per-tenant toggles within a module (HLD-03 §8: "Feature flags. Fine-grained toggles within a module, e.g., 'enable AI-assisted prescription suggestions' for the Pharmacy module")
- **Module configuration schemas** — each module declares what is configurable; Configurator stores declarations and renders admin UIs from them

### User Management (LLD schema)
Already owns:
- **Capabilities reference table** — the platform-wide catalog of every atomic authorization action (`opd:registration:create`, `opd:registration:search:advanced`, `lab:results:verify`, etc.)
- **Role-capability mapping per tenant** — Tenant A's "Nurse" role may include `lab:order:create`; Tenant B's may not

### Master Data (HLD-02 §4.1–4.2)
Currently owns:
- **Domain reference data** — ICD codes, drug catalogs, LOINC, SNOMED, procedure codes, fee schedules, department lists
- The HLD is explicit about what Master Data is for: "the standardized code sets, catalogs, and classification systems that every clinical and administrative module needs"

---

## Separating the two questions

The tech-lead's proposal mixes two distinct concerns that have different answers:

### Question 1: "Does this tenant HAVE feature X?" (entitlement/licensing)

This is: "Hospital A bought OPD Basic. Hospital B bought OPD Premium with Smart Parcha. Even if an admin in Hospital A assigns the `opd:smart-parcha:visit:create` capability to a role, that feature shouldn't work because Hospital A doesn't have it."

This is **entitlement management** — what the tenant has purchased or been provisioned with. It's a Configurator concern. The architecture already handles it:

- **Module-level:** Configurator's "module enablement per tenant" (already exists in HLD-02 §3.2)
- **Feature-level:** Configurator's feature flags (already exists in HLD-03 §8)
- **Runtime enforcement:** Backend checks the feature flag and rejects requests; frontend checks and doesn't render the UI

No Master Data involvement needed.

### Question 2: "What permissions can users have for feature X?" (authorization catalog)

This is: "Within OPD registration, what actions can users perform — create, read, update, search, advanced-search?"

This is the **capabilities reference table** in User Management. It's the catalog that the admin UI renders as a collapsible tree when configuring roles. It already exists in our LLD.

---

## Walking through scenarios

### Scenario A: Onboarding Hospital A with OPD + Pharmacy

**Tech-lead's flow:**
1. Admin opens Configurator onboarding UI
2. Configurator calls Master Data: "give me all modules and their features"
3. Master Data returns: `{ opd: { registration: [...], smart_parcha: [...] }, pharmacy: { dispensing: [...] }, lab: { ... }, ... }`
4. Admin picks OPD + Pharmacy for this tenant
5. Admin picks which sub-features within OPD and Pharmacy
6. Stored in Configurator

**Our architecture's flow:**
1. Admin opens Configurator onboarding UI
2. Configurator already knows what modules exist (it owns the module registry)
3. Admin enables OPD + Pharmacy for this tenant → module enablement
4. Admin configures feature flags: `opd.smart_parcha.enabled = false` (Hospital A doesn't get it)
5. Admin goes to User Management, creates roles, assigns capabilities from the capabilities table
6. Capabilities table already has the full catalog — it's a reference table, visible to everyone

**Practical difference:** Minimal. Both flows work. The tech-lead's flow adds Master Data as an intermediary that our flow doesn't need.

### Scenario B: OPD module doesn't exist yet

This is the tech-lead's strongest argument. "I want to define OPD's features before OPD is built."

**Tech-lead's flow:** Define OPD features in Master Data now. When OPD is eventually built and deployed, the features are already in the catalog.

**Our architecture's question back:** What value does defining `opd:registration:create` in the database provide BEFORE OPD exists?

- You can't authorize against it — there's no OPD service to receive requests.
- You can't enable/disable it — there's no OPD to enable.
- You can't assign it to roles meaningfully — assigning a capability with no backing module is a no-op.

The use case for pre-defining features is **planning and sales**, not runtime. "Hospital A will get OPD with registration, smart-parcha, and appointment scheduling" is a product catalog concern — it belongs in a sales document, a contract, or a product management tool. Not in the authorization database.

When OPD IS built:
1. OPD's migration seeds its capabilities into the reference table
2. The capabilities become available for role assignment
3. This takes seconds, not sprints — seeding capabilities is a migration, not a feature build

If the concern is "I want the admin UI to show OPD features before OPD is built" — you can seed the capabilities reference table as part of the LLD/design phase, WITHOUT the module existing. Capability seeds are data, not code that depends on the module.

### Scenario C: A new feature is added to an existing module

OPD team ships a new "telemedicine consultation" feature in sprint 15. New capabilities: `opd:telemedicine:create`, `opd:telemedicine:join`, `opd:telemedicine:record`.

**Tech-lead's flow:** OPD team adds the feature to their code AND someone updates Master Data to add the new sub-module/features/permissions. Two places to update. If they forget Master Data, the capabilities exist in the capabilities table but the onboarding UI doesn't know about them.

**Our architecture's flow:** OPD team's migration seeds the new capabilities. They automatically appear in the capabilities reference table. The admin UI (which reads from the capabilities table) shows them immediately. One place to update.

**Risk with tech-lead's approach:** Two sources of truth will drift. The migration says `opd:telemedicine:create` exists; Master Data doesn't know about it yet (or still shows the old list). Which is authoritative?

### Scenario D: Tenant-specific feature granularity during onboarding

"Hospital A gets OPD with registration + consultation but NOT smart-parcha. Hospital B gets everything."

**Tech-lead's flow:** During onboarding, admin picks features from Master Data catalog.

**Our architecture's flow:** During onboarding, admin sets feature flag `opd.smart_parcha.enabled = false` for Hospital A. Or simply: admin creates Hospital A's roles WITHOUT the smart-parcha capabilities — if no role has `opd:smart-parcha:*` capabilities, no user can use it.

The feature-flag approach is cleaner because it enforces at the APPLICATION level (the feature's endpoints check the flag and reject), not just at the authorization level. A misconfigured role assignment can't accidentally enable a feature the tenant didn't purchase.

---

## Direct comparison

| Concern | Tech-lead's proposal | Our architecture |
|---------|---------------------|------------------|
| **"What modules exist?"** | Master Data | Configurator (already owns module registry, HLD-02 §3.2) |
| **"What features does module X offer?"** | Master Data | Capabilities reference table in User Management + Configurator feature flag definitions |
| **"Does Tenant A have module X?"** | Configurator (same) | Configurator (same) |
| **"Does Tenant A have feature Y within module X?"** | Configurator (pulled from Master Data) | Configurator feature flag OR User Management (no roles have the capability) |
| **"Can User Z do action A on feature Y?"** | User Management (same) | User Management (same) |
| **Where is the canonical list of all features?** | Master Data | Capabilities reference table (queryable by `module`, renders as collapsible tree) |
| **Source of truth count** | 2 (Master Data catalog + capabilities table) | 1 (capabilities table, seeded by module migrations) |
| **Can pre-define features before module exists?** | Yes (in Master Data) | Yes (seed capabilities reference table early, or use product catalog docs) |
| **Change propagation on new feature** | Update code + update Master Data (2 places) | Module migration seeds capability (1 place) |

---

## Addressing the "global vs per-tenant" reasoning

The tech-lead's mental model has an internal logic: Master Data holds global reference data, Configurator holds per-tenant configuration, so the global module/feature catalog should be in Master Data (global) and the per-tenant assignment should be in Configurator (per-tenant). This mirrors how clinical reference data works: global ICD codes in Master Data → tenant-specific formulary selections assigned per tenant.

This is a coherent analogy. Here's why it breaks down for software metadata, and what the actual principle should be.

### Why the analogy doesn't hold

**ICD codes come from OUTSIDE the software.** WHO publishes ICD-11. A government body publishes drug schedules. LOINC is maintained by the Regenstrief Institute. These catalogs exist independently of our codebase — no one on our team authors ICD codes. Master Data is the natural home because it's the service that ingests, stores, and serves external reference datasets.

**Module features come from INSIDE the software.** The OPD team writes `opd:registration:create` as part of building the OPD module. The feature's existence is a direct consequence of code being written and deployed. The "catalog" is not an external dataset to be ingested — it's a by-product of the development process. Storing it separately from where it's consumed (the authorization system) creates a synchronization obligation that doesn't exist for ICD codes.

**Change cadence mismatch.** ICD codes change when WHO publishes a revision (years between major changes). Master Data has a 24-hour cache TTL by design (HLD-02 §4.5) because reference data is "read-mostly." Module features change every sprint. If the module feature catalog is in Master Data with a 24h cache TTL, a new feature shipped at 9am isn't visible in the onboarding UI until 9am tomorrow. This is the wrong caching behavior for software metadata.

**Provenance mismatch.** Clinical reference data has a clear provenance chain: WHO → Master Data global catalog → tenant overrides. Software feature metadata's provenance is: dev team → code + migration → capabilities table. There's no external authority publishing a "list of all HIMS features." The dev team IS the authority, and their authority is expressed through code, not through Master Data entries.

### "Global" does not mean "Master Data"

Not everything that's global belongs in Master Data. The platform has several global artifacts:

| Global thing | Where it lives | Why not Master Data? |
|---|---|---|
| Cerbos policies | Git repository | Software artifact, changes with releases, needs CI/CD governance |
| Event schemas | Code (shared SDK) | Software artifact, tied to module versions |
| JWT signing keys | User Management (JWKS) | Security material, not reference data |
| Module configuration schemas | Configurator (HLD-03 §8) | Software metadata, declared by modules |
| **Capabilities catalog** | User Management (reference table) | Software metadata, seeded by module migrations |

The principle is: **Master Data owns global DOMAIN reference data (clinical, administrative, external). Software platform metadata lives in the service that consumes it** — authorization metadata in User Management, module configuration in Configurator, policies in Git.

### The capabilities table IS already global

The tech-lead might worry that putting the feature catalog in User Management makes it "per-tenant" or "authorization-only." It doesn't:

- The `capabilities` table is a **Citus reference table** — replicated to every node in the cluster, visible to every schema. It is as global as any Master Data table.
- It has no `iq_tenant_id` column — it's the same set of capabilities for all tenants. This is exactly the "global catalog" the tech-lead wants.
- Any admin UI (including Configurator's onboarding flow) can query it directly: `SELECT * FROM user_management.capabilities ORDER BY module, sort_order`.
- The per-tenant customization happens in `role_capabilities` (which capabilities are assigned to roles in this tenant) — this is the "per-tenant" layer, and it lives in User Management where roles live.

So the global/per-tenant split the tech-lead wants already exists:
- **Global catalog:** `capabilities` reference table (platform-wide, no tenant_id)
- **Per-tenant assignment:** `role_capabilities` + Configurator feature flags (what this tenant has access to)

It just doesn't go through Master Data, because it doesn't need to.

---

## What Master Data IS designed for

From HLD-02 §4.1:

> "Master & Tenant Data is the reference data backbone. It stores the standardized code sets, catalogs, and classification systems that every clinical and administrative module needs: diagnosis codes, drug catalogs, lab test codes, procedure codes, fee schedules."

And the design principle:

> "Modules own their operational data. Master Data owns the reference data those operations reference — the catalogs, code systems, and hierarchies that change infrequently and must be consistent across modules."

"What permissions does OPD offer?" is **software metadata**, not clinical reference data. It changes with every sprint that ships new features. It has a 1:1 relationship with the module's codebase — when the code changes, the feature list changes. ICD codes don't have this property — they change when WHO publishes a revision, independent of any module.

Putting software metadata in Master Data is like putting your CI pipeline configuration in the drug catalog. They're both "lists of things," but they serve fundamentally different purposes, change at different cadences, and are managed by different teams.

---

## What the tech-lead's concern really is (and how to address it)

The underlying concern seems to be: **"I need a single place to see what the platform offers, configure it per tenant, and do this early in the development lifecycle."**

This is a legitimate need. Here's how the architecture already addresses it, and one gap we should close:

### Already addressed
1. **Configurator** provides module-level enablement per tenant + feature flags for sub-feature toggling
2. **Capabilities reference table** provides the fine-grained feature catalog, queryable by module
3. **Module configuration schema** (HLD-03 §8) lets each module declare what's configurable

### Gap to close
There's no explicit **"platform product catalog" admin view** that unifies Configurator's module list with the capabilities table's feature breakdown. Building this view is a UI task, not an architectural one — it queries Configurator for modules and capabilities table for features, joins them, and presents a unified tree. This view would serve exactly the admin/onboarding use case the tech-lead describes.

### For pre-development planning
Capability seeds can be committed as part of the module's LLD/design phase:
```sql
-- In opd module's initial migration, written during design phase
INSERT INTO user_management.capabilities (id, module, name, display_name, is_assignable)
VALUES
  (gen_random_uuid(), 'opd', 'opd:registration:create', 'Register patient', true),
  (gen_random_uuid(), 'opd', 'opd:registration:read', 'View registration', true),
  ...
```
These can exist in the repo and be applied to the database BEFORE the OPD module's service code is written. The capability is a data record, not a running service.

---

## Recommendation

**Don't put software metadata in Master Data.** Use the architecture as designed:

1. **Configurator** for module enablement and feature flags per tenant (entitlement)
2. **Capabilities reference table** for the authorization feature catalog (what actions exist)
3. **Module migrations** seed their capabilities — single source of truth, no drift risk
4. **Build the product catalog admin view** that joins Configurator + capabilities for the unified onboarding experience the tech-lead wants

If the team decides Master Data should own this, we should understand that we're creating a second source of truth for feature metadata that will need to stay synchronized with the capabilities table. Every new feature means two updates (migration + Master Data entry), and drift between them creates authorization bugs that are hard to diagnose.
