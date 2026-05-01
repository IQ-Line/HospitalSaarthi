# User Management — Schema Design

**Module:** User Management (core platform module)  
**Schema name:** `user_management`  
**Related HLD:** [02-core-modules.md §1](../../hld/02-core-modules.md#1-user-management) | [04-authn-authz-flow.md](../../hld/04-authn-authz-flow.md)  
**Related ADRs:** [ADR-0003](../../adr/0003-authn-better-auth-identity-adapter.md) (AuthN) | [ADR-0005](../../adr/0005-policy-as-code-permission-data-as-config.md) (Policy/Data split) | [ADR-0004](../../adr/0004-authz-cerbos-sidecar.md) (Cerbos sidecar) | [ADR-0012](../../adr/0012-multi-tenancy-isolation-strategy.md) (Multi-tenancy)  
**ERD (visual):** [`user-management.erd.json`](./user-management.erd.json) — open in VS Code with ERD Editor extension  
**Schema reference:** [`schema-reference.json`](./schema-reference.json) — full column descriptions, indexes, check constraints, Citus distribution notes

---

## 1. Three-layer auth data model

Authentication and authorization data is split across three layers, each with its own change cadence and governance:

| Layer | What | Where | Changes via |
|-------|------|-------|-------------|
| **Layer 1 — AuthN** | Credentials, sessions, OAuth accounts, MFA state | better-auth managed tables in `user_management` schema | better-auth library (login, registration, MFA enrollment) |
| **Layer 2 — AuthZ policies** | Cerbos YAML policies — who can do what under what conditions | Git repository, deployed as compiled bundles to Cerbos sidecars | Pull request, CI (`cerbos compile` + `cerbos test`), deploy |
| **Layer 3 — AuthZ data** | Roles, capabilities, role assignments, department assignments, delegations, clearances | Platform-owned tables in `user_management` schema | Admin UI, User Management APIs |

Layer 2 is NOT in the database. Cerbos policies are code, stored in Git, and deployed to sidecars as bundles. This schema covers Layers 1 and 3.

The boundary between Layer 2 and Layer 3 is the core insight from [ADR-0005](../../adr/0005-policy-as-code-permission-data-as-config.md): **policies are stable and change with software releases; permission data changes with organizational structure and must be immediately configurable by hospital admins without a code deployment.**

---

## 2. Capability model

### What capabilities are

Capabilities are the atomic unit of authorization. Each capability represents a single action on a single feature (e.g., `opd:registration:create`, `lab:results:verify`, `pharmacy:dispensing:override_interaction`). They are the bridge between:

- **Cerbos policies** (Layer 2) — which evaluate whether a principal has a given capability
- **Roles** (Layer 3 data) — which are containers of capabilities, configurable per tenant via admin UI

### Why capabilities exist

Without capabilities, tenant-specific authorization customization requires Cerbos policy changes. "Hospital A allows nurses to order labs; Hospital B does not" would mean forking a Cerbos policy per tenant. With capabilities, this becomes a data change: the "Nurse" role in Hospital A includes `lab:order:create`; in Hospital B it does not. The Cerbos policy simply checks `principal.capabilities.includes("lab:order:create")` — same policy for all tenants.

### Capability naming convention — hierarchical namespacing

Capabilities use colon-separated hierarchical names:

```
module:feature:action
module:feature:sub-feature:action
```

Examples:
```
opd:registration:create
opd:registration:search:advanced
opd:consultation:notes:view
opd:consultation:notes:edit
lab:order:create
lab:results:verify
lab:results:amend
pharmacy:dispensing:dispense
pharmacy:dispensing:override_interaction
billing:invoice:create
billing:invoice:void
admin:user:create
admin:user:deactivate
admin:role:assign
org:tenant:configure
org:reports:view
```

This naming convention is for **readability and UI grouping** — the frontend renders the capabilities list as a collapsible tree by splitting on `:`. The database stores each capability as a flat record with the full colon-separated `name`. Depth is organic per module, not fixed at a specific number of levels.

### Capabilities are a Citus reference table

The `capabilities` table is a **Citus reference table** (`SELECT create_reference_table('user_management.capabilities')`), NOT a distributed table. Reference tables are replicated to all Citus worker nodes, meaning:

- Capability lookups are always node-local (no cross-node queries)
- JOINs between the distributed `role_capabilities` table and the reference `capabilities` table are local on every node
- Capabilities are platform-defined (the same set across all tenants), so replication is semantically correct

### What capabilities are NOT

- **Capabilities are NOT in the JWT.** JWTs carry `roles[]`. The PEP middleware resolves roles → capabilities at request time from cached User Management data. This keeps JWTs small and avoids capability-list staleness between token refreshes.
- **Capabilities are NOT Cerbos policies.** Cerbos policies reference capabilities as principal attributes. The policy is code; the capability assignment is data.
- **Capabilities do NOT form an inheritance hierarchy.** `opd:registration:create` does not automatically grant `opd:registration:search`. Each capability is independently assigned. If a role should have both, assign both. Inheritance makes auditing ("what can this person do?") exponentially harder.

---

## 3. Role model

### No role inheritance

Roles are flat containers of capabilities. A "Senior Doctor" role does not "inherit from" a "Doctor" role. If Senior Doctor should have all Doctor capabilities plus more, all Doctor capabilities are explicitly assigned to the Senior Doctor role.

**Why:** Role inheritance creates transitive permission chains that are extremely difficult to audit. When a compliance officer asks "can Dr. Sharma prescribe controlled substances?", the answer should be a single database query, not a recursive traversal of a role hierarchy. The Pathlock/NIST RBAC literature explicitly warns about hierarchy complexity in constrained RBAC (INCITS 359-2004, §6.2 — Role Hierarchies). The added verbosity is a small price for auditability.

### Tenant-scoped roles

Roles are defined per tenant. The same tenant may define different roles from another tenant. Platform-seeded roles (marked `is_system = true`) provide defaults that tenants can supplement but not delete.

### Organization-scoped roles

For multi-hospital organizations, roles can have `scope_level = 'organization'`. These grant access across all tenants within an `org_id`. Example: a Regional Medical Director needs read access to reports across all hospitals in their organization. The org-scoped role is assigned to their `users` record in each tenant (see §4 for org-level user design), and Cerbos policies evaluate `scope_level` as an attribute.

---

## 4. Organization-level users

### Design: user record per tenant, linked by `auth_user_id`

A user who operates across multiple tenants (e.g., Dr. Sharma works at both City Hospital and District Hospital) has **one `users` row per tenant**, linked by the same `auth_user_id` (pointing to the better-auth user record). This is not duplication — it reflects the fact that Dr. Sharma may have different roles, department assignments, and clearances at each hospital.

**Why this design (vs. a single user record with a `user_tenant_assignments` table):**

1. **Citus co-location.** Each `users` row is distributed by `iq_tenant_id` and lives on that tenant's shard. JOINs to `role_assignments`, `user_department_assignments`, and other tenant-scoped tables are all shard-local. A single user record spanning tenants cannot be distributed by `iq_tenant_id` — it would need to be a reference table, which defeats the purpose of Citus distribution for the largest table in the module.

2. **Multi-tenant login flow.** On authentication, better-auth resolves the `auth_user_id`. User Management looks up all `users` rows sharing that `auth_user_id`. The frontend presents a tenant picker. The user selects a tenant, and the JWT is issued with that specific `iq_tenant_id` and the roles from that tenant's `users` + `role_assignments` rows. Tenant switching re-issues a JWT — no re-authentication needed.

3. **Clean authorization boundary.** Every module downstream sees a single-tenant user. The JWT has one `iq_tenant_id`, one set of roles. The multi-tenant concept does not leak past the login flow.

### Organization ID

Users who are part of a multi-hospital organization carry `org_id` on their `users` record. This enables:

- Org-scoped roles (see §3) that grant cross-tenant access within the organization
- `org_id` as a JWT claim, available to Cerbos policies for organization-level authorization
- Organization-level dashboards and reports

---

## 5. Delegations

Time-bounded delegation of authority from one user to another. Covers scenarios like:

- A superintendent delegates approval authority to a deputy for 2 weeks during leave
- A department head delegates prescription counter-signing to a senior resident during a conference

Delegations can be scoped to a specific role or a specific capability. They have explicit `effective_from` / `effective_to` dates and a mandatory `reason`. The PEP enrichment pattern (see §7) includes active delegations when constructing the Cerbos principal.

Delegations are always tenant-scoped (the delegator and delegatee must be in the same tenant).

---

## 6. Clearances

Sensitivity clearances control access to records flagged with sensitivity levels (psychiatric, VIP, HIV status, substance abuse). These are distinct from role-based access:

- A cardiologist (role) may or may not have psychiatric record clearance (clearance)
- A nurse (role) in the VIP ward may have VIP clearance; the same nurse transferred to general medicine loses it

Clearances have lifecycle: `granted_by`, `granted_at`, `expires_at`, `revoked_at`. They are an ABAC attribute that Cerbos policies evaluate alongside roles and capabilities.

---

## 7. PEP enrichment pattern

When a module's PEP middleware receives a request, it:

1. Extracts `sub`, `iq_tenant_id`, `roles[]`, `department`, `org_id` from the JWT
2. Looks up the user's **capabilities** by resolving `roles[]` → `role_capabilities` → `capabilities` (from User Management cache, not live DB query)
3. Looks up **active delegations** for this user (from cache)
4. Looks up **clearances** for this user (from cache)
5. Constructs a Cerbos principal with all attributes:
   ```
   {
     id: user_id,
     roles: ["attending-physician"],
     attr: {
       iq_tenant_id: "...",
       department: "cardiology",
       org_id: "..." or null,
       capabilities: ["opd:consultation:notes:edit", "opd:prescription:create", ...],
       delegated_capabilities: ["opd:consultation:notes:approve"],
       clearances: { psychiatric: "view", vip: "view_and_edit" }
     }
   }
   ```
6. Calls the Cerbos sidecar with this principal + the requested action + resource attributes

The cache is refreshed on `user.updated` and `role-assignment.changed` events from User Management, plus a TTL-based fallback.

---

## 8. JWT claims

| Claim | Source | Description |
|-------|--------|-------------|
| `sub` | `users.id` | Platform-internal user ID for the selected tenant |
| `iq_tenant_id` | `users.iq_tenant_id` | Tenant context for this session |
| `roles` | `role_assignments` | Array of role names assigned to this user in this tenant |
| `department` | `user_department_assignments` | Primary department ID |
| `org_id` | `users.org_id` | Organization ID, if applicable (null for single-tenant users) |
| `iss` | AuthN service | Issuer identifier |
| `exp` | AuthN service | Expiration timestamp (default 15 min) |
| `iat` | AuthN service | Issued-at timestamp |

**What is NOT in the JWT:** Capabilities, delegations, clearances. These are resolved by the PEP at request time from cached User Management data (see §7). This keeps JWTs compact and avoids capability staleness between token refreshes.

---

## 9. better-auth managed tables

better-auth manages its own tables for credential storage, session tracking, and OAuth account linking. These tables live in the `user_management` schema but are **not directly modified by platform code** — they are managed by the better-auth library through its adapter interface.

The link between better-auth and platform data is `users.auth_user_id` → `ba_users.id`. This is a logical reference, not a database foreign key, because better-auth's schema is managed by the library and may change across versions.

Table names are prefixed with `ba_` to distinguish them from platform-owned tables.

---

## 10. Projection tables

### `department_projection`

User Management subscribes to `master-data.department.created`, `master-data.department.updated`, and `master-data.department.deleted` events from the Master Data module. It maintains a local read projection of departments for:

- Populating department dropdowns in the admin UI
- Resolving department names for display alongside user records
- Providing department hierarchy to the PEP for Cerbos principal construction

Per [database principle §8](../../analysis/03-database-principles.md#8-projection-tables-are-first-class-schema-citizens), the projection is named `*_projection`, includes `last_synced`, and is rebuildable from events.

---

## 11. Audit

### `permission_change_audit`

All changes to authorization-relevant data are recorded in a dedicated audit table:

- Role assignments created/revoked
- Role-capability mappings changed
- Delegations created/revoked
- Clearances granted/revoked
- User status changes (active/inactive/suspended)

Each audit record captures who made the change, when, the old and new values (as JSONB), and an optional reason. This is in addition to Cerbos's own decision audit log (which records every ALLOW/DENY at the PDP level) — the permission change audit captures the data changes that affect future decisions.

---

## 12. Audit column exceptions

[Database principle §5](../../analysis/03-database-principles.md#5-every-table-has-standard-audit-columns) requires `created_at`, `updated_at`, `created_by`, `updated_by` on every table. The following tables deviate, with justification:

| Table | Missing | Justification |
|-------|---------|---------------|
| `capabilities` | `created_by`, `updated_by` | Platform-seeded by migrations, not by users |
| `role_capabilities` | `updated_at`, `updated_by` | Insert/delete pattern — mappings are not updated, they are removed and re-created |
| `role_assignments` | standard names | Uses semantic equivalents: `assigned_at`/`assigned_by` = created, `revoked_at`/`revoked_by` = soft-delete lifecycle |
| `user_department_assignments` | `updated_at`, `updated_by` | Insert/expire pattern — assignments are not edited, they are closed (`effective_to`) and a new one created |
| `delegations` | `updated_at`, `updated_by` | Create/revoke pattern — delegations are not edited |
| `user_clearances` | `created_by`, `updated_by` | Uses `granted_by` as semantic `created_by`. Clearances are granted and revoked, not edited. |
| `department_projection` | all four | Projection table — synced from events, `last_synced` replaces audit columns per [principle §8](../../analysis/03-database-principles.md#8-projection-tables-are-first-class-schema-citizens) |
| `permission_change_audit` | all four | IS the audit trail — uses `changed_at`/`changed_by`. Meta-auditing is unnecessary. |
| `ba_*` tables | `created_by`, `updated_by` | Managed by better-auth library, not platform code |

---

## 13. Citus distribution strategy

| Table | Distribution | Notes |
|-------|-------------|-------|
| `users` | Distributed by `iq_tenant_id` | All user queries are tenant-scoped |
| `roles` | Distributed by `iq_tenant_id` | Role definitions are per-tenant |
| `capabilities` | **Reference table** (replicated to all nodes) | Platform-defined, same for all tenants |
| `role_capabilities` | Distributed by `iq_tenant_id` | JOINs to reference `capabilities` are node-local |
| `role_assignments` | Distributed by `iq_tenant_id` | Co-located with `users` and `roles` |
| `user_department_assignments` | Distributed by `iq_tenant_id` | Co-located with `users` |
| `delegations` | Distributed by `iq_tenant_id` | Co-located with `users` |
| `user_clearances` | Distributed by `iq_tenant_id` | Co-located with `users` |
| `department_projection` | Distributed by `iq_tenant_id` | Projection, co-located with other tenant data |
| `idp_configurations` | Distributed by `iq_tenant_id` | Few rows per tenant, queried at login |
| `scim_sync_state` | Distributed by `iq_tenant_id` | Linked to `idp_configurations` |
| `permission_change_audit` | Distributed by `iq_tenant_id` | Append-only, co-located for tenant-scoped queries |
| `ba_users` | Distributed by `id` | better-auth managed; NOT distributed by tenant (auth_user_id spans tenants) |
| `ba_sessions` | Distributed by `user_id` | better-auth managed |
| `ba_accounts` | Distributed by `user_id` | better-auth managed |

### Co-location note

All platform-owned distributed tables use `iq_tenant_id` as the distribution key. This means JOINs between `users`, `role_assignments`, `roles`, `role_capabilities`, `user_department_assignments`, `delegations`, and `user_clearances` within a single tenant are all shard-local — no cross-node shuffles.

The better-auth tables are a special case: `ba_users` cannot be distributed by `iq_tenant_id` because a single better-auth user may authenticate into multiple tenants. These tables are queried only during login (not on every request), so the distribution mismatch is acceptable.

---

## 14. HLD updates required

This schema design introduces concepts not yet explicit in the HLD. The following documents need updates:

- [ ] **HLD-04 §3.4** — mention capabilities explicitly as the bridge between policy-as-code and data-as-config. Currently says "role definitions, role assignments, department hierarchies, tenant-specific scope overrides" — should add capabilities.
- [ ] **HLD-04 §1.5** — add `org_id` to the JWT claims table.
- [ ] **HLD-04 §4 Step 2** — mention PEP enrichment (resolving capabilities, delegations, clearances from cache) alongside the current "additional attributes may be fetched" language.
- [ ] **ADR-0005** — reference capabilities as the mechanism that makes tenant-specific authorization configurable without policy changes. Currently describes the principle; capabilities are the implementation.
- [ ] **HLD-02 §1.2** — add capabilities, delegations, and clearances to User Management's "Owns" list.
