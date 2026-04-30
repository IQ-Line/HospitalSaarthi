# 02 — Constraints and Invariants

These are the non-negotiable requirements the architecture must satisfy. Any proposed design that violates a constraint listed here is wrong, regardless of how elegant it is otherwise. Constraints are organized by source: some come from the market, some from the EOI, some from regulatory requirements, and some from the team's own commitments.

---

## 1. Fragmented adoption (market constraint)

**The constraint:** Hospitals must be able to adopt the platform in fragments — one module, two modules, five modules, or the full 38 — alongside their existing legacy systems, with the option to grow toward full platform deployment over time without re-architecture.

**Why it's non-negotiable:** This is not a nice-to-have. The Indian hospital market is one where almost every potential customer already has some form of information system. Requiring all-or-nothing deployment eliminates the vast majority of the addressable market. A hospital that needs only a Pharmacy module will not deploy 38 modules to get it.

**What it implies:**

- Modules must be independently deployable. A deployment consisting of only the Pharmacy module (plus whatever platform dependencies it requires) must be a valid, production-grade deployment.
- Modules must interoperate with external legacy systems, not just with sibling platform modules. A Pharmacy module deployed alone must receive prescriptions from the hospital's existing OPD system.
- The interoperability contract between modules must be the same whether the counterpart is a platform module or a legacy system. If the Pharmacy module speaks FHIR to the platform's OPD module, it should speak FHIR (or HL7v2, given legacy realities) to a legacy OPD system.
- No module's data model or behavior should assume the presence of any specific sibling module beyond explicit platform dependencies.

---

## 2. Multi-tenancy (market + EOI constraint)

**The constraint:** The same codebase must serve multiple hospitals (tenants) with data isolation, tenant-specific configuration, and tenant-specific authorization rules.

**Why it's non-negotiable:** The platform serves both AIIMS (dedicated infrastructure, single-tenant) and SaaS customers (shared infrastructure, multi-tenant). Building separate codebases for single-tenant and multi-tenant deployment is not economically viable. The EOI itself implies hybrid infrastructure (cloud + on-prem BCP).

**What it implies:**

- Every data store must be tenant-aware. A query that returns data across tenants is a security breach, not a feature.
- Tenant identity must be established at authentication time and carried through every request. Every layer of the stack — API, business logic, data access — must be aware of the tenant context.
- Tenant-specific configuration (enabled modules, feature flags, integration profiles, authorization rules) must be runtime-manageable, not deploy-time constants.
- The data isolation strategy must support a spectrum: from shared tables with a tenant column (for cost-efficient multi-tenant SaaS) to dedicated hardware (for high-compliance or regulatory-mandated isolation) — using the same application code.

---

## 3. Per-module data ownership (architectural invariant)

**The constraint:** Each module owns its data exclusively. No module reads or writes another module's database directly. Shared entities are projections synced via events or retrieved via APIs from the authoritative source.

**Why it's non-negotiable:** Without this constraint, modules cannot be independently deployed, replaced, or omitted. Cross-module foreign keys create tight coupling that makes fragmented adoption impossible. If OPD has a foreign key to Lab's `test_orders` table, OPD cannot be deployed without Lab.

**What it implies:**

- Modules must define their own data models and schemas. Two modules referencing the same real-world entity (e.g., a patient) each maintain their own representation (a projection) of that entity.
- There must be a mechanism to synchronize projections across modules when the authoritative source changes (e.g., patient demographics updated in the patient identity service must propagate to modules holding patient projections).
- Inter-module data access is via APIs or events, never via direct database queries.

---

## 4. Standards-based interoperability at clinical boundaries (EOI + market constraint)

**The constraint:** Modules that produce or consume clinical data must expose standards-based interfaces (FHIR R4 for modern integrations, HL7v2 for legacy) at their boundaries. Internal non-clinical APIs need not follow FHIR.

**Why it's non-negotiable:** The EOI explicitly requires "API-first integration using industry standards (HL7 v2.x, FHIR R4/ABDM profiles, DICOM)." The fragmented adoption constraint requires interoperability with arbitrary external systems. Proprietary internal APIs would mean building a separate integration adapter for every external system — which does not scale.

**What it implies:**

- Each clinical module must define its FHIR resource mappings (or HL7v2 message mappings) as part of its contract.
- The module's internal data model may differ from the FHIR representation. The module is responsible for the mapping.
- There must be infrastructure for protocol translation (HL7v2 ↔ internal) for legacy systems that cannot speak FHIR.

