# ADR-0005: Policy-as-code, permission-data-as-config

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform's authorization model has two distinct inputs: the **rules** that govern access ("a pharmacist in the pharmacy department can dispense medications for their tenant") and the **data** those rules evaluate against ("user X has role pharmacist, user Y moved from Cardiology to Pulmonology, tenant A allows nurses to order labs"). These two inputs change at fundamentally different cadences and require different governance models. Conflating them forces a choice between blocking administrative changes behind code deployments or allowing untested policy changes from a UI — neither is acceptable for a healthcare platform. See [HLD 04 §3.3–3.5](../hld/04-authn-authz-flow.md#33-policies-as-code) and [HLD 03 §4 — Policies as code, Permission data as UI-configurable](../hld/03-module-shape-template.md#4-cerbos-sidecar-integration).

## Decision drivers

- **Policies encode clinical and regulatory rules.** Who can prescribe controlled substances, who can view psychiatric records, who can override an allergy alert — these are rules with patient safety implications. They must be reviewed by domain experts, tested against scenarios, and auditable in version control. A wrong policy deployed to production is a clinical risk ([HLD 04 §3.3 — Policies as code](../hld/04-authn-authz-flow.md#33-policies-as-code)).
- **Permission data changes daily.** Staff join and leave, doctors transfer departments, nurses are assigned charge roles, new tenants onboard with their own organizational structures. These changes must happen immediately through an administrative interface without waiting for a code deployment ([HLD 04 §3.4 — Permission data as configuration](../hld/04-authn-authz-flow.md#34-permission-data-as-configuration)).
- **Tenant-specific authorization varies at the data level, not the policy level.** "Hospital A allows nurses to order labs; Hospital B does not" is a data difference (tenant-specific scope override), not a policy difference. The policy rule "a user with capability `lab:order:create` can create lab orders" is the same everywhere — what differs is whether nurses in a given tenant are assigned that capability ([HLD 04 §8.3 — Cerbos scopes for tenant-specific rules](../hld/04-authn-authz-flow.md#83-cerbos-scopes-for-tenant-specific-rules)).
- **Auditability and rollback.** Policy changes must be traceable to a commit, a reviewer, and a test run. Permission data changes must be traceable to an admin action with a timestamp. Both must be rollback-able, but through different mechanisms — `git revert` for policies, admin UI undo or restore for data.

## Considered options

1. **All authorization logic in application code** — authorization rules and role/permission data are both maintained in application code, deployed together.
2. **All authorization in external policy engine (policies + data)** — both the rules and the data that rules evaluate against are managed within the Cerbos policy engine, either as YAML policy files or through the Cerbos Admin API.
3. **Policy-as-code (Git/CI) + permission-data-as-config (UI/admin)** — authorization rules are YAML policies versioned in Git and deployed through CI; permission data (roles, role assignments, hierarchies, tenant-specific scope overrides) is managed through an administrative UI and stored in the platform's database.

## Decision outcome

Chosen option: **Policy-as-code (Git/CI) + permission-data-as-config (UI/admin)**, because policies and permission data change at different cadences and require different governance. Policies change with software releases (reviewed, tested, deployed); permission data changes with organizational structure (immediately, via admin UI, no deploy). Conflating them either blocks operational agility behind deployment cycles or undermines policy rigor with untested runtime changes.

### Consequences

**Positive:**

- Policy changes go through pull-request review, `cerbos test` in CI, and controlled deployment. A new rule like "radiologists can now view pathology reports for their patients" is reviewed by a clinical domain expert and a security engineer before it reaches any PDP. If the policy causes issues, `git revert` rolls it back.
- Permission data changes are immediate. A hospital administrator reassigns Dr. Sharma from Cardiology to Pulmonology through the admin UI; the change takes effect on Dr. Sharma's next token refresh without waiting for a code deployment. No engineering involvement required.
- Tenant-specific authorization overrides (e.g., "nurses in this hospital can order labs") are expressed as permission data — a scope override configured in the admin UI — not as tenant-forked policy files. This prevents policy proliferation across tenants.
- The split is auditable from both sides. Policy audit trail lives in Git (commits, PRs, reviewers). Permission data audit trail lives in the platform's database (who changed what, when, with admin action logs).

**Negative / accepted trade-offs:**

- Two systems to understand. Developers and administrators must grasp which authorization behaviors are governed by policies (change via PR) versus data (change via UI). A miscategorization — putting what should be a policy into data, or vice versa — weakens either governance or agility. Mitigated by clear documentation and the ADR itself serving as the decision record.
- Cerbos policies reference attributes (roles, department, tenant scope) whose values come from the permission data layer. A policy can reference a role that does not exist in the data layer, or the data layer can define a role that no policy recognizes. Testing must cover the integration between policies and data. Mitigated by CI tests that use fixture data mirroring real permission-data shapes, and by validation in the admin UI that warns when creating roles not referenced by any policy.
- The permission data layer (User Management database + Configurator) must be highly available for authorization to function correctly. If permission data is stale (e.g., a role assignment change has not propagated), authorization decisions will be based on outdated attributes. Mitigated by short cache TTLs on permission data in the PEP and by including role/department data in the JWT itself (refreshed at token refresh time).

**Follow-up actions:**

- [ ] Establish the Cerbos policy Git repository with `cerbos compile` and `cerbos test` in the CI pipeline. Define fixture data conventions that mirror real permission-data shapes.
- [ ] Build the permission-data admin UI in the User Management module for role definitions, role assignments, and department hierarchy management.
- [ ] Build the tenant-specific scope override UI in the Configurator for tenant-level authorization customization.
- [ ] Define the boundary: document which authorization behaviors are policies (Git) versus data (UI) for each module, starting with the Pharmacy worked example from [HLD 03 §11](../hld/03-module-shape-template.md#11-worked-example-the-pharmacy-module).

## Pros and cons of the options

### All authorization logic in application code

- *Good:* Simple mental model — authorization is code, deployed and tested like all other code. No external policy engine to operate.
- *Good:* No impedance mismatch between policy and data — everything is in one place.
- *Bad:* Permission data changes (role assignments, department transfers) require code deployments. A hospital administrator cannot reassign a doctor's department without an engineering deployment cycle. This is unacceptable for daily operational changes in a hospital with hundreds of staff.
- *Bad:* Authorization logic is scattered across 38+ modules. No single view of "who can do what." Each module team implements and tests independently, creating inconsistency and duplication.
- *Bad:* No structural tenant isolation. Every module must independently implement the tenant check. A single omission is a cross-tenant data leak.
- *Bad:* Audit trail for authorization rules is mixed into the application's commit history. Extracting "what changed about access control" requires filtering commits — there is no dedicated policy history.

### All authorization in external policy engine (policies + data)

- *Good:* Single system for all authorization concerns. Policies and the data they evaluate against are co-located in the policy engine.
- *Good:* The Cerbos Admin API supports runtime policy updates without code deployments, which could handle permission data changes.
- *Bad:* Using the Admin API for frequent permission data changes (role assignments, department transfers) means authorization data bypasses version control and code review. A hospital administrator making a role assignment through the Admin API is effectively making an untested policy change. The "policies as code" guarantee is undermined.
- *Bad:* The Cerbos policy language is designed for rules, not for data management. Encoding hundreds of role assignments, department hierarchies, and tenant-specific overrides as YAML policy files or Admin API records is an abuse of the policy engine — it becomes a bespoke database without the query, indexing, or administrative tooling that a real database provides.
- *Bad:* Scaling concern: with N tenants and M roles and K departments, the combinatorial explosion of permission data encoded as policies makes the policy bundle large, slow to compile, and difficult to test comprehensively.

### Policy-as-code (Git/CI) + permission-data-as-config (UI/admin)

- *Good:* Each type of authorization input gets the governance model it needs. Policies get code review, CI testing, and version control. Permission data gets an admin UI, immediate effect, and database-backed audit logs.
- *Good:* Policies are stable and portable across tenants. Tenant-specific variations are expressed as permission data (scope overrides), not policy forks.
- *Good:* The permission-data layer (User Management database) has proper indexing, querying, backup, and administrative tooling. It is a database, not a policy engine misused as a database.
- *Good:* `cerbos test` in CI validates policies against fixture data that mirrors real permission-data shapes, catching policy/data integration issues before deployment.
- *Bad:* Two systems to understand and maintain. The boundary between "policy" and "data" must be clearly documented and consistently enforced.
- *Bad:* Integration risk between the policy layer and the data layer (policies referencing attributes the data layer does not provide, or vice versa).
- *Bad:* The permission-data admin UI is a non-trivial build (role management, hierarchy management, scope overrides, audit logging).

## Links

- Related ADRs: [ADR-0004](./0004-authz-cerbos-sidecar.md), [ADR-0003](./0003-authn-better-auth-identity-adapter.md)
- Related HLD: [HLD 04 §3.3 — Policies as code](../hld/04-authn-authz-flow.md#33-policies-as-code), [HLD 04 §3.4 — Permission data as configuration](../hld/04-authn-authz-flow.md#34-permission-data-as-configuration), [HLD 04 §3.5 — Why the policy/data split matters](../hld/04-authn-authz-flow.md#35-why-the-policydata-split-matters), [HLD 03 §4 — Cerbos sidecar integration](../hld/03-module-shape-template.md#4-cerbos-sidecar-integration)
- External sources:
  - Cerbos, "Documentation — Testing Policies", https://docs.cerbos.dev/cerbos/latest/policies/compile, accessed 2026-04-28
  - NIST, "SP 800-162: Guide to Attribute Based Access Control (ABAC) Definition and Considerations, §3.2 — ABAC Concepts", https://csrc.nist.gov/pubs/sp/800/162/final, accessed 2026-04-28
