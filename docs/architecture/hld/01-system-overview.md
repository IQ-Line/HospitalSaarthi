# HLD 01 — System Overview

**Status:** First draft for alignment meeting  
**Last updated:** 2026-04-27  
**Related:** [02-core-modules.md](./02-core-modules.md) | [03-module-shape-template.md](./03-module-shape-template.md) | [04-authn-authz-flow.md](./04-authn-authz-flow.md) | [05-integration-and-interop.md](./05-integration-and-interop.md)

---

## 1. Open questions

The following items are genuinely unresolved. They are surfaced here so the meeting can address them directly rather than discovering them buried in detail.

1. **Minimum viable deployment footprint.** The library-first module design (see [03-module-shape-template.md](./03-module-shape-template.md)) enables an embedded mode where core modules and a small number of feature modules run as libraries within a single process, for very small tenants such as a standalone pharmacy or single-doctor clinic. This is an aspiration, not a first-release requirement — the initial implementation targets Kubernetes service mode. Confirm with EM whether lite deployment is in scope for the initial architecture or a planned future capability.

2. **EMPI as a fourth core module.** The Engineering Manager's original list identified three core platform modules (User Management, Configurator, Master & Tenant Data). This draft proposes adding EMPI / Patient Identity as a fourth. Conversational consensus exists but EM sign-off is pending. Rationale is in [02-core-modules.md, section on EMPI](./02-core-modules.md#2-empi--patient-identity).

3. **Configurator UI scope.** The Configurator's admin interface ships as part of the platform's single web application (route-separated from clinical UIs, sharing the same application shell). A separate admin application may be considered in a future phase if operational or UX requirements justify the split.

4. **Event bus technology.** Not chosen. Kafka, NATS, RabbitMQ, and cloud-managed equivalents (Azure Service Bus, Azure Event Hubs) are all viable. A dedicated ADR will be produced after the architectural shape is agreed. [ADR-0009](../adr/0009-event-driven-inter-module-communication.md)

5. **Cerbos policy storage.** The default is Git-based policy authoring with bundle distribution to Cerbos PDP (Policy Decision Point) sidecars. Cerbos's Admin API with database-backed policies is an escape hatch for runtime policy changes. The default position is: do not enable Admin API until evidence demands it. [ADR-0004](../adr/0004-authz-cerbos-sidecar.md)

6. **EMPI deduplication algorithm.** This will be a multi-quarter investment. The starting position aligns with the ABDM/NHA duplicate identification rule already implemented in the production `hims-production` project: phonetically similar name, age within ±2 years, same gender, same phone number. More sophisticated probabilistic matching (Fellegi-Sunter family) will be added when real data warrants it. [ADR-0007](../adr/0007-empi-dedicated-platform-service.md)

---

## 2. Big picture

### 2.1 What this system is

This is a Hospital Information Management System (HIMS) designed to cover the full scope of the AIIMS New Delhi "Digital AIIMS" Expression of Interest (EOI No. 01/CF/EOI/2025). The EOI specifies approximately 38 functional areas spanning clinical operations, diagnostics, administrative functions, and academic/research management. These are functional groupings, not necessarily individual deployment units — a deployment unit (service) may implement one or more functional areas where they share data models, workflow coupling, or scaling characteristics (see [03-module-shape-template.md](./03-module-shape-template.md) for the module-as-deployment-unit distinction). The complete functional area list from the EOI's Annexure V is:

