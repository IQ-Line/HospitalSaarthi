# ADR-0004: AuthZ with Cerbos sidecar

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform requires an authorization engine that evaluates fine-grained, attribute-based access control policies at the application layer for every module. Authorization must handle diverse principal types (human users, service accounts, organizations, automated agents), enforce tenant isolation structurally, and operate with sub-millisecond latency in the request hot path. The engine must be deployable on-premises and must not create a central bottleneck or single point of failure. See [HLD 04 §3 — Authorization architecture](../hld/04-authn-authz-flow.md#3-authorization-architecture), [HLD 04 §4 — Request authorization flow](../hld/04-authn-authz-flow.md#4-request-authorization-flow), and [HLD 03 §4 — Cerbos sidecar integration](../hld/03-module-shape-template.md#4-cerbos-sidecar-integration).

## Decision drivers

- **Application-level authorization, not infrastructure-level.** The platform needs to answer "can this doctor view this patient's psychiatric record in this department?" — not "can this pod talk to that pod." Authorization decisions depend on domain attributes (roles, department, tenant, resource sensitivity) that only the application layer knows ([HLD 04 §4 — Request authorization flow](../hld/04-authn-authz-flow.md#4-request-authorization-flow)).
- **Diverse principal types evaluated by one engine.** Human users, service accounts, organizations, partner systems, and automated agents all flow through the same policy substrate. The engine must natively support principal attributes and roles without requiring custom plumbing for each principal type ([HLD 04 §9 — Cerbos principal types](../hld/04-authn-authz-flow.md#9-cerbos-principal-types)).
- **Tenant isolation as a structural guarantee.** Every resource policy must inherit a base tenant-isolation rule. This cannot be something module developers remember to add — it must be enforced by the policy engine's inheritance model ([HLD 04 §8 — Tenant isolation via authorization](../hld/04-authn-authz-flow.md#8-tenant-isolation-via-authorization)).
- **Latency and availability.** Authorization is in the request hot path. A centralized authorization service introduces network latency and becomes a single point of failure. The engine must be co-locatable with each module ([HLD 04 §3.2 — sidecar deployment](../hld/04-authn-authz-flow.md#32-deployment-model--sidecar-per-module-pod)).
- **Policy readability for the team.** Authorization policies encode clinical and regulatory rules. They must be readable and reviewable by domain experts and developers who are not policy-language specialists.

## Considered options

1. **OPA (Open Policy Agent) with Rego, deployed as sidecar** — use OPA as the policy decision point, writing policies in the Rego language, deployed as a sidecar per module pod.
2. **Cerbos sidecar** — use Cerbos as the policy decision point, writing policies in YAML, deployed as a sidecar per module pod communicating over loopback gRPC.
3. **Custom authorization middleware per module** — each module implements its own authorization logic in application code, using a shared authorization library.
4. **Hand-rolled RBAC middleware** — custom authorization logic embedded in each module, role checks in application code, permission tables in each module's database.
5. **Keycloak Authorization Services** — Keycloak's built-in authorization engine with UMA (User-Managed Access) and fine-grained permissions.

## Decision outcome

Chosen option: **Cerbos sidecar**, because it is purpose-built for application-level authorization with native support for principal roles/attributes, resource attributes, and scoped policies, while its YAML policy format is substantially more readable than Rego for a team whose primary expertise is application development rather than policy engineering.

Key verified facts supporting this decision:

- **Licensing:** Cerbos is Apache 2.0, free and open source. The self-hosted PDP has no usage limits, no principal caps, and no license key. "Cerbos Hub" (paid) is an optional cloud management console — we do not use it.
- **Frontend integration:** The official `@cerbos/react` SDK provides React hooks for per-component authorization checks. `@cerbos/http` serves browser-based clients. `@cerbos/embedded` runs the PDP on-device for offline/rural scenarios — directly relevant for AIIMS and government hospital deployments.
- **Multi-role principals:** The principal `roles` field is an array with union semantics (if any role grants, access is granted). Derived roles are computed at evaluation time from attributes (e.g., `treating_physician` derived from a doctor-patient assignment record), enabling relationship-based access without hardcoding role hierarchies.
- **Nesting depth:** No hard limit. Resource hierarchy is modeled via convention in resource kinds (e.g., `opd:registration:patient_search`), action wildcards (e.g., `a:*:d`), scoped policies (up to 4 levels), and arbitrarily nested attributes in CEL conditions.
- **Production adoption:** Used by Salesforce, Chargebee, and others in production, providing evidence of viability at scale.

### Consequences

**Positive:**

- Cerbos's resource policy model maps directly to the platform's authorization domain: principals have roles and attributes, resources have types and attributes, actions are named operations. No impedance mismatch between the domain model and the policy language.
- YAML policies are readable by developers and reviewable by clinical domain experts who understand the access rules but would not learn Rego. Policy reviews in pull requests are tractable.
- The sidecar deployment model gives each module pod its own PDP. Authorization decisions are evaluated in-memory over loopback gRPC — sub-millisecond latency, no network hop, no central bottleneck. A module's authorization survives network partitions and outages in other modules.
- Cerbos's `PlanResources` API enables pushing authorization filters into SQL `WHERE` clauses, solving the N+1 authorization problem for list views without application-level workarounds.
- Scoped policies natively support tenant-specific authorization overrides without forking the base policy set. The `iq_tenant_id` is passed as a scope identifier and Cerbos resolves the most specific matching policy.
- Tenant isolation is enforced via a base policy that all resource policies inherit. Module developers cannot accidentally omit it.

**Negative / accepted trade-offs:**

- Cerbos is a younger project than OPA. Its community and ecosystem are smaller. We accept this because Cerbos's feature set covers our requirements, the YAML policy format is a significant team productivity advantage, and the sidecar deployment model means we are not dependent on a centralized Cerbos service that would be difficult to replace.
- Every module pod runs a Cerbos sidecar container, increasing per-pod resource consumption (memory and CPU). Cerbos's in-memory policy evaluation is lightweight (the PDP binary is ~30MB, typical memory usage under 50MB), but this is a non-zero overhead multiplied by every replica of every module. We accept this because the latency and availability benefits of co-location outweigh the resource cost.
- Cerbos policies are YAML, which is less expressive than Rego for complex logical compositions. If a policy requires deeply nested conditional logic, YAML becomes unwieldy. We accept this because the overwhelming majority of HIMS authorization rules are role + attribute + tenant checks — exactly what Cerbos's policy model is optimized for. The rare complex case can use Cerbos's derived roles and condition expressions.

**Follow-up actions:**

- [ ] Establish the Cerbos policy Git repository with CI pipeline: `cerbos compile` + `cerbos test` on every PR.
- [ ] Define the base tenant-isolation policy and verify that all resource policies inherit it.
- [ ] Build the PEP middleware SDK with `CheckResources`, `PlanResources`, and request-scoped caching support, as specified in [HLD 03 §2](../hld/03-module-shape-template.md#2-pep-middleware).
- [ ] Define the Cerbos sidecar container spec for the standard module pod (resource limits, health checks, policy bundle mount).
- [ ] Confirm Cerbos policy storage strategy: Git + bundle distribution as default, Admin API disabled. See [HLD 04 §11.1](../hld/04-authn-authz-flow.md#111-cerbos-policy-storage-and-distribution).

## Pros and cons of the options

### OPA (Open Policy Agent) with Rego sidecar

- *Good:* Mature, widely adopted policy engine with a large community and extensive documentation. Graduated CNCF project.
- *Good:* Rego is a general-purpose policy language — it can express any authorization logic, no matter how complex.
- *Good:* OPA is infrastructure-agnostic and well-understood in the Kubernetes ecosystem.
- *Good:* Sidecar deployment model is well-documented and battle-tested.
- *Bad:* Rego has a steep learning curve. It is a Datalog-derived logic programming language. Developers and clinical domain experts reviewing authorization rules would need to learn a new paradigm. Policy reviews become bottlenecked on the subset of the team that understands Rego.
- *Bad:* OPA is general-purpose — it is designed for Kubernetes admission control, API gateway policies, and application authorization. It has no built-in concept of "principal," "resource," or "action" at the schema level. The HIMS authorization model (principal attributes, resource attributes, actions, tenant scopes) would need to be modeled from scratch in Rego, with no guardrails to ensure consistency across policies.
- *Bad:* No native `PlanResources` equivalent. Pushing authorization filters into SQL queries requires custom OPA-to-SQL translation code that the team must build and maintain.
- *Bad:* No native scoped-policy model for tenant-specific overrides. Tenant-specific rules would need to be encoded as Rego conditionals, increasing policy complexity.

### Cerbos sidecar

- *Good:* Purpose-built for application-level authorization. First-class concepts for principals (with roles and attributes), resources (with types and attributes), and actions. The policy schema enforces a consistent structure across all policies.
- *Good:* YAML policies are readable without specialized training. A policy saying "a user with role `doctor` in department `cardiology` can `view` a `patient_record` where `resource.department == principal.department`" reads as structured English.
- *Good:* `PlanResources` API returns an AST of authorization conditions that the PEP can translate to SQL `WHERE` clauses — a native solution to the N+1 authorization problem.
- *Good:* Scoped policies enable tenant-specific overrides without forking the base policy set.
- *Good:* Sidecar deployment with loopback gRPC. Sub-millisecond evaluation, no central bottleneck.
- *Good:* Built-in `cerbos test` framework for policy testing in CI with fixture data.
- *Good:* Apache 2.0 licensed, free and open source. Self-hosted PDP has no usage limits, no principal caps, no license key. Cerbos Hub (paid cloud console) is optional and not required.
- *Good:* Official `@cerbos/react` SDK provides React hooks for per-component authorization checks. `@cerbos/http` for browser clients. `@cerbos/embedded` runs the PDP on-device for offline/rural scenarios.
- *Good:* Multi-role principals with union semantics (if any role grants, access is granted). Derived roles computed at evaluation time from attributes (e.g., `treating_physician` from doctor-patient assignment).
- *Good:* No hard limit on nesting depth. Resource hierarchy modeled via convention in resource kinds (e.g., `opd:registration:patient_search`), action wildcards, scoped policies (up to 4 levels), and arbitrarily nested attributes in CEL conditions.
- *Good:* Production adoption by Salesforce, Chargebee, and others — evidence of viability at scale.
- *Bad:* Younger project than OPA. Smaller community and fewer third-party integrations.
- *Bad:* YAML is less expressive than a general-purpose policy language for deeply nested conditional logic.
- *Bad:* Per-pod sidecar adds resource overhead (mitigated by Cerbos's lightweight footprint).

### Custom authorization middleware per module

- *Good:* No external dependency. Authorization logic is application code, debuggable with standard tooling.
- *Good:* Maximum flexibility — each module can implement exactly the authorization logic it needs.
- *Bad:* Authorization logic is scattered across modules. There is no single policy repository, no unified testing, no cross-module consistency guarantee. Each module team interprets and implements authorization rules independently.
- *Bad:* Tenant isolation must be manually implemented in every module. A single module that omits the `iq_tenant_id` check creates a cross-tenant data leak. There is no structural guarantee.
- *Bad:* Policy changes require code deployments. A new authorization rule — "radiologists can now view pathology reports" — requires a code change in every affected module, tested and deployed independently.
- *Bad:* No `PlanResources` equivalent. List-view authorization requires either N+1 checks or hand-written SQL filter logic per endpoint, duplicated across modules.
- *Bad:* Audit trail for authorization decisions must be built from scratch. Cerbos and OPA provide this natively.
- *Bad:* Does not scale with the platform. 38 functional modules with independently maintained authorization logic is a maintenance and security liability.

### Hand-rolled RBAC middleware

- *Good:* Zero external dependency — fully within the team's control.
- *Good:* Simple to start — a few `if (user.hasRole('doctor'))` checks per endpoint.
- *Good:* No new tool to learn for developers already familiar with the framework.
- *Bad:* Authorization logic scatters across every module. No central policy view, no way to answer "what can user X do across the platform?" without reading code in N modules.
- *Bad:* Testing is per-module and ad-hoc. No equivalent of `cerbos test` that validates the full policy suite in CI.
- *Bad:* Feature-flag-level authorization (tenant A allows nurse lab orders, tenant B doesn't) requires custom per-tenant branching logic that grows combinatorially with tenants and features.
- *Bad:* N+1 problem on list views (check each record individually) has no systematic solution — each module team reinvents filtering logic.
- *Bad:* ABAC (attribute-based) policies — needed for "treating physician can see THIS patient" — require building a policy engine inside the application. At that point you're reimplementing Cerbos without the testing framework, audit trail, or sidecar isolation.
- *Bad:* No audit trail of authorization decisions without building custom logging per module.

### Keycloak Authorization Services

- *Good:* Mature project with enterprise adoption and extensive documentation.
- *Good:* Supports UMA, fine-grained permissions, and policy evaluation.
- *Good:* Integrated with Keycloak's identity management — single tool for AuthN + AuthZ.
- *Bad:* JVM-based. Memory footprint (512MB–1GB minimum per instance) is prohibitive for sidecar-per-pod deployment. Would require a centralized authorization server, creating a single point of failure and network latency on every authorization check.
- *Bad:* Policies defined via Keycloak Admin UI or REST API, not as code. No Git versioning, no CI testing, no PR review of policy changes. Policy changes are runtime operations, not deploy-time operations.
- *Bad:* UMA model is designed for user-managed resource sharing (OAuth-style), not for institution-managed clinical access control. Hospital authorization ("doctors in cardiology can view cardiac patients") doesn't map naturally to UMA's resource owner/requesting party model.
- *Bad:* Hostile to embedded mode — cannot run Keycloak's authorization engine as an in-process library. Defeats library-first module design.
- *Bad:* Vendor lock-in to the Keycloak ecosystem for both AuthN AND AuthZ. If we later need to swap AuthN (e.g., better-auth), we lose AuthZ too.

## Links

- Related ADRs: [ADR-0003](./0003-authn-better-auth-identity-adapter.md), [ADR-0005](./0005-policy-as-code-permission-data-as-config.md), [ADR-0015](./0015-bff-role-zero-trust.md)
- Related HLD: [HLD 04 §3 — Authorization architecture](../hld/04-authn-authz-flow.md#3-authorization-architecture), [HLD 04 §4 — Request authorization flow](../hld/04-authn-authz-flow.md#4-request-authorization-flow), [HLD 03 §4 — Cerbos sidecar integration](../hld/03-module-shape-template.md#4-cerbos-sidecar-integration)
- External sources:
  - Cerbos, "Documentation — How Cerbos Works", https://docs.cerbos.dev/cerbos/latest/concepts, accessed 2026-04-28
  - Cerbos, "Documentation — Policy Testing", https://docs.cerbos.dev/cerbos/latest/policies/compile, accessed 2026-04-28
  - Cerbos, "Pricing — Open Source, Free Forever", https://www.cerbos.dev/pricing, accessed 2026-04-28
  - Cerbos, "React SDK", https://github.com/cerbos/cerbos-sdk-javascript/tree/main/packages/react, accessed 2026-04-28
  - NIST, "SP 800-162: Guide to Attribute Based Access Control (ABAC) Definition and Considerations", https://csrc.nist.gov/pubs/sp/800/162/final, accessed 2026-04-28
