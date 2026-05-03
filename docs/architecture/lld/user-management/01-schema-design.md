# User Management — Schema Design

**Module:** User Management (core platform module)  
**Schema name:** `user_management`  
**Related HLD:** [02-core-modules.md §1](../../hld/02-core-modules.md#1-user-management) | [04-authn-authz-flow.md](../../hld/04-authn-authz-flow.md)  
**Related ADRs:** [ADR-0003](../../adr/0003-authn-better-auth-identity-adapter.md) (AuthN) | [ADR-0005](../../adr/0005-policy-as-code-permission-data-as-config.md) (Policy/Data split) | [ADR-0004](../../adr/0004-authz-cerbos-sidecar.md) (Cerbos sidecar) | [ADR-0012](../../adr/0012-multi-tenancy-isolation-strategy.md) (Multi-tenancy)  
**ERD (visual):** [`user-management.erd.json`](./user-management.erd.json) — open in VS Code with ERD Editor extension  
**Schema reference:** [`schema-reference.json`](./schema-reference.json) — full column descriptions, indexes, check constraints, Citus distribution notes

**Phasing:** Sections §15–§18 are tagged with their implementation phase (MVP, Post-launch, or Federation). Future-phase sections validate that the MVP schema supports later features without migrations. See [HLD-04 — Implementation phasing](../../hld/04-authn-authz-flow.md) for the full phase breakdown.

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
| `jti` | AuthN service | Unique token ID for audit correlation and replay detection |
| `iss` | AuthN service | Issuer identifier |
| `exp` | AuthN service | Expiration timestamp (1-2 minutes — Token Handler pattern, see §16) |
| `iat` | AuthN service | Issued-at timestamp |

**What is NOT in the JWT:** Capabilities, delegations, clearances, email. Capabilities/delegations/clearances are resolved by the PEP at request time from cached User Management data (see §7). Email is excluded because `ba_users.email` is a synthetic internal key with no business meaning (see §9.1). This keeps JWTs compact and avoids staleness between token refreshes.

---

## 9. better-auth managed tables

better-auth manages its own tables for credential storage, session tracking, OAuth account linking, and JWKS key management. These tables live in the `user_management` schema but are **not directly modified by platform code** — they are managed by the better-auth library through its adapter interface. Session revocation, password resets, and user management operations MUST use `auth.api.*` methods, never direct SQL.

The link between better-auth and platform data is `users.auth_user_id` → `ba_users.id`. This is a logical reference, not a database foreign key, because better-auth's schema is managed by the library and may change across versions.

Table names are prefixed with `ba_` to distinguish them from platform-owned tables.

**Username as primary login credential:** The username plugin adds `ba_users.username` (TEXT, NOT NULL, UNIQUE) as the primary login field. Users authenticate with username + password — email is never shown on the login form and is never used for authentication.

**`jwks` table:** The JWT plugin manages a `jwks` table for JWKS key storage. Keys are DB-persisted (surviving pod restarts), with private keys encrypted at rest using AES-256-GCM by default. Key rotation must be explicitly configured — see §17 for details.

### 9.1 Synthetic email as identity anchor

better-auth requires `ba_users.email` to be NOT NULL and UNIQUE. Since real emails cannot be unique across tenants (Indian hospitals regularly have multiple staff sharing one email), and making the identity anchor depend on external mail infrastructure would violate the fragmented adoption constraint, all `ba_users.email` values use a non-routable synthetic pattern:

```
ba_users.email = "{username}@auth.internal"
```

**Why synthetic, not sub-addressed:** An earlier design proposed sub-addressed emails (`admin+N@hospital.com`). This was rejected after adversarial review because:

- It couples the AuthN identity anchor to tenant mail server features (many Indian hospitals run legacy Exchange/government mail that does not support RFC 5233 sub-addressing)
- Changing `ba_users.email` when a user gets their own email triggers better-auth's internal email verification, session invalidation, and account linking logic — unnecessary mutation of the identity anchor
- It creates social engineering risk: password reset emails to an admin inbox allow anyone with inbox access to hijack delegated accounts

The `@auth.internal` domain is non-routable. `ba_users.email` is an internal key that never changes, never leaks to business logic, and never depends on external infrastructure. Real emails, recovery routes, and contact info belong exclusively in platform-owned tables.

**Separation of concerns:**

| Concern | Where it lives | Mutability |
|---------|---------------|------------|
| AuthN identity anchor | `ba_users.email` = `{username}@auth.internal` | Never changes (username is immutable) |
| Business contact email | `users.email` (nullable, non-unique) | User or admin can update freely |
| Recovery email route | `delegated_recovery_routes` or `users.email` | Platform-managed, per recovery tier (§15) |
| Phone contact/auth | `ba_users.phoneNumber` (via phone plugin) | User-updatable with OTP verification |

**Precedent in better-auth source code:**

- The phone-number plugin uses `getTempEmail()` for phone-only users
- The anonymous plugin uses `getAnonUserEmail()` for anonymous users
- Source contains `TODO(#9124)` acknowledging email should be nullable in v2
- GitHub issues #2059, #2215, #2402 confirm community demand for non-unique/nullable email

**Security invariant:** Synthetic email values must never appear in JWTs, logs, UI, or any end-user-visible context. The `definePayload` callback on the JWT plugin explicitly excludes email from token claims.

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
| `delegated_recovery_routes` | `created_by`, `updated_by` | Operational table — changes are logged in `permission_change_audit` instead |
| `auth_identity_links` | `updated_at`, `updated_by` | Create/delete pattern — links are created and revoked, not edited. Uses `linked_by`/`linked_at` as semantic `created_by`/`created_at`. |
| `jwks` | all four | better-auth managed (JWT plugin). Uses `createdAt` in library convention. |

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
| `jwks` | **Local table** (single coordinator node) | better-auth managed; few rows, queried for token signing/verification only |
| `delegated_recovery_routes` | Distributed by `iq_tenant_id` | Co-located with `users`; queried during password reset |
| `auth_identity_links` | Distributed by `iq_tenant_id` | Co-located with `users`; queried during SSO callback |

### Co-location note

All platform-owned distributed tables use `iq_tenant_id` as the distribution key. This means JOINs between `users`, `role_assignments`, `roles`, `role_capabilities`, `user_department_assignments`, `delegations`, and `user_clearances` within a single tenant are all shard-local — no cross-node shuffles.

The better-auth tables are a special case: `ba_users` cannot be distributed by `iq_tenant_id` because a single better-auth user may authenticate into multiple tenants. These tables are queried only during login (not on every request), so the distribution mismatch is acceptable.

---

## 14. HLD updates required

This schema design introduces concepts not yet explicit in the HLD. The following documents need updates:

- [ ] **HLD-04 §1.2** — two-tier federation strategy + account linking workflow summary
- [ ] **HLD-04 §1.5** — add `jti`, `org_id` to JWT claims. Change `exp` default from 15 min to 1-2 min.
- [ ] **HLD-04 §1.6** — JWT plugin, DB-persisted keys, rotation, encryption, grace period.
- [ ] **HLD-04 §2** — username-based login, Token Handler, BFF role expanded.
- [ ] **HLD-04 §3.4** — add capabilities explicitly as the bridge between policy-as-code and data-as-config.
- [ ] **HLD-04 §4 Step 2** — mention PEP enrichment (resolving capabilities, delegations, clearances from cache).
- [ ] **HLD-04 §7** — Token Handler session management (add §7.4).
- [ ] **HLD-04 §11** — replace `[OPEN]` markers with decisions.
- [ ] **HLD-04 new §13** — OAuth 2.1 Provider.
- [ ] **HLD-04 new §14** — Recovery tier model summary.
- [ ] **ADR-0003** — username plugin, synthetic email, two-tier federation, recovery tier model, replaceability boundary. Replace OIDC Provider with OAuth 2.1 Provider.
- [ ] **ADR-0005** — reference capabilities as the mechanism implementing the policy/data split.
- [ ] **ADR-0015** — Token Handler. BFF role = "signature verification + session lifecycle management."
- [ ] **HLD-02 §1.2** — add capabilities, delegations, and clearances to User Management's "Owns" list.

---

## 15. Recovery tier model

> **Phase 1 (MVP):** `standard` and `admin_only` tiers, `must_change_password`, `recovery_tier` column. **Phase 2:** `delegated`, `phone_recovery` tiers, `delegated_recovery_routes` table, magic link (Flow B). **Phase 3:** `federated` tier.

Recovery (how a user regains access when locked out) is a **first-class platform workflow**, not a generic better-auth email reset. Different users have different recovery options based on their identity assurance tier. The tier is stored on `users.recovery_tier` and governs which recovery paths are available.

### Tier definitions

| Tier | Who | Login | Primary Recovery | Explicitly Disabled |
|------|-----|-------|-----------------|---------------------|
| `standard` | Staff with own verified email | Username+pwd | Self-serve email reset via `users.email` | — |
| `delegated` | Staff without email, org has verified admin mailbox | Username+pwd | Admin-initiated reset, delegated email route, magic link | Self-serve email reset |
| `phone_recovery` | Staff with verified unique phone | Username+pwd, Phone OTP | Phone OTP reset, admin reset | Self-serve email reset |
| `admin_only` | Staff without email, phone, or reliable mail route | Username+pwd | Admin direct password set, in-person | Email reset, magic link |
| `federated` | Staff bound to external IdP | SSO | IdP-managed | Local reset (unless break-glass) |

### Recovery routing

The platform intercepts better-auth's `sendResetPassword` callback and routes based on `users.recovery_tier`. For `standard` tier, the reset email goes to `users.email`. For `delegated` tier, it goes through `delegated_recovery_routes`. For `phone_recovery`, `admin_only`, and `federated` tiers, the email is suppressed — recovery uses a different channel.

`revokeSessionsOnPasswordReset` MUST be set to `true` (it is off by default in better-auth). Without this, old sessions survive password resets — a critical security gap.

### Delegated recovery routes

The `delegated_recovery_routes` table maps delegated-tier users to a base admin mailbox:

| Column | Purpose |
|--------|---------|
| `iq_tenant_id` | Tenant context |
| `user_id` | Target user (FK to `users`) |
| `base_email_id` | FK to the admin/org base mailbox record |
| `address` | Full sub-addressed email (e.g., `it.admin+emp042@hospital.com`) |
| `verified` | Whether deliverability has been tested |
| `last_delivery_check` | Timestamp of last probe |

The `+N` suffix must use a stable identifier (employee_id, staff code) — never CSV row index. Deliverability is tested at tenant onboarding: a probe email to `base+hims-test@domain` must succeed before delegated routes are enabled.

### Admin recovery workflows

Three concrete flows, all gated by Cerbos authorization and admin step-up authentication:

- **Flow A — Admin direct password set:** Admin sets temp password via `auth.api.setUserPassword()`, revokes sessions via `auth.api.revokeUserSessions()`, sets `users.must_change_password = true`. Hands temp password to user in person.
- **Flow B — Admin-generated magic link:** Admin triggers `auth.api.signInMagicLink` with `metadata: { adminGenerated: true }`. The `sendMagicLink` callback intercepts the URL (does not email it). Admin delivers via QR code, WhatsApp, SMS, or printed slip.
- **Flow C — Delegated email route:** User clicks "Forgot Password" → platform routes reset through `delegated_recovery_routes` → admin receives email, delivers reset link to user.

See design spec §3.3–§3.5 for full implementation details including code patterns.

---

## 16. BFF Token Handler interaction

> **Phase 1 — MVP**

The BFF's role expands from "signature verification only" ([ADR-0015](../../adr/0015-bff-role-zero-trust.md)) to "signature verification + session lifecycle management" via the Token Handler pattern.

### How it works

1. User authenticates (username + password, or federated IdP redirect)
2. BFF receives auth response, stores the **refresh token** in an HttpOnly, SameSite=Strict, Secure cookie
3. BFF issues a **short-lived JWT** (1-2 min) to the SPA
4. SPA attaches JWT to API requests as a Bearer token
5. When JWT expires, SPA calls BFF refresh endpoint
6. BFF uses stored refresh token to obtain new JWT from better-auth
7. SPA receives new JWT — seamless, no re-authentication

### What this solves

- **JWT revocation gap:** Token lifetime is 1-2 minutes. Maximum exposure after revocation = token lifetime. No distributed blocklist needed.
- **Long clinical sessions:** Refresh is seamless. A doctor can work for 12 hours without interruption.
- **XSS token theft:** Refresh token is in HttpOnly cookie — JavaScript cannot read it.

### What stays the same

Zero-trust per-module verification is preserved. Modules verify JWTs independently against JWKS. The BFF being stateful (cookie store) does not affect downstream modules — they see a standard JWT.

### Immediate revocation path

1. Admin suspends user → `users.status = 'suspended'`
2. Admin invalidates sessions → `auth.api.revokeUserSessions({ body: { userId } })`
3. BFF's next refresh attempt fails (no valid session) → user forced to re-login → blocked by suspended status
4. Maximum exposure: 1-2 minutes (current JWT lifetime)

---

## 17. JWKS key management

> **Phase 1 — MVP** (KMS integration path is future)

JWKS key management is handled by better-auth's JWT plugin with DB-persisted keys. This is a definitive architectural decision, not deferred to implementation.

### `jwks` table

| Column | Type | Purpose |
|--------|------|---------|
| `id` / `kid` | TEXT | Key identifier, included in JWT header for key selection |
| `alg` | TEXT | Algorithm (EdDSA default; ES256, RS256, PS256 supported) |
| `publicKey` | TEXT | PEM-encoded public key — served via JWKS endpoint |
| `privateKey` | TEXT | PEM-encoded private key — encrypted at rest with AES-256-GCM by default |
| `createdAt` | TIMESTAMPTZ | Key creation timestamp |
| `expiresAt` | TIMESTAMPTZ | Expiration — after this, key is not used for signing |

### Key rotation

Key rotation is **disabled by default**. The platform MUST explicitly configure:

- `rotationInterval`: How often a new key is generated (production value likely 7-14 days)
- `gracePeriod`: How long old keys remain valid for verification after rotation (likely 2× rotation interval)

During grace period, both old and new keys appear in the JWKS response. Modules verify JWTs by matching the `kid` header to the correct key. After grace period, old keys are removed from JWKS.

### JWKS endpoint

Published at `/.well-known/jwks.json`. Modules cache the JWKS with a TTL aligned to the rotation schedule.

### Pod-restart safety

Keys are in the database, not in memory. Pod restarts, rolling deployments, and horizontal scaling all work — every instance reads the same keys from the DB.

### KMS integration path

The JWT plugin supports a custom `sign` function for delegating signing to external KMS (Azure Key Vault, AWS KMS). Future enhancement, not MVP.

---

## 18. Phone number auth

> **Phase 2 — Post-launch**

Phone number auth is supplementary, not primary. A user can have both username+password and phone OTP as login methods, resolving to the same credential account.

### Phone-only registration flow

1. OTP sent to phone → user verifies
2. `signUpOnVerification.getTempEmail` returns `{username}@auth.internal` — username is assigned before the callback fires
3. Platform creates `users` record
4. **Critical:** `setPassword` must be called separately — `signUpOnVerification` creates the user record but NOT the credential account (password hash). Without this, `signIn.username` will fail.
5. User can now log in via username+password or phone+OTP

### Shared phone guard

In rural India, family members often share a phone. Phone-based login becomes ambiguous if two users share a number.

**Rule:** Phone can be used for auth only when:
- Phone is verified via OTP
- Phone is unique among auth-enabled users in the same identity scope
- `users.phone_auth_enabled = true` (platform-controlled flag)

If a phone is shared, it is stored as contact data only — not enabled for login or OTP recovery.