| # | Module | Category |
|---|--------|----------|
| 1 | Outpatient Management (OPD) | Clinical |
| 2 | Inpatient Management (IPD) | Clinical |
| 3 | Electronic Medical Records (EMR) | Clinical |
| 4 | Emergency Management | Clinical |
| 5 | Appointment Scheduling | Clinical Support |
| 6 | Queue Management System (QMS) | Clinical Support |
| 7 | Operation Theatre / Surgery Management | Clinical |
| 8 | Critical Care (ICU) | Clinical |
| 9 | Vaccination and Immunization | Clinical |
| 10 | Nursing Care | Clinical |
| 11 | Pharmacy | Clinical Support |
| 12 | Clinical Support Services (CSS) | Diagnostics |
| 13 | Endoscopy Labs | Diagnostics |
| 14 | Blood Bank | Diagnostics |
| 15 | Laboratory Information System (LIS) | Diagnostics |
| 16 | Radiology Information System (RIS) | Diagnostics |
| 17 | CSSD (Central Sterile Services Department) | Support |
| 18 | Cath Lab Management | Diagnostics |
| 19 | Diet and Kitchen Management | Support |
| 20 | MIS Reports | Administrative |
| 21 | Billing and Financial Management | Administrative |
| 22 | Insurance & Claims Management | Administrative |
| 23 | Biomedical Equipment Maintenance | Support |
| 24 | Birth Registration | Administrative |
| 25 | Death Registration | Administrative |
| 26 | Issue of Certificates | Administrative |
| 27 | Autopsy Management | Clinical |
| 28 | Ambulance Management | Support |
| 29 | Web Portal (Doctors and Patients) | Digital Front Door |
| 30 | Medico-Legal Case / Report (MLC/MLR) | Clinical |
| 31 | Forensic Medicine and Toxicology | Clinical |
| 32 | Mortuary | Support |
| 33 | E-ICU | Clinical |
| 34 | Academic and Research Information Management | Academic |
| 35 | Building Management | Administrative |
| 36 | Administrative Modules | Administrative |
| 37 | Reports and Analytics | Cross-cutting |
| 38 | AI-Enabled Modules | Cross-cutting |

A reasonable phased deployment groups these into waves: Wave 1 covering core clinical modules (Registration/ADT, EMR, OPD, IPD, Emergency) with diagnostics and pharmacy integration; Wave 2 covering remaining clinical support and specialty modules (OT, ICU/e-ICU, Blood Bank, CSSD, etc.); Wave 3 covering academic/research and administrative modules. [Assumption: exact wave composition to be finalized during implementation planning.]

### 2.2 Who the users are

The system serves multiple user populations with distinct access patterns:

- **Clinical staff** — doctors, nurses, paramedical staff, lab technicians, pharmacists, radiologists. These are the primary transactional users. They need fast, role-appropriate access to patient data across departments.
- **Administrative staff** — billing, registration, scheduling, medical records, insurance/claims processors. They operate within specific functional domains.
- **Hospital administrators** — department heads, medical superintendents, quality officers. They need dashboards, MIS reports, and configuration authority.
- **Patients** — via the web portal, for appointment booking, accessing health records, and ABDM (Ayushman Bharat Digital Mission) integration via ABHA (Ayushman Bharat Health Account).
- **External systems** — legacy HIS installations at partner hospitals, ABDM/NHA services, insurance providers, state disease surveillance systems. These interact through the Integration Hub.
- **Service accounts** — automated agents, inter-module service calls, scheduled jobs. These are first-class principals in the authorization model.

### 2.3 The central constraint: fragmented adoption

Hospitals must be able to adopt this platform in fragments. A hospital may deploy only the Pharmacy module alongside an existing legacy HIS, or run the OPD and Lab modules while keeping their existing IPD system, or deploy the full platform.

This constraint drives almost every architectural decision:

- Standards-based interoperability (FHIR R4, HL7v2) at module boundaries, so modules can communicate with both sibling platform modules and external legacy systems.
- Per-module data ownership — each module owns its database/schema. No cross-module foreign keys.
- No synchronous inter-module dependencies by default. Modules communicate via events. A module that cannot reach a sibling module must degrade, not fail.
- Identity federation — the platform's identity layer must federate to external IdPs (Identity Providers) so that a hospital running one platform module alongside a legacy system does not force its users into a second login.

[TODO: diagram — system context]

---

## 3. Shape constraints

These are the architectural invariants. Every module — core or feature — must respect them. They are non-negotiable and should be agreed before any module design proceeds.