---

## 5. Unified identity — both users and patients (operational invariant)

**The constraint:** There must be a single, authoritative source of identity for every principal (user/system) that acts on the system, and a single, authoritative source of identity for every patient (subject of care) across the platform.

### 5.1 User/principal identity

**Why it's non-negotiable:** Without a single identity authority, authorization decisions cannot be consistent across modules. A doctor who is "Dr. Sharma, cardiologist" in OPD but "user_4782" in Lab cannot have consistent cross-module permissions.

**What it implies:**

- There must be a way to establish and verify the identity of every principal: human users (clinical, administrative, patients), service accounts (automated processes, inter-module calls), and external systems (partner hospitals, ABDM).
- The identity system must federate to external identity providers (Active Directory, Entra ID, Okta, Keycloak, hospital SSO). Hospitals that already have an identity infrastructure will not accept a second login system.
- When a principal authenticates via an external provider, the platform must maintain a persistent internal record (shadow record) so that authorization, audit, and data-ownership chains remain platform-internal even if the external provider is later decommissioned.

### 5.2 Patient identity

**Why it's non-negotiable:** In a system with ~38 modules handling patient data, if each module maintains its own patient records independently, the same patient will accumulate multiple identities across modules. This is a documented patient safety risk — medical decisions made on an incomplete record because the system doesn't know two records belong to the same person. The ABDM/ABHA framework also requires linking patient records to a national health ID, which is impossible if patient identity is fragmented.

**What it implies:**

- There must be a single service that owns the canonical patient record and resolves "is this the same patient?" across identifiers, systems, and points in time.
- This service must link internal patient IDs to external identifiers: ABHA numbers, legacy MRNs from pre-existing systems, insurance IDs, government IDs.
- Deduplication (detecting that two apparently different records are the same person) must be handled centrally, not per-module.
- Patient identity resolution must work in the fragmented adoption scenario: if a hospital runs only OPD and Lab from the platform, and everything else is legacy, there must be a way to link the platform's patient IDs to the legacy system's MRNs.

---

## 6. Authorization as a cross-cutting concern (operational invariant)

**The constraint:** Every action on the system — by humans, service accounts, and external systems — must be authorized. Authorization must be policy-based, auditable, and configurable per-tenant without code changes.

**Why it's non-negotiable:** Healthcare systems handle sensitive patient data. The DPDP Act, NABH accreditation, and basic clinical safety require fine-grained access control. The EOI explicitly requires "role-based access control, audit trails, and secure data handling mechanisms." But role-based alone is insufficient — hospitals need the ability to grant/revoke granular permissions per user, per role, per department, and per tenant, through an admin UI, without deploying new code.

**What it implies:**

- There must be a clear separation between **authorization logic** (the rules that determine who can do what) and **permission data** (the assignments of roles, department scopes, and tenant-specific overrides that the rules evaluate against).
- Authorization logic must be auditable — it must be possible to answer "why was this access allowed/denied?" at any point in time.
- Permission data must be runtime-configurable — a hospital administrator must be able to modify role assignments and see the effect immediately, without a code deployment.
- Authorization must be uniform across all principal types: a service-to-service call must go through the same authorization substrate as a doctor's click.
- Break-glass (emergency override) access must be supported: in clinical emergencies, authorized personnel must be able to access data outside their normal scope, with mandatory post-hoc audit review.

---

## 7. Organizational hierarchy in authorization (operational reality)

**The constraint:** Real hospitals have organizational hierarchies: Organization → Hospital → Division → Department → Ward. Authorization decisions must be aware of where a user sits in this hierarchy and what resources they should access based on their position.

**Why it's non-negotiable:** A department head must see data for their department. A division head must see data for all departments in their division. A medical superintendent must see data across the hospital. This is how hospitals actually operate.

**What it implies:**

- Departments, wards, divisions, and other organizational units must be represented as structured data — they are entities that can be queried, displayed, and managed.
- The authorization system must be able to use organizational position as an input to access decisions (e.g., "this user is the head of the Cardiology department, therefore they can access all Cardiology patient records").
- The organizational hierarchy is NOT the data isolation boundary. Data isolation is at the tenant level. Hierarchy drives authorization scoping within a tenant. These are two different concerns.
- Multiple instances of the same department type within a hospital (e.g., two pharmacy locations) must be distinguishable for authorization purposes.

