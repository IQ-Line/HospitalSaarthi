# ADR-0005: Policy-as-code, authorization-data-as-config

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform uses a capability-based authorization model. The system therefore has two distinct inputs:

- **policy rules** that determine how access is evaluated
- **authorization data** that determines which capabilities and attributes a principal carries at runtime

These inputs change at different cadences and need different governance. Conflating them either slows down operational administration or makes access-control rules unreviewable.

## Decision drivers

- **Policies encode clinical and regulatory rules.** Who can prescribe controlled substances, who can view psychiatric records, who can override an allergy alert — these are rules with patient safety implications. They must be reviewed by domain experts, tested against scenarios, and auditable in version control. A wrong policy deployed to production is a clinical risk ([HLD 04 §3.3 — Policies as code](../hld/04-authn-authz-flow.md#33-policies-as-code)).
- **Authorization data changes daily.** Staff join and leave, doctors transfer departments, roles are assigned, and role composition changes. These changes must happen immediately through an administrative interface without waiting for a code deployment.
- **Tenant-specific authorization varies at the data level, not the policy level.** "Hospital A allows nurses to order labs; Hospital B does not" is a data difference (tenant-specific scope override), not a policy difference. The policy rule "a user with capability `lab:order:create` can create lab orders" is the same everywhere — what differs is whether nurses in a given tenant are assigned that capability ([HLD 04 §8.3 — Cerbos scopes for tenant-specific rules](../hld/04-authn-authz-flow.md#83-cerbos-scopes-for-tenant-specific-rules)).
- **Auditability and rollback.** Policy changes must be traceable to a commit, a reviewer, and a test run. Permission data changes must be traceable to an admin action with a timestamp. Both must be rollback-able, but through different mechanisms — `git revert` for policies, admin UI undo or restore for data.

## Considered options

1. **All authorization logic in application code** — rules and authorization data are both maintained in application code, deployed together.
2. **All authorization in external policy engine** — rules and runtime data both live in the policy engine.
3. **Policy-as-code + authorization-data-as-config** — Cerbos YAML policies are versioned in Git; capabilities, roles, assignments, delegations, and clearances are managed through User Management APIs and admin UI.

## Decision outcome

Chosen option: **Policy-as-code + authorization-data-as-config**, because policies and authorization data change at different cadences and require different governance. Policies change with software releases. Authorization data changes with organizational structure and runtime administration.

### Consequences

**Positive:**

- Policy changes go through pull-request review, `cerbos test` in CI, and controlled deployment. A new rule like "radiologists can now view pathology reports for their patients" is reviewed by a clinical domain expert and a security engineer before it reaches any PDP. If the policy causes issues, `git revert` rolls it back.
- Authorization data changes are immediate. A tenant admin can recompose a role or assign a role without a software deployment.
- Tenant-specific variation is expressed in role composition and assignments, not in tenant-forked policies.
- The split is auditable from both sides. Policy audit trail lives in Git. Authorization-data audit trail lives in the platform database.

**Negative / accepted trade-offs:**

- Two systems must stay aligned: Cerbos policies and User Management authorization data.
- Policies may assume attributes or capability keys that the data layer fails to supply; integration tests and runtime contract checks are required.
- Authorization data availability matters because runtime enrichment depends on it.

**Follow-up actions:**

- [ ] Keep Cerbos policies capability-based and tenant-isolated.
- [ ] Keep User Management as the source of truth for capability catalog, role composition, assignments, delegations, and clearances.
- [ ] Keep JWTs lightweight and continue resolving entitlements at runtime.

## Pros and cons of the options

### All authorization logic in application code

- *Good:* Simple mental model — authorization is code, deployed and tested like all other code. No external policy engine to operate.
- *Good:* No impedance mismatch between policy and data — everything is in one place.
- *Bad:* Authorization-data changes require code deployments, which is unacceptable for daily operational changes.
- *Bad:* Authorization logic is scattered across 38+ modules. No single view of "who can do what." Each module team implements and tests independently, creating inconsistency and duplication.
- *Bad:* No structural tenant isolation. Every module must independently implement the tenant check. A single omission is a cross-tenant data leak.
- *Bad:* Audit trail for authorization rules is mixed into the application's commit history. Extracting "what changed about access control" requires filtering commits — there is no dedicated policy history.

### All authorization in external policy engine (policies + data)

- *Good:* Single system for all authorization concerns. Policies and the data they evaluate against are co-located in the policy engine.
- *Good:* The Cerbos Admin API supports runtime policy updates without code deployments, which could handle permission data changes.
- *Bad:* Frequent authorization-data changes bypass the platform's domain model and administrative workflows.
- *Bad:* The Cerbos policy language is designed for rules, not for data management. Encoding hundreds of role assignments, department hierarchies, and tenant-specific overrides as YAML policy files or Admin API records is an abuse of the policy engine — it becomes a bespoke database without the query, indexing, or administrative tooling that a real database provides.
- *Bad:* Scaling concern: with N tenants and M roles and K departments, the combinatorial explosion of permission data encoded as policies makes the policy bundle large, slow to compile, and difficult to test comprehensively.

### Policy-as-code + authorization-data-as-config

- *Good:* Each input gets the right governance model. Policies are reviewed and versioned; authorization data is admin-managed and immediate.
- *Good:* Capability-based policies remain stable across tenants while role composition varies by tenant data.
- *Good:* The User Management database remains the right home for role composition and assignment queries.
- *Good:* CI can validate policy/data integration with representative capability and principal fixtures.
- *Bad:* Two systems must remain aligned, so the policy/data boundary must stay explicit.
- *Bad:* Integration risk between the policy layer and the data layer (policies referencing attributes the data layer does not provide, or vice versa).
- *Bad:* The permission-data admin UI is a non-trivial build (role management, hierarchy management, scope overrides, audit logging).

## Links

- Related ADRs: [ADR-0004](./0004-authz-cerbos-sidecar.md), [ADR-0003](./0003-authn-better-auth-identity-adapter.md)
- Related HLD: [HLD 04 §3.3 — Policies as code](../hld/04-authn-authz-flow.md#33-policies-as-code), [HLD 04 §3.4 — Permission data as configuration](../hld/04-authn-authz-flow.md#34-permission-data-as-configuration), [HLD 04 §3.5 — Why the policy/data split matters](../hld/04-authn-authz-flow.md#35-why-the-policydata-split-matters), [HLD 03 §4 — Cerbos sidecar integration](../hld/03-module-shape-template.md#4-cerbos-sidecar-integration)
- External sources:
  - Cerbos, "Documentation — Testing Policies", https://docs.cerbos.dev/cerbos/latest/policies/compile, accessed 2026-04-28
  - NIST, "SP 800-162: Guide to Attribute Based Access Control (ABAC) Definition and Considerations, §3.2 — ABAC Concepts", https://csrc.nist.gov/pubs/sp/800/162/final, accessed 2026-04-28