### 3.1 Standards-based interop at clinical boundaries

Modules that produce or consume clinical data will expose FHIR (Fast Healthcare Interoperability Resources) R4 resources at their boundaries ([HL7 FHIR R4](https://hl7.org/fhir/R4/)). HL7v2 is supported for legacy integrations, particularly lab (ORM/ORU) and radiology (ADT) messages. Internal non-clinical APIs (e.g., configuration, user management) use JSON over HTTP without a FHIR mandate.

The FHIR boundary is the interoperability contract. A module's internal data model may differ from the FHIR representation — the module is responsible for mapping between the two. This keeps modules free to optimize their internal storage while maintaining a stable external contract.

[ADR-0010 — FHIR/HL7 as interop standards](../adr/0010-fhir-hl7-interop-standards.md)

### 3.2 Per-module data ownership

Each module owns its data exclusively. No module reads another module's database directly. Shared entities — most notably patient records — are projections synced via events from the authoritative source (EMPI for patients, User Management for users, Master Data for reference codes).

This constraint makes modules independently deployable and replaceable. It also means that a module deployed in fragmented mode can function without sibling modules, as long as it receives the events or API responses it needs from whatever system occupies that role (platform module or legacy).

[ADR-0008 — Module shape and boundaries](../adr/0008-module-shape-and-boundaries.md)

### 3.3 No cross-module synchronous dependencies by default

Modules communicate via asynchronous events as the default path. Synchronous inter-module HTTP calls are permitted as exceptions when the interaction is request-response by nature (e.g., EMPI lookup during patient registration), but they must not create tight coupling. The calling module must handle the called module being unavailable.

[ADR-0009 — Event-driven inter-module communication](../adr/0009-event-driven-inter-module-communication.md)

### 3.4 Federated identity

The platform runs its own identity service (User Management, wrapping better-auth) but does not require all users to authenticate against it. Modules accept tokens from any configured identity provider, verified via JWKS (JSON Web Key Set) endpoints. A hospital running a single platform module can point it at their existing Active Directory / Entra ID / Okta / Keycloak instance. The User Management module provisions a shadow record on first federated login (JIT provisioning) and syncs via SCIM (System for Cross-domain Identity Management) where supported.

[ADR-0003 — AuthN with better-auth + identity adapter pattern](../adr/0003-authn-better-auth-identity-adapter.md)

### 3.5 Authorization as a cross-cutting policy layer

Every module enforces authorization via a Cerbos PDP sidecar communicating over loopback gRPC ([Cerbos docs](https://docs.cerbos.dev/)). Policies are code — YAML files versioned in Git, tested via `cerbos test` in CI. Permission data (roles, role assignments, department hierarchies, tenant-specific scope overrides) is UI-configurable and stored by User Management.

Cerbos principals include humans, service accounts, organizations, and automated agents. All flow through the same policy substrate. This means authorization is uniform: a service-to-service call is governed by the same policy engine as a doctor's click.

[ADR-0004 — AuthZ with Cerbos sidecar](../adr/0004-authz-cerbos-sidecar.md)
[ADR-0005 — Policy-as-code, permission-data-as-config split](../adr/0005-policy-as-code-permission-data-as-config.md)

---

## 4. Layer model

The architecture is organized into four planes. Each plane groups modules by their role in the system. The planes are not deployment tiers — modules from different planes may run on the same cluster — but logical groupings that clarify dependencies and failure domains.

### 4.1 Identity Plane

**Purpose:** Establish and verify the identity of every principal (human, service, organization) and every subject of care (patient).

**Modules:**
- **User Management** (core) — identity of system users. Authentication, shadow records for federated users, role/role-assignment data.
- **EMPI / Patient Identity** (core) — identity of patients. Canonical patient records, deduplication, cross-system identity linking.

The Identity Plane has no dependency on the Control or Reference Planes for its core function (authentication and patient matching). It can operate if those planes are unavailable. The Operational Plane depends on the Identity Plane for every authenticated request.

### 4.2 Control Plane

**Purpose:** Govern how the system behaves. Tenant provisioning, feature enablement, integration configuration.

**Modules:**
- **Configurator** (core) — tenant provisioning, feature flags, module enablement, integration profiles, admin UI.

The Control Plane depends on the Identity Plane (Configurator admins must authenticate). Operational Plane modules pull configuration from the Configurator but cache it locally with TTLs, so a Configurator outage degrades (stale config) rather than halting operations.

### 4.3 Reference Plane

**Purpose:** Provide stable, slowly-changing reference data that every clinical and administrative module needs.

**Modules:**
- **Master & Tenant Data** (core) — ICD codes, drug catalogs, procedure codes, LOINC codes, SNOMED CT mappings. Global defaults plus tenant-level overrides (internal strategy — inheritance vs. separate types — is an open decision; see [02-core-modules.md](./02-core-modules.md#4-master--tenant-data)).

The Reference Plane depends on the Identity Plane and the Control Plane (tenant-specific overrides require knowing the tenant). Operational Plane modules cache reference data aggressively; a Reference Plane outage is tolerable for the duration of the cache TTL.

### 4.4 Operational Plane

**Purpose:** Run the clinical, diagnostic, administrative, and academic workflows that constitute the hospital's daily operations.

**Modules:** All ~38 feature modules from the AIIMS EOI scope. These include OPD, IPD, Emergency, EMR, Pharmacy, LIS, RIS, OT Management, ICU, Blood Bank, Billing, and the rest of the module list in section 2.1.

Every Operational Plane module:
- Depends on the Identity Plane for authentication and patient identity.
- Pulls configuration from the Control Plane (cached).
- Pulls reference data from the Reference Plane (cached).
- Communicates with peer Operational Plane modules via events (or, in fragmented deployments, via the Integration Hub to legacy systems occupying that role).

[TODO: diagram — system context]

---

## 5. Four core modules — summary

These four modules are always deployed. They form the platform substrate that feature modules depend on. Detailed treatment is in [02-core-modules.md](./02-core-modules.md).

### 5.1 User Management

Owns the identity of every principal that acts on the system. Wraps better-auth ([better-auth docs](https://www.better-auth.com/docs)) for local authentication and federates to external IdPs (Entra ID, Okta, Keycloak, hospital SSO) via an `IdentityProvider` adapter interface. Maintains shadow records for federated users — every user who has ever acted on the system has a record here, retained indefinitely for audit chain-of-custody. Owns roles, role assignments, and the attribute data that Cerbos policies evaluate against.

See [02-core-modules.md, User Management](./02-core-modules.md#1-user-management).

### 5.2 EMPI / Patient Identity

Owns the canonical identity of every patient (subject of care). Performs identity resolution and deduplication. Links internal patient IDs to external identifiers: ABHA numbers, legacy MRN (Medical Record Number) values from pre-existing systems, insurance IDs. This module is the single source of truth for "who is this patient" across the entire platform and across fragmented deployments where different modules may have been adopted at different times.

The EMPI is a proposed addition to the EM's original three core modules. It is core for any deployment that includes patient-facing modules — which covers every realistic HIMS deployment. A purely administrative deployment (Building Management, Equipment Maintenance only) could technically omit it. The rationale is detailed in [02-core-modules.md, EMPI rationale](./02-core-modules.md#22-rationale-for-empi-as-a-core-module). [OPEN: pending EM sign-off — see Open Question 2.]

See [02-core-modules.md, EMPI / Patient Identity](./02-core-modules.md#2-empi--patient-identity).

### 5.3 Configurator

The control plane for the platform. Provisions tenants (hospitals), manages feature flags, controls which modules are enabled per tenant, stores integration profiles (which external systems a tenant connects to and how), and renders module-configuration UIs. Provides an admin interface within the platform's single web application. When a new hospital onboards, the Configurator is the entry point: it creates the tenant record, provisions Cerbos scopes, seeds initial admin users (via User Management), and signals modules to pull their tenant-specific configuration.

See [02-core-modules.md, Configurator](./02-core-modules.md#3-configurator).

### 5.4 Master & Tenant Data

The reference data backbone. Stores global reference datasets (ICD-10/11 diagnosis codes, drug catalogs, LOINC lab test codes, SNOMED CT clinical terms, procedure codes) and tenant-level overrides (a hospital's custom formulary, local procedure naming, department-specific code subsets). Exposes a single API returning the effective (resolved) data for a given tenant. The internal strategy for relating global and tenant data is an open decision point — inheritance model (recommended) vs. separate types — see [02-core-modules.md, Master & Tenant Data](./02-core-modules.md#4-master--tenant-data) for the trade-off analysis. Read-mostly, cache-aggressively. Feature modules pull reference data from this service and cache it with TTLs; they do not maintain their own copies of reference datasets.

See [02-core-modules.md, Master & Tenant Data](./02-core-modules.md#4-master--tenant-data).

---

## 6. Multi-tenancy summary

Multi-tenancy is not a standalone section of this architecture (a full treatment is deferred to [hld/06-multi-tenancy.md](./06-multi-tenancy.md) in Part B). This summary covers what the meeting needs to know.

### 6.1 Organization and tenant identity

The platform uses a two-level hierarchy: **Organization → Tenant(s)**. An organization (hospital chain, medical college, government health authority) owns one or more tenants (individual hospitals or facilities). Each tenant has a unique `iq_tenant_id`. AIIMS is one organization with potentially multiple tenants (main campus, satellite centers). A hospital chain is one organization with one tenant per hospital. A single small hospital is one organization with one tenant.

The `iq_tenant_id` is a claim in the JWT issued at authentication time. Every API request carries the tenant context. Modules extract `iq_tenant_id` from the verified token and scope all data operations to it. Cross-tenant operations (consolidated analytics across an organization, org-wide reporting) use an organization-level principal with explicit Cerbos policies — this does not bypass tenant isolation but is an authorized cross-tenant access pattern. The detailed organization-tenant model is deferred to [hld/06-multi-tenancy.md](./06-multi-tenancy.md) in Part B.

**Hierarchy depth.** The data model is intentionally flat: Organization → Tenant, two levels. Deeper organizational structures (hospital chain → regional group → individual hospital → department → ward) are represented as **organizational metadata** — hierarchy tables or attributes — not as nested tenants or nested organizations. Data isolation and authorization scoping are always at the tenant level (`iq_tenant_id`). Hierarchy metadata drives reporting dashboards, admin UIs, and aggregate views, but does not affect the data partition boundary.

Multiple instances of the same department within a tenant (e.g., two pharmacy locations in a large hospital) are modeled as **locations or departments within the tenant**, expressed as Cerbos authorization attributes, not as separate tenants. A pharmacist assigned to "Pharmacy - Building A" has a Cerbos scope attribute; data is still partitioned by `iq_tenant_id`, not by pharmacy location.

### 6.2 Data isolation

The default isolation model is a shared database with a tenant differentiator column. Every table that holds tenant-specific data includes an `iq_tenant_id` column, and every query is scoped to the authenticated tenant. This is enforced at the data access layer, not left to application code.

For tenants with regulatory or contractual requirements for stronger isolation, the same logical model (shared schema, `iq_tenant_id` column) is preserved, but the data layer uses Citus sharding on `iq_tenant_id` to place a tenant's data on dedicated hardware. This achieves physical data separation without changing the data model or module code — `WHERE iq_tenant_id = X` works the same whether the data is co-located or on a dedicated shard (assuming Azure Database for PostgreSQL Flexible Server with Citus, or equivalent sharding on other database choices). The Configurator stores the isolation level per tenant.

[ADR-0012 — Multi-tenancy isolation strategy](../adr/0012-multi-tenancy-isolation-strategy.md)

### 6.3 Tenant-specific authorization

Cerbos supports scoped policies ([Cerbos scoped policies](https://docs.cerbos.dev/cerbos/latest/policies/scoped_policies)). Tenant-specific authorization rules are expressed as Cerbos scopes, not policy forks. A base policy defines the platform-wide rules; a tenant scope can tighten or adjust rules for a specific hospital. The `iq_tenant_id` from the JWT is passed as a scope identifier to Cerbos. This means tenant isolation is a base policy that all resource policies inherit — a misconfigured feature policy cannot accidentally leak data across tenants because the tenant isolation layer is structurally separate.

### 6.4 User identity and multi-context assignment

Users exist at the **platform level**, above any single organization or tenant. A user is a person (or service account) with a globally unique platform identity. Users are assigned to one or more organizations, and within each organization, to one or more tenants with context-specific roles.

This model reflects real-world healthcare practice: a consulting cardiologist may practice at two hospitals (different orgs), a pathologist may serve three facilities within a hospital chain (same org, different tenants), and administrative staff may manage multiple tenants within an org.

**Assignment model:**

Each user has a set of assignments: `[(org_id, iq_tenant_id, roles[])]`. A user may have multiple assignments across different orgs and tenants.

**Active context:**

At login, the user selects (or the system determines via subdomain) their active context — one `org_id` and one `iq_tenant_id`. The JWT carries:

- `user_id` — global, immutable platform identity
- `org_id` — the active organization
- `iq_tenant_id` — the active tenant
- `roles` — the roles for the active context only

Switching context (e.g., a doctor moving from Hospital A to Hospital B) produces a new JWT with the new active org/tenant/roles. The user's global identity remains the same.

**Login UX models:**

The platform supports both:
- **Subdomain-based:** `hospital-a.platform.in` — tenant determined by URL, user authenticates within that context. Appropriate for on-prem and branded deployments.
- **Tenant-switcher:** Single URL, user logs in and selects or switches between their assigned contexts. Appropriate for SaaS deployments. Similar to Slack's workspace switcher.

The BFF resolves which model is active per organization via Configurator config. Both models produce the same JWT structure.

This is analogous to AWS IAM's model: a user exists globally and assumes roles in different accounts. The User Management module owns the global user record and the assignment table. Shadow records for federated users (see [HLD 02 §1](02-core-modules.md#1-user-management)) are also global — a doctor who federates via Okta at Hospital A is recognized as the same person at Hospital B.

---

## 7. Audit summary

Audit is a cross-cutting concern, not a standalone module. Every authorization decision, every data mutation, and every access to sensitive records must be auditable. This summary covers the architectural approach; a full audit and compliance strategy is deferred to Part B.

### 7.1 Authorization audit

Every Cerbos PDP decision (ALLOW or DENY) is logged with the full context: principal, action, resource, tenant, timestamp, and the policy version that produced the decision. Cerbos supports audit logging natively ([Cerbos audit logs](https://docs.cerbos.dev/cerbos/latest/configuration/audit)). These logs are the first-class audit trail for access control.

### 7.2 Federated user audit chain

User Management retains a shadow record for every user who has ever acted on the system, including users who authenticate via external IdPs. This shadow record is never deleted. It ensures that audit entries referencing a user ID can always be resolved to a human identity, even if the external IdP decommissions the account.

### 7.3 Break-glass access

Clinical emergencies require access to data outside a user's normal authorization scope. The architecture supports break-glass access: a clinician can override normal access controls by declaring an emergency reason. The Cerbos policy for break-glass requires: (a) the principal to have a role eligible for emergency override, (b) a stated reason captured at request time, and (c) post-hoc review — every break-glass event is flagged for mandatory review by a compliance officer. The audit record for a break-glass event captures the full context: who, what, when, why (the stated reason), and the subsequent review disposition.

[TODO: ADR — Audit and compliance strategy (Part B)]

---

## 8. Deployment topologies summary

Deployment topologies are summarized here for the meeting. A full treatment is deferred to [hld/07-deployment-topologies.md](./07-deployment-topologies.md) in Part B.

The architecture supports a spectrum of deployment topologies, enabled by the library-first module design described in [03-module-shape-template.md](./03-module-shape-template.md). Modules are implemented as libraries with injected adapters; the deployment mode determines how those libraries are packaged and connected.

In all topologies, the platform includes infrastructure services alongside the core and feature modules:

- **BFF (Backend For Frontend)** — entry point for the platform's own frontend. JWT/JWKS signature verification and request routing.
- **Integration Hub** (Inbound Gateway + Outbound Connector) — entry point for external systems. Protocol translation, external auth, and routing. The Inbound Gateway is platform infrastructure (always deployed), not an optional feature module — it is to external systems what the BFF is to the frontend.

### 8.1 Full on-premises deployment

A large facility like AIIMS New Delhi runs a dedicated Kubernetes cluster (AKS) on premises. All core modules, all adopted feature modules, the BFF, and the Integration Hub run on this cluster. Single tenant. The Inbound Gateway has a public-facing endpoint (or DMZ proxy) for ABDM/NHA callbacks, which are initiated externally even for on-prem deployments.

This is the highest-isolation deployment: the hospital controls its own infrastructure, data never leaves its network (except for mandated ABDM flows), and the platform serves only that hospital.

### 8.2 Full SaaS deployment

The same architecture runs on a shared cloud Kubernetes cluster serving multiple tenants. All modules are multi-tenant, isolated by `iq_tenant_id` at the data layer (shared DB with Citus sharding for tenants requiring hardware isolation). The BFF and Integration Hub serve all tenants through the same endpoints. Tenants with different module selections are served by the same cluster — the Configurator controls which modules are active per tenant.

This is the deployment model for most hospitals: a managed SaaS where each hospital is a tenant.

### 8.3 Fragmented deployment

A hospital adopts one or more platform modules alongside its existing legacy HIS. The adopted modules run on Kubernetes (or a compatible container runtime) with their core module dependencies (User Management, Configurator, Master Data — and EMPI if patient-facing modules are adopted). The Integration Hub's Inbound Gateway exposes endpoints for the legacy HIS to call, and the Outbound Connector calls the legacy HIS for data the platform modules need.

Example: a hospital adopts only the Pharmacy module. The Pharmacy module runs with its core dependencies. The Integration Hub connects it to the hospital's existing OPD system (for prescriptions) and billing system (for charges). Patient identity is managed by the EMPI, which links its internal IDs to the legacy system's MRNs.

Fragmented deployment can be on-prem (hospital's infrastructure) or cloud-hosted (SaaS with a limited module set).

### 8.4 Lite deployment

For very small tenants — a standalone pharmacy, a single-doctor clinic — the full Kubernetes deployment is disproportionate. The library-first module design enables an **embedded mode**: core modules and a small number of feature modules run as libraries within a single process. Events are dispatched in-process rather than through an external bus. A single Cerbos PDP serves all modules. The database is a single Postgres instance with separate schemas per module.

This is not a different architecture — it is the same module code packaged differently. The adapters (event bus, identity, Cerbos) have in-process implementations for embedded mode and network implementations for service mode. Module business logic is identical in both modes.

[Assumption: lite deployment is an aspiration, not a first-release requirement. The module shape template is designed to enable it, but the initial implementation targets service mode. Lite mode is a packaging exercise that can follow once the module libraries are stable.]

[TODO: diagram — tenant onboarding]

---

## 9. What comes next

This document is Part 1 of the HLD set. The companion documents are:

- [02-core-modules.md](./02-core-modules.md) — deep treatment of the four core platform modules.
- [03-module-shape-template.md](./03-module-shape-template.md) — the template every feature module follows. **This is the highest-value document for the meeting** — it is the contract that enables parallel module design by owning teams.
- [04-authn-authz-flow.md](./04-authn-authz-flow.md) — end-to-end identity and access narrative.
- [05-integration-and-interop.md](./05-integration-and-interop.md) — Integration Hub, FHIR/HL7 boundaries, ABDM/ABHA, fragmented adoption story.