---

## 8. Audit trail (regulatory + operational constraint)

**The constraint:** Every authorization decision, every data mutation, and every access to sensitive patient records must be auditable. Audit records must be tamper-evident, retained for the mandated period, and queryable.

**Why it's non-negotiable:** NABH accreditation requires audit trails. The DPDP Act requires knowing who accessed personal data and when. The EOI requires audit trails. Medical malpractice litigation requires being able to reconstruct who saw what, when. Clinical governance requires break-glass review.

**What it implies:**

- Every access control decision (allow or deny) must be logged with full context: who, what action, on what resource, in what tenant, at what time, under what policy.
- Every mutation to patient data must be attributable to a specific principal.
- Audit records for federated users must resolve to a persistent platform identity, even if the external identity provider is later decommissioned.
- Break-glass events must be flagged for mandatory compliance review.

---

## 9. Deployment topology spectrum (market constraint)

**The constraint:** The platform must support multiple deployment topologies from the same codebase:

| Topology | Description | Example |
|----------|-------------|---------|
| Full on-premises | Dedicated cluster, single tenant, all modules | AIIMS New Delhi |
| Full SaaS | Shared cloud cluster, multiple tenants, all modules per tenant | Managed service for multiple hospitals |
| Fragmented | Subset of modules alongside legacy, on-prem or cloud | Hospital adopting only Pharmacy + Lab |
| Lite | Minimal footprint, possibly single-process | Standalone pharmacy, single-doctor clinic |

**Why it's non-negotiable:** The market demands it. AIIMS will not accept SaaS-only. A standalone pharmacy will not run Kubernetes. A hospital chain wants centralized management. The platform must flex across all of these without maintaining separate codebases.

---

## 10. Performance at AIIMS scale (EOI constraint)

**The constraint:** The system must handle AIIMS-scale load: 54+ lakh OPD patients/year, 3.9 lakh IPD patients/year, 3 lakh surgeries/year, across 60+ departments and multiple campuses. The EOI requires P95 response time benchmarks, 1.5x headroom over peak load, and clinical-grade latency for alarm/monitoring pipelines.

**What it implies:**

- The architecture must support horizontal scaling of individual modules under load.
- Read-heavy reference data (drug catalogs, ICD codes) must be aggressively cacheable.
- Patient identity lookups (the most common cross-module call) must be low-latency.
- The system must handle concurrent access from thousands of clinical workstations across multiple campuses.

---

## 11. Tool and technology selection — fit-for-purpose over familiarity (design principle)

**The constraint:** When selecting tools, libraries, or approaches for a given concern, evaluate candidates based on fit against the platform's actual requirements — not on prior team familiarity alone.

**Why it matters:** The tooling ecosystem for healthcare platforms has matured significantly. For many cross-cutting concerns — fine-grained authorization, identity federation, event streaming, observability, policy management — purpose-built modern solutions exist that are well-documented, actively maintained, and battle-tested in production at scale. These purpose-built tools often handle complex requirements (attribute-based access control, tenant-scoped policies, consent-aware data sharing) more completely and with less custom code than general-purpose tools that happen to have that feature as a secondary capability.

The risk of defaulting to familiar tools is not just suboptimal technology — it's hidden cost. A general-purpose tool pressed into service for a specialized concern often requires significant custom middleware, workarounds, and ongoing maintenance to cover the gaps. That custom code becomes an undocumented, untested layer that the team must maintain indefinitely, without the benefit of community support, security patches, or upstream improvements.

**What it implies:**

- For each major technical concern (authorization, authentication, event bus, integration, observability), the team should evaluate at least two candidates — including at least one modern, purpose-built option — against the platform's specific requirements before committing.
- Evaluation criteria should include: alignment with the platform's requirements (e.g., does it natively support multi-tenant scoped policies, or would we need to build that?), quality of documentation, community adoption and maintenance activity, operational model (self-hosted vs. managed, licensing), and the amount of custom code required to bridge gaps.
- "We've used X before" is a valid data point (operational experience reduces risk), but it is not sufficient justification if X requires significant custom work to meet requirements that a purpose-built alternative handles natively.
- Decisions should be documented with the evaluation criteria and trade-offs (this is what the ADR process is for).
