# HLD 02 — Core Platform Modules

**Status:** First draft for alignment meeting (revision 2 -- adds Record Foundation per ADR-0028)
**Last updated:** 2026-05-08
**Related:** [01-system-overview.md](./01-system-overview.md) | [03-module-shape-template.md](./03-module-shape-template.md) | [04-authn-authz-flow.md](./04-authn-authz-flow.md) | [05-integration-and-interop.md](./05-integration-and-interop.md)

---

## Overview

The platform has **five core modules** that are always deployed (extended from four per [ADR-0028](../adr/0028-record-foundation-fifth-core-module.md), which adds Record Foundation as the substrate for ABDM care contexts and immutable FHIR Document Bundles). Feature modules (the ~38 from the AIIMS EOI scope) depend on these five for identity, patient identity, configuration, reference data, and clinical-record substrate. This document covers each core module in depth: what it does, what it owns, what it exposes, what it depends on, and what happens when it fails.

The five core modules map to the [layer model](./01-system-overview.md#4-layer-model):

| Plane | Core module |
|-------|-------------|
| Identity Plane | User Management |
| Identity Plane | EMPI / Patient Identity |
| Control Plane | Configurator |
| Reference Plane | Master & Tenant Data |
| Operational Substrate | **Record Foundation** (per [ADR-0028](../adr/0028-record-foundation-fifth-core-module.md)) |

Each core module follows the same [module shape template](./03-module-shape-template.md) as feature modules: independently deployable pod, Cerbos PDP (Policy Decision Point) sidecar, identity adapter, own database/schema, event publication. The difference is that core modules are always-on dependencies — they cannot be "not adopted."

Beyond these five, the platform also always deploys the **Integration Hub** (control plane + ABDM adapter) per [ADR-0011](../adr/0011-integration-hub-split.md). The Integration Hub is treated as platform infrastructure rather than a core *module* because its responsibility is transport (in/out), not domain ownership. See [HLD 05](./05-integration-and-interop.md) and the [Integration Platform LLD](../lld/integration-platform/01-schema-design.md).

Beyond the always-deployed substrate, **horizontal supporting modules** ship as peers of feature modules but are present in most adoptions. The first of these is **Billing** — patient-facing revenue cycle (charge capture, bills, payments, advances, discounts in Phase 1; insurance, refunds, plans, doctor commissions in later phases). Billing is *not* core (a tenant integrating an external billing system can opt out), but its design follows the standard [module shape template](./03-module-shape-template.md). See [HLD 06 — Billing](./06-billing.md) and the [Billing LLD](../lld/billing/01-schema-design.md). Module shape & phasing decision: [ADR-0025](../adr/0025-billing-module-shape-and-phasing.md).

---

## 1. User Management

### 1.1 Purpose

User Management is the identity authority for every principal that acts on the system: human users (clinicians, administrators, patients accessing the portal), service accounts (inter-module calls, automated jobs), and organizational identities (partner hospitals, insurance providers). It answers the question "who is this principal, and what roles/attributes do they carry?"

The module wraps better-auth ([better-auth docs](https://www.better-auth.com/docs)) for local authentication (username/password, MFA) and federates to external Identity Providers (IdPs) via a thin `IdentityProvider` adapter interface. This interface abstracts the IdP so that the rest of the platform does not care whether a user authenticated against better-auth locally, against Microsoft Entra ID, against Okta, or against a hospital's existing Keycloak instance. The adapter produces a platform-standard JWT (JSON Web Token) regardless of the upstream source.

[ADR-0003 — AuthN with better-auth + identity adapter pattern](../adr/0003-authn-better-auth-identity-adapter.md)

### 1.2 Owns

User Management is the source of truth for:

- **User records** — profile data, contact information, department/ward affiliation, active/inactive status. For locally-authenticated users, this includes credential hashes managed by better-auth.

- **Shadow records for federated users** — when a user authenticates via an external IdP for the first time, User Management creates a shadow record via JIT (Just-In-Time) provisioning. This record is retained indefinitely, even if the external IdP decommissions the account. The shadow record is the anchor for audit chain-of-custody: every Cerbos decision log entry references a principal ID that resolves to a User Management record.

- **Service account records** — credentials and metadata for non-human principals. Service accounts are first-class citizens in the authorization model; they carry roles and attributes just like human users.

- **Roles and role assignments** — the data that Cerbos policies evaluate against. User Management does not evaluate policies (that is the PDP's job). It owns the role definitions (e.g., "attending-physician," "pharmacist," "lab-technician," "billing-clerk") and the assignments of those roles to principals, scoped by tenant and optionally by department/ward.

- **Department and ward hierarchy** — organizational structure used as attributes in Cerbos policy evaluation (e.g., "this user has the attending-physician role within the Cardiology department of Tenant X").

- **SCIM (System for Cross-domain Identity Management) sync state** — for IdPs that support SCIM, User Management acts as the SCIM service provider, receiving provisioning/deprovisioning/update events and keeping shadow records in sync.

### 1.3 Exposes

**APIs:**

- **Token issuance endpoint** — issues platform-standard JWTs after successful authentication (local or federated). The JWT contains: `sub` (principal ID in User Management), `iq_tenant_id`, `roles`, and standard OIDC (OpenID Connect) claims. Other modules and the BFF (Backend For Frontend) verify these tokens via the published JWKS (JSON Web Key Set) endpoint.

- **JWKS endpoint** — publishes the public keys for JWT signature verification. Every module and the BFF consult this endpoint (with caching) to verify tokens without calling User Management synchronously on every request.

- **Principal attributes API** — given a principal ID, returns the current roles, department affiliations, and attributes. Used by module PEP (Policy Enforcement Point) middleware to construct the Cerbos principal object when the JWT does not carry all needed attributes (e.g., attributes too large for a token claim).

- **User CRUD API** — create, read, update, deactivate users. Used by the Configurator during tenant onboarding (seeding initial admin users) and by administrative UIs.

- **SCIM endpoints** — for external IdPs that push user lifecycle events.

**Events published:**

- `user.created` — a new user or shadow record was created. Consumed by modules that maintain local user projections.
- `user.updated` — profile or role changes. Triggers cache invalidation in modules that cache principal attributes.
- `user.deactivated` — a user was deactivated. Modules with active sessions for this user should invalidate them.
- `role-assignment.changed` — a principal's role assignments changed. Modules that cache role data for PEP decisions must refresh.

### 1.4 Depends on

- **Configurator** — to know which tenants exist and which IdPs are configured per tenant. This dependency is cached: User Management pulls tenant-IdP configuration from the Configurator and caches it. If the Configurator is unavailable, User Management continues to operate with cached configuration.

- **External IdPs** — when federated authentication is configured. If an external IdP is unavailable, users who authenticate via that IdP cannot log in. Users with local credentials (better-auth) are unaffected. This is an external dependency, not an inter-module one.

User Management has no dependency on EMPI, Master Data, or any feature module. It is at the bottom of the dependency graph.

### 1.5 Failure-mode behavior

User Management is the most critical module in the platform. If it is completely unavailable:

- **New logins fail.** No principal can authenticate. This is a hard failure — there is no graceful degradation for "the identity service is down." The mitigation is operational: high availability, multiple replicas, health checks, and rapid restart.

- **Existing sessions continue.** Modules verify JWTs using cached JWKS keys. A short User Management outage does not immediately invalidate active sessions. Token expiry is the forcing function — when tokens expire and cannot be refreshed, sessions end.

- **Role/attribute lookups degrade.** Modules that query the principal attributes API will get errors. Modules should cache the last-known attributes for the session duration and use those for Cerbos decisions. Stale attributes are a known risk during a User Management outage — but a brief outage with stale attributes is preferable to a system-wide authorization failure.

**Recovery:** When User Management comes back, modules refresh JWKS keys and attribute caches on their next periodic poll. No manual intervention required.

---

## 2. EMPI / Patient Identity

### 2.1 Purpose

EMPI (Enterprise Master Patient Index) is the identity authority for every patient (subject of care) in the system. It is multi-tenant: each tenant has its own isolated patient index, scoped by `iq_tenant_id`. A patient registered under Tenant A is invisible to Tenant B. The EMPI owns the canonical patient record per tenant and resolves the question "is this the same patient?" across multiple identifiers, systems, and points in time within that tenant's scope.

A patient may be known by different identifiers in different contexts: an ABHA (Ayushman Bharat Health Account) number from the national health ID system, a Medical Record Number (MRN) from a legacy HIS, an insurance policy ID, a phone number used at OPD registration. The EMPI links these identifiers to a single canonical patient identity and detects when two apparently different patients are actually the same person (deduplication).

[ADR-0007 — EMPI as a dedicated platform service](../adr/0007-empi-dedicated-platform-service.md)

### 2.2 Rationale for EMPI as a core module

The Engineering Manager's original architecture identified three core platform modules: User Management, Configurator, and Master & Tenant Data. This document proposes adding EMPI as a fourth. This is the most consequential proposed change and requires explicit alignment.

**Why not let each clinical module manage its own patient records?**

In a system with ~38 modules, many of which handle patient data (OPD, IPD, Emergency, Lab, Radiology, Pharmacy, Billing, etc.), the alternative to a dedicated EMPI is that each module maintains its own patient table and each module independently resolves patient identity. This alternative fails for the following reasons:

1. **Data quality and deduplication.** Without a single authority, the same patient will accumulate multiple records across modules. A patient registered at OPD with a slight name variation will appear as a different person in Lab. Deduplication across N independent patient tables is exponentially harder than deduplication in one. Medical errors caused by fragmented patient identity are a documented patient safety risk (AHIMA, "Managing the Integrity of Patient Identity in Health Information Exchange," 2014).

2. **Cross-system identity linking.** ABDM compliance requires linking patients to their ABHA ID. The DPDP (Digital Personal Data Protection) Act requires knowing which records belong to which individual for consent and data-subject rights. If patient identity is scattered across modules, each module must independently implement ABHA linking, consent tracking, and data-subject request handling. A single EMPI centralizes this.

3. **Fragmented adoption.** The central architectural constraint is that hospitals adopt modules piecemeal. If a hospital runs only OPD and Lab from this platform, and everything else is legacy, there must be a single patient identity service that links the platform's patient IDs to the legacy system's MRNs. Without the EMPI, the OPD module and Lab module would each need their own identity-linking logic, and they would inevitably diverge.

4. **ABDM/ABHA compliance.** India's ABDM framework requires health facilities to issue ABHA-linked health records ([ABDM Health Data Management Policy](https://abdm.gov.in/)). The EMPI is the natural integration point for ABHA — it links the platform's internal patient ID to the ABHA number and ensures that all modules producing health records reference the same verified patient identity.

5. **The FHIR Patient resource is a first-class entity.** FHIR R4 treats Patient as a foundational resource that other clinical resources reference ([HL7 FHIR Patient](https://hl7.org/fhir/R4/patient.html)). A dedicated service that owns and exposes the Patient resource aligns with the FHIR resource model.

**Scope of "core" status.** The EM's definition of core — required by every possible module combination — is a valid standard. Under this definition, EMPI is not universally core: a deployment consisting only of non-patient-facing modules (Building Management, Biomedical Equipment Maintenance, Academic/Research Information Management) could function without EMPI. However, the HIMS is a hospital information management system. Every realistic deployment that includes any clinical module — OPD, IPD, Emergency, Pharmacy, Lab, Radiology, Billing, or any other patient-facing function — requires a single patient identity authority. EMPI is core for every clinical deployment. We recommend framing EMPI as: *core for any deployment that includes patient-facing modules; omittable only for purely administrative deployments.* This is an honest distinction that respects the EM's definition while recognizing that no hospital deploys a HIMS without patients.

**Note on analytics/audit-log:** These are downstream consumers, not upstream dependencies. If analytics is unavailable, OPD still registers patients. If EMPI is unavailable, OPD cannot register patients. Core modules are things the operational plane *depends on to function*, not things that *consume from* the operational plane. Analytics and audit-log are services, not core — the EM's position on this is correct.

**Trade-off acknowledged:** A dedicated EMPI adds a hard runtime dependency for every patient-facing operation. The Identity Plane is on the critical path. This is mitigated by caching patient identity lookups at the module level (modules maintain a local projection of patient records they have recently interacted with) and by designing the EMPI for high availability.

### 2.3 Owns

EMPI is the source of truth for:

- **Canonical patient records** — demographics (name, date of birth, gender, address, contact), biometric identifiers where available, and the `patient_id` that all other modules reference.

- **Identity cross-references** — the mapping between the platform's `patient_id` and all external identifiers: ABHA number, legacy MRNs (one per legacy system), insurance policy IDs, government ID numbers. This is a many-to-one relationship: many external identifiers resolve to one canonical patient.

- **Merge/link history** — when two records are identified as the same patient, EMPI records the merge with full provenance: who initiated it, when, which records were merged, and what the pre-merge state was. Merges are auditable and reversible.

- **Match confidence scores** — for probabilistic matches, the confidence score and the algorithm version that produced it. This is critical for the deduplication workflow, where potential matches are flagged for human review.

- **Consent linkages** — the EMPI knows which ABHA-linked consent directives apply to a patient's records, though consent enforcement is a per-module responsibility (the EMPI surfaces the consent state; modules act on it).

### 2.4 Exposes

**APIs:**

- **Patient lookup** — given one or more identifiers (ABHA, MRN, phone, name+DOB), returns the canonical patient record or a ranked list of potential matches. This is the API that OPD registration, Emergency triage, and every patient-facing module calls.

- **Patient create** — registers a new patient. The EMPI runs deduplication checks before creating a record. If a probable match is found, the API returns the match rather than creating a duplicate, along with a confidence score.

- **Patient update** — updates demographics or adds new identity cross-references.

- **Patient merge** — merges two records identified as the same patient. Publishes a `patient.merged` event so all modules holding projections of those records can update their references.

- **Identity cross-reference query** — given a `patient_id`, returns all known external identifiers. Given an external identifier, returns the `patient_id`. Used by the Integration Hub when translating between platform IDs and external system IDs.

- **FHIR Patient endpoint** — exposes patient records as FHIR R4 Patient resources ([HL7 FHIR Patient](https://hl7.org/fhir/R4/patient.html)). This is the interoperability boundary for external systems and for ABDM integration.

**Events published:**

- `patient.created` — a new canonical patient record was created. Feature modules that maintain local patient projections consume this.
- `patient.updated` — demographics or identifier changes.
- `patient.merged` — two records were merged. Contains the surviving `patient_id` and the deprecated `patient_id`. Consuming modules must update their foreign references.
- `patient.identity-linked` — a new external identifier (e.g., ABHA number) was linked to an existing patient. Relevant for ABDM reporting.

### 2.5 Depends on

- **User Management** — for authentication of the principals calling EMPI APIs and for the Cerbos principal context used in authorization decisions. (Who is allowed to search patients? Who can merge records?)

- **Configurator** — for tenant configuration (which tenants exist, what deduplication rules apply per tenant, which external identity systems are configured). Cached with TTL.

- **Master & Tenant Data** — minimally. The EMPI may reference master data for standardized address formats or identifier type codes. This is a soft dependency.

EMPI has no dependency on any feature module.

### 2.6 Failure-mode behavior

The EMPI is on the critical path for any patient-facing operation. If it is completely unavailable:

- **New patient registration fails.** A module cannot create a new patient without the EMPI performing deduplication. Attempting to register patients locally without EMPI would create the exact duplication problem the EMPI exists to prevent.

- **Patient lookup degrades.** Modules that cache a local projection of recently-accessed patients can serve lookups from cache for patients they already know. New patient searches (by name, phone, ABHA) that require the EMPI's index will fail.

- **Existing clinical workflows on known patients continue.** If a module has already resolved the patient identity (the `patient_id` is in the session/context), it does not need to call the EMPI again for the duration of that encounter. Lab results, medication orders, and clinical notes for already-identified patients can proceed.

- **Patient merges are deferred.** Merge operations queue until the EMPI recovers.

**Mitigation:** The EMPI is deployed with high availability (multiple replicas, health checks). Modules maintain local patient projections (read-only, event-synced) that cover their recently-active patient population. The window of vulnerability is: a brand-new patient arriving at Emergency when the EMPI is down. The clinical protocol for this scenario (paper-based fallback with retroactive registration) is a hospital SOP, not an architecture decision — but the architecture must support retroactive registration and post-hoc deduplication.

**Recovery:** When the EMPI comes back, queued merge operations process. Modules that were operating on cached patient data re-sync via events. No data loss if modules correctly used the last-known `patient_id`.

---

## 3. Configurator

### 3.1 Purpose

The Configurator is the control plane for the platform. It answers the question "what is this system configured to do?" for every tenant, module, and integration. When a new hospital onboards, the Configurator provisions it. When a module needs to know whether a feature is enabled for a tenant, it asks the Configurator (or, more precisely, it reads its cached copy of the Configurator's response).

The Configurator provides an admin interface within the platform's single web application, used by platform operators and hospital IT administrators. The admin views are route-separated from clinical UIs but share the same application shell. A future phase may split the admin UI into a separate application if operational or UX requirements justify it.

### 3.2 Owns

The Configurator is the source of truth for:

- **Organization records** — `org_id`, organization name, organization type (hospital chain, medical college, standalone hospital). An organization owns one or more tenants.

- **Tenant records** — `iq_tenant_id`, `org_id` (parent organization), tenant name, tenant type (full-platform, fragmented, etc.), provisioning status (active, suspended, decommissioned), data isolation level (shared — all tenants co-located; isolated — tenant data on dedicated hardware via Citus sharding on `iq_tenant_id`).

- **Module enablement per tenant** — which of the ~38 modules are active for each tenant. A fragmented-adoption tenant may have only 3 modules enabled.

- **Feature flags** — platform-wide and per-tenant flags controlling feature rollout, A/B testing, and graceful degradation toggles.

- **Integration profiles per tenant** — for each tenant, which external systems are connected, what protocol they use (FHIR, HL7v2, custom), connection credentials (references to the credentials vault, not the credentials themselves — assuming Azure Key Vault for credential storage), and mapping/transformation rules.

- **Module configuration schemas** — each module declares a configuration schema (what settings it supports and their types/defaults). The Configurator stores these declarations and renders configuration UIs from them. Module developers define the schema; hospital administrators set the values.

- **Cerbos scope definitions per tenant** — the Configurator tells Cerbos (via the policy deployment pipeline) which scope identifiers map to which tenants. This is the link between `iq_tenant_id` in the JWT and the scoped policy set Cerbos evaluates.

### 3.3 Exposes

**APIs:**

- **Tenant CRUD** — create, read, update, suspend, reactivate tenants. Creating a tenant triggers a provisioning workflow: allocate `iq_tenant_id`, create database schema/tables (or dedicated database), seed Cerbos scope, create initial admin user (via User Management), and signal all enabled modules to pull their configuration.

- **Configuration read API** — given a `module_id` and `iq_tenant_id`, returns the current effective configuration for that module in that tenant. This is the API modules call on startup and periodically to refresh their cached config. Supports ETags / conditional GETs for efficient polling.

- **Feature flag API** — given an `iq_tenant_id` and `flag_name`, returns the flag state. Modules call this at decision points. Cached aggressively.

- **Module enablement API** — given an `iq_tenant_id`, returns the list of enabled modules. Used by the BFF for UI route filtering and by modules to know which peers are available.

- **Integration profile API** — given an `iq_tenant_id` and an integration target, returns the integration configuration. Used by the Integration Hub to know how to reach external systems.

- **Admin UI** — admin views within the platform's single web application, used by platform operators and hospital admins to manage all of the above.

**Events published:**

- `tenant.provisioned` — a new tenant was created and is ready. Modules consume this to initialize tenant-specific state.
- `tenant.suspended` / `tenant.reactivated` — tenant lifecycle changes.
- `config.changed` — configuration for a specific module+tenant was updated. The affected module should refresh its cache.
- `feature-flag.changed` — a feature flag was toggled.
- `module.enabled` / `module.disabled` — a module was enabled or disabled for a tenant.

### 3.4 Depends on

- **User Management** — for authentication and authorization of Configurator admin users. Platform operators and hospital admins must authenticate before they can modify configuration.

The Configurator has no dependency on EMPI, Master Data, or any feature module. It is in the Control Plane, above only the Identity Plane in the dependency hierarchy.

### 3.5 Failure-mode behavior

The Configurator is not on the hot path of clinical workflows. No patient-facing request requires a real-time call to the Configurator. The impact of a Configurator outage is:

- **Modules continue operating with cached configuration.** Every module caches its configuration with a TTL (time-to-live). A Configurator outage means modules cannot refresh config. As long as the outage is shorter than the cache TTL, there is zero observable impact on clinical operations.

- **Configuration changes cannot be made.** Hospital admins cannot modify settings, toggle feature flags, or update integration profiles. This is an administrative inconvenience, not a clinical safety issue.

- **New tenant provisioning fails.** No new hospitals can be onboarded during the outage. Existing tenants are unaffected.

- **Module enablement changes are deferred.** Enabling or disabling a module for a tenant requires the Configurator. Deferred until recovery.

**Cache TTL trade-off:** A longer TTL means greater resilience to Configurator outages but slower propagation of configuration changes. A reasonable default is 5 minutes for feature flags (which may need rapid toggling) and 1 hour for module configuration (which changes infrequently). These values are themselves configurable via the Configurator. [ADR-0006 — Four core platform modules](../adr/0006-four-core-platform-modules.md)

**Recovery:** When the Configurator comes back, modules that detect stale cache entries (via ETag comparison on next poll) refresh their configuration. No manual intervention required. Any configuration changes that were made during the outage (queued in the admin UI, or applied directly to the Configurator's database) take effect as modules refresh.

### 3.6 Audit

The Configurator does not maintain a per-module audit table. Audit logging across the platform is deferred to pre-prod and addressed at a cross-cutting layer (HTTP middleware capturing actor + action + before/after, with CDC as a safety net) rather than per module. See [ADR-0024](../adr/0024-audit-deferred-to-pre-prod.md) for the decision, the substrate Phase 0 must preserve (rich event payloads, actor capture in request context, soft delete), and the pre-prod gate. The same posture applies to Master Data, User Management, and EMPI — none ship per-module audit tables in Phase 0.

---

## 4. Master & Tenant Data

### 4.1 Purpose

Master & Tenant Data is the reference data backbone. It stores the standardized code sets, catalogs, and classification systems that every clinical and administrative module needs: diagnosis codes, drug catalogs, lab test codes, procedure codes, fee schedules, and more. It also stores tenant-level overrides — a hospital's custom formulary, local procedure naming conventions, department-specific code subsets.

The module provides a single API that returns the effective reference data for a given tenant. The internal strategy for how global and tenant-specific data relate is an open decision point:

**Approach A — Inheritance model (recommended).** Global defaults are the platform-wide reference datasets. Tenant overrides layer on top as deltas (additions, removals, modifications). When a module requests "the drug catalog for Tenant X," Master Data resolves the inheritance internally and returns the merged result. Consumers never see the two-layer model — they call one endpoint and get a resolved view. *Advantages:* single consumer-facing API, no merge logic in consuming modules, minimal duplication (tenants store only deltas), global updates (e.g., new ICD codes from WHO, drug recalls) propagate to all tenants automatically. *Disadvantages:* internal merge logic adds implementation complexity, harder to audit exactly what data a specific tenant is running, override precedence rules must be well-defined and tested.

**Approach B — Separate types.** Global master data and tenant data are distinct types stored separately with no inheritance relationship. Tenants either copy the global dataset and customize it, or consuming modules query both sources and merge at the application level. *Advantages:* simpler mental model, clear data ownership — the global team manages master data, tenant admins manage their own. *Disadvantages:* massive duplication if tenants copy full catalogs (drug catalogs have thousands of entries), synchronization burden when global data updates (every tenant copy must be updated for drug recalls, new ICD codes), and if consuming modules merge instead, each module implements its own merge logic — a consistency risk.

[OPEN: The EM and co-lead prefer separate types for simplicity. The recommendation is inheritance contained within the module, invisible to consumers. This is a meeting decision point — present both approaches with the trade-offs above.]

**Scope of reference data ownership.** Master Data owns ALL reference catalogs used by the platform, including catalogs that only one module consumes. Examples:

- **Drug catalog** — consumed primarily by Pharmacy and OPD (prescriptions), but owned by Master Data.
- **Lab test catalog** — consumed primarily by Lab, but owned by Master Data.
- **Radiology procedure catalog** — consumed primarily by Radiology, but owned by Master Data.
- **ICD codes, SNOMED CT, LOINC** — consumed by multiple modules, owned by Master Data.
- **Department and ward master** — consumed by authorization (Cerbos attributes) and scheduling, owned by Master Data.

The principle: modules own their **operational data** (orders, results, visits, prescriptions — the records created during clinical workflows). Master Data owns the **reference data** those operations reference (the catalogs, code systems, and hierarchies that change infrequently and must be consistent across modules).

This distinction matters for cache strategy: reference data is read-mostly and cache-aggressively with long TTLs. Operational data is read-write and not centrally cached.

Regardless of the internal approach, this is a read-mostly service. Clinical modules query it constantly but rarely write to it. Writes are administrative: updating a drug catalog when a new drug is approved, adding ICD codes when WHO publishes a revision, adjusting a tenant's formulary.

### 4.2 Owns

Master & Tenant Data is the source of truth for:

- **Platform module registry** — which deployable product modules exist (`modules` in schema `master_data`): stable `name` / `slug`, tree (`parent_id`, `level`), catalog metadata (`category`, `version`, `is_active`), and soft-delete (`is_deleted`). **Platform superadmins** create, update, and retire modules through **Master Data HTTP APIs** (`POST` / `PATCH` / soft **`DELETE`**); **tenants** do not author registry rows. Migrations may still **seed** baselines in new environments. Consumers use **GET** APIs and subscribe to **`module.registered` / `module.updated`** (and tombstone-friendly payloads) for projections. Details: [Master Data LLD — module lifecycle](../lld/master-data/01-schema-design.md#9-module-registration-lifecycle).

- **ICD-10 / ICD-11 diagnosis codes** — the WHO-published classification used for diagnosis recording, billing, and reporting.

- **Drug catalogs** — drug names, formulations, dosages, interactions, contraindications. The global catalog is sourced from standard pharmacopoeias; tenant overrides represent a hospital's formulary (which drugs are stocked, local naming, pricing).

- **LOINC (Logical Observation Identifiers Names and Codes)** — the standard code set for laboratory tests and clinical observations ([LOINC](https://loinc.org/)).

- **SNOMED CT (Systematized Nomenclature of Medicine — Clinical Terms)** — the clinical terminology standard used for coded clinical data.

- **Procedure codes** — surgical, diagnostic, and therapeutic procedure classifications.

- **Fee schedules** — standard and tenant-specific pricing for procedures, lab tests, consultations.

- **Organizational reference data** — department lists, ward lists, bed inventories (the structure, not the real-time occupancy — that belongs to IPD/Bed Management), building/floor/wing mappings.

- **Tenant override records** — for each of the above, tenant-specific additions, removals, modifications, and extensions. The override record references the global record it modifies and specifies the delta.

### 4.3 Exposes

**APIs:**

- **Module catalog (read/write)** — list, resolve, create, update, and soft-delete deployable modules (`/api/v1/master-data/modules`, …). **GET** is unauthenticated at the app layer in OpenAPI; **mutations** require a **superadmin** JWT. Deletes are **soft** (`is_deleted`). Backed by `master_data.modules`.

- **Code lookup** — given a code system (ICD, LOINC, SNOMED, etc.), a code value, and an `iq_tenant_id`, returns the effective record (global default with tenant overrides applied). Supports search by code, by display name, and by partial match (for autocomplete in clinical UIs).

- **Catalog browse** — paginated listing of a code system's contents, filtered by tenant. Used by admin UIs for catalog management and by clinical UIs for code selection.

- **Effective configuration** — given a data domain (e.g., "drug catalog") and an `iq_tenant_id`, returns the full effective dataset with overrides applied. Used by modules that need to cache a local copy of the reference data.

- **Override management** — CRUD operations for tenant-specific overrides. Used by hospital administrators to customize their catalogs.

- **FHIR terminology endpoints** — exposes code systems as FHIR R4 CodeSystem and ValueSet resources ([HL7 FHIR Terminology](https://hl7.org/fhir/R4/terminology-module.html)). This is the interoperability boundary for external systems that need to resolve codes.

**Events published:**

- `master-data.updated` — a global reference dataset was updated (e.g., new ICD codes added). Consuming modules should refresh their cached copies.
- `tenant-override.changed` — a tenant-specific override was created, modified, or removed. The event includes `iq_tenant_id` and the affected data domain, so only relevant modules refresh.

### 4.4 Depends on

- **User Management** — for authentication and authorization of principals querying or modifying reference data. Read access is broadly permissioned (most roles can look up a drug name). Write access (modifying the global catalog, creating tenant overrides) is restricted to administrative roles.

- **Configurator** — for tenant context (which tenants exist) and for its own module configuration. Cached with TTL.

Master & Tenant Data has no dependency on EMPI or any feature module.

### 4.5 Failure-mode behavior

Master & Tenant Data is on the read path of nearly every clinical workflow — a doctor selecting a diagnosis code, a pharmacist verifying a drug, a lab technician mapping a test to LOINC. However, it is a read-mostly service with highly cacheable data, making it the most resilient of the four core modules to outages.

If Master & Tenant Data is completely unavailable:

- **Modules continue operating with cached reference data.** Every module that consumes reference data caches it locally with a TTL. Drug catalogs, ICD codes, and LOINC codes change infrequently (weeks to months between updates). A reasonable cache TTL for reference data is 24 hours. A Master Data outage of less than the TTL has zero impact on clinical operations.

- **Code lookups against cached data succeed.** Autocomplete for diagnosis codes, drug selection, and lab test ordering all work from cache.

- **New codes added during the outage are not visible.** If a new drug was added to the global catalog while Master Data is down, no module will see it until Master Data recovers and caches refresh. This is a minor administrative delay, not a clinical risk.

- **Tenant override changes cannot be made.** Hospital administrators cannot modify their formulary or custom code sets. Deferred until recovery.

**Recovery:** When Master & Tenant Data comes back, modules detect stale caches (via ETag or version comparison) and refresh. If the global dataset was updated during the outage, modules may see a burst of `master-data.updated` events and refresh in a short window. This is a cache stampede risk — mitigated by jittering refresh intervals across modules.

---

## 5. Record Foundation

> Added by [ADR-0028](../adr/0028-record-foundation-fifth-core-module.md). This is the fifth core platform module. Its role is to be the substrate for cross-module clinical-record concerns: care contexts, immutable FHIR Document Bundles, external HIU bundles, the timeline read-model, and consent-driven erasure. Detailed schema and APIs in the [Record Foundation LLD](../lld/record-foundation/01-schema-design.md).

### 5.1 Purpose

Record Foundation is the durable backing store for ABDM care contexts and the FHIR Document Bundles produced or received by the platform. It exists because three concerns -- (1) the discoverable index of records linkable to ABDM, (2) the immutable storage of FHIR Document Bundles per [ADR-0022](../adr/0022-immutable-fhir-document-storage.md), (3) the inbox for external HIU-received bundles -- have no natural owner among the existing four core modules and must not be absorbed by Integration Hub (transport-only) or by individual operational modules (no cross-module aggregator otherwise).

It is *not* the Phase 4 EMR product. The Phase 4 EMR is a richer clinical UI that consumes Record Foundation's APIs.

### 5.2 Owns

- **Care-context registry.** One row per (patient, source clinical event) -- OPD visits, lab reports, prescriptions, discharge summaries, scanned documents, externally received records. Tracks ABDM linkage state and amendment history.
- **Immutable FHIR Document Bundle vault.** Bundles produced by clinical modules at finalisation are stored byte-exactly. INSERT-only discipline; no UPDATE path on bundle bytes. Per [ADR-0022](../adr/0022-immutable-fhir-document-storage.md).
- **External HIU bundle inbox.** Bundles received from external HIPs via ABDM Milestone 3, with parsed display summary and `data_erase_at` lifecycle tracking.
- **Timeline read-model (`timeline_index`).** Denormalised projection across internal + external records. Source for the doctor's timeline UI and for ABDM HIP discovery responses.
- **Erasure scheduler.** Honours `dataEraseAt` deadlines from ABDM consents per [DPDP Act section 11](https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf). Append-only `erasure_log` provides regulatory evidence.

### 5.3 Exposes

**APIs:**

- **Care contexts** -- list, get, discover (for ABDM HIP discovery), bulk-update-linkage (after gateway acknowledges).
- **Bundles** -- get bundle JSON by id (Integration Hub fetches at M3 push time).
- **Disclosures** -- "what bundles are disclosable under this consent" (called by Integration Hub before HIP push).
- **Timeline** -- patient timeline pagination.
- **External records** -- list, get, mark-viewed.
- **Admin** -- timeline rebuild, erasure run trigger / dry-run.

Full surface in [Record Foundation OpenAPI spec](../../../specs/openapi/record-foundation.v1.yaml).

**Events published:**

- `record-foundation.care-context.registered` -- a new care context exists for a patient.
- `record-foundation.care-context.linked` -- ABDM has acknowledged the linkage.
- `record-foundation.bundle.stored` -- a new FHIR Document Bundle is in the vault.
- `record-foundation.external-record.received` -- an external bundle has been ingested.
- `record-foundation.bundle.erased` -- a bundle has been erased per consent expiry / revocation / retention policy.

**Events consumed:**

- `consultation.finalized` (OPD) -- triggers care-context + bundle store.
- `lab-report.finalized` (Lab, Phase 1.5).
- `discharge-summary.signed` (IPD, Phase 2).
- `abdm.consent.granted` / `abdm.consent.revoked` (Integration Hub) -- updates `timeline_index.consent_disclosable` and schedules erasure.
- `abdm.health-record.received` (Integration Hub) -- ingests external bundle.

### 5.4 Depends on

- **EMPI** -- patient_id authority.
- **Integration Hub** -- consent state for disclosure decisions; ingestion source for external records.
- **Configurator** -- tenant config (timezone, retention policy overrides).
- **`@hims/ts-sdk-fhir`** package -- FHIR resource builders, profile registry, validators (per [ADR-0023](../adr/0023-distributed-fhir-assembly.md)).

Record Foundation does NOT depend on operational modules at runtime; the dependency is one-directional via events (operational modules emit `*.finalized`; Record Foundation consumes).

### 5.5 Failure-mode behavior

| Failure | Behavior | Recovery |
|---|---|---|
| Record Foundation down | New `consultation.finalized` events queue at the bus; OPD and other modules are unaffected. ABDM HIP discovery fails (cannot find care contexts); HIU records cannot be ingested into the inbox. | Bus replay drains queue. |
| Bundle storage corruption | Hash mismatch on read: integrity check rejects the bundle and alerts ops. | Bundle is unrecoverable from local state; signed external bundles can be re-fetched if consent still active. |
| `timeline_index` drift | Doctor sees stale or duplicated entries. | Manual rebuild via admin API (per-patient) or nightly full rebuild. |
| Erasure scheduler stalls | Records past `data_erase_at` remain physically stored. | Compliance alert + manual run. The `erasure_log` records were not yet written, so re-running is safe. |
| `abdm.consent.granted` event lost | A care context that should be disclosable is not. | Re-emit from Integration Hub's audit log. |

The design intent: Record Foundation outage is invisible to operational modules. The bus buffers; nothing is lost. Read-paths (timeline, ABDM discovery) fail closed -- no clinical leakage if disclosure decisions can't be made.

---

## 6. Cross-module interaction patterns

The five core modules + Integration Hub interact in specific, predictable ways. This section documents the most important interaction patterns.

### 6.1 Tenant onboarding

When a new hospital is onboarded:

1. A platform operator creates the tenant in the **Configurator** (tenant name, type, data isolation level, enabled modules).
2. The Configurator calls **User Management** to create the initial admin user for the tenant.
3. The Configurator publishes a `tenant.provisioned` event.
4. **User Management** provisions the tenant's authentication configuration (which IdP, SCIM endpoints if applicable).
5. **EMPI** initializes its tenant-scoped data store (empty patient index for the new tenant).
6. **Master & Tenant Data** makes global reference datasets available to the new tenant (no tenant overrides yet — they will be added by the hospital admin post-onboarding).
7. Each enabled **feature module** receives the `tenant.provisioned` event and initializes its tenant-scoped schema/tables.

See the [tenant onboarding sequence diagram in the System Overview](01-system-overview.md#8-deployment-and-multi-tenancy) for the full visual. Source file: [`diagrams/mermaid/tenant-onboarding.mmd`](../diagrams/mermaid/tenant-onboarding.mmd)

### 6.2 Patient-facing request flow

When a clinical user performs a patient-facing action (e.g., registering a patient at OPD):

1. The user authenticates via **User Management** (or a federated IdP, with User Management holding the shadow record).
2. The JWT carries `iq_tenant_id`, `sub` (principal ID), and `roles`.
3. The BFF verifies the JWT signature via **User Management's** JWKS endpoint (cached).
4. The request reaches the OPD module. The module's PEP middleware constructs a Cerbos principal from the JWT claims and queries the local **Cerbos PDP sidecar**.
5. If the action involves patient identity (search, create, match), the module calls the **EMPI**.
6. If the action involves reference data (selecting a diagnosis code, prescribing a drug), the module queries its cached copy of **Master & Tenant Data**.
7. The module's configuration (workflow rules, enabled features) comes from its cached copy of **Configurator** config.

### 6.3 Dependency failure summary

| Failed module | Impact on clinical operations | Mitigation |
|---|---|---|
| User Management | New logins fail. Existing sessions continue (cached JWKS). | High availability. Short outage tolerated. |
| EMPI | New patient registration fails. Known patients continue. | Local patient projection cache. Paper fallback for new patients. |
| Configurator | Zero immediate impact. Config stale but present. | Cache with TTL. Admin operations deferred. |
| Master & Tenant Data | Zero immediate impact. Reference data stale but present. | Aggressive caching (24h TTL). |
| Record Foundation | New consultations queue at bus (eventual ingest). ABDM HIP discovery fails. External record viewing fails. | Bus replay on recovery. |
| Integration Hub | All external integrations halt (inbound + outbound). ABDM flows stop. | Stateless restart; FSM state persists in PostgreSQL; in-flight workflows resume on next pod start. |

The design intent is that a brief outage (< 5 minutes) of Configurator or Master & Tenant Data is invisible to clinical users. A brief outage of EMPI or User Management is visible but survivable for existing sessions and known patients. Only a sustained outage of User Management causes a full system halt (no authentication). Record Foundation and Integration Hub outages degrade interop but do not block routine clinical operations.

---

## 7. What this document does not cover

- **Module shape template** (how each module is structured internally) — see [03-module-shape-template.md](./03-module-shape-template.md).
- **Authentication and authorization flows** (the end-to-end request path through PEP/PDP) — see [04-authn-authz-flow.md](./04-authn-authz-flow.md).
- **Integration Hub** (how modules communicate with external systems) — see [05-integration-and-interop.md](./05-integration-and-interop.md).
- **Feature module designs** — individual LLDs, deferred to post-meeting.
- **Detailed API specifications** — deferred to LLD phase.
