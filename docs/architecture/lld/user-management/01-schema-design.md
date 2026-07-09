# User Management — Schema Design

**Module:** User Management  
**Schema name:** `user_management`  
**Related HLD:** [04-authn-authz-flow.md](../../hld/04-authn-authz-flow.md)  
**Related ADRs:** [ADR-0003](../../adr/0003-authn-better-auth-identity-adapter.md), [ADR-0004](../../adr/0004-authz-cerbos-sidecar.md), [ADR-0005](../../adr/0005-policy-as-code-permission-data-as-config.md), [ADR-0031](../../adr/0031-um-role-template-snapshot-semantics.md) (role-template snapshot semantics, PR #56 — **superseded for `user_capabilities`/read-path by ADR-0037 below**), [ADR-0037](../../adr/0037-user-capability-live-join-grant-deny-overrides.md) (live-JOIN base + grant/deny overrides, Phase 1.5 / issue #60)

> **Superseded 2026-07-09 (issue #60, Phase 1.5):** every description of `user_capabilities` below as a **snapshot** populated by copy-on-apply (`grant_source`, `source_role_id`, re-apply sync, detach-revoke) describes the Phase 1 (PR #56 / ADR-0031) shape only. As of [ADR-0037](../../adr/0037-user-capability-live-join-grant-deny-overrides.md), `user_capabilities` is an **override-only** table (`effect: grant|deny`, `reason`, no `source_role_id`); role composition is resolved live from `user_roles ⨝ role_capabilities` on every request, not copied. The sections below are left as written for historical trace of the Phase 1 design — read `user_capabilities`/snapshot language as superseded, not current.

## Canonical model
User Management uses a single authorization vocabulary:

- **Capability**: atomic machine-readable grant key such as `um:user:create`
- **Role**: flat, tenant-scoped **template** container of capabilities (`role_capabilities`)
- **Role template application**: `user_roles` association plus **materialized snapshot** rows in `user_capabilities` (see [ADR-0031](../../adr/0031-um-role-template-snapshot-semantics.md))
- **Role assignment** (target-state): scoped binding in `role_assignments` — not exposed in Phase 1A admin API
- **Delegation**: direct capability grant outside the base role composition
- **Clearance**: ABAC attribute evaluated by Cerbos
- **Principal enrichment**: runtime resolution of capabilities, delegations, clearances, tenant, department, and org context

`permission` is not a storage or runtime primitive in this module. If the word appears in UI copy, it is presentation-only.

## Data layers
Authorization is split across three layers:

1. **AuthN data** lives in better-auth managed tables.
2. **AuthZ policies** live in Cerbos YAML under `infra/cerbos/policies`.
3. **AuthZ data** lives in User Management tables and is admin-managed.

The database owns roles, capabilities, assignments, delegations, and clearances. Cerbos owns evaluation logic. JWTs carry lightweight identity context only.

## Phase 1A implemented tables (PR #56)

These tables are implemented in `modules/user-management` and drive Phase 1A admin HTTP. Runtime authorization **snapshots** live in `user_capabilities`; `role_capabilities` is template source only.

### `user_roles`

Records which role templates are applied to a user (`POST/DELETE /users/{id}/roles`). Admin/reporting convenience; not the sole runtime grant source.

### `user_capabilities`

**Authoritative runtime snapshot** per user. One row per `(iq_tenant_id, user_id, capability_id)` with soft-revoke lifecycle.

| `grant_source` | Meaning |
|----------------|---------|
| `manual` | Direct grant via `PUT /users/{id}/capabilities` |
| `role_template` | Copied on apply/re-apply; `source_role_id` = role template id |
| `delegated` | Delegation overlay |
| `system` | Platform seed / break-glass |

**Write semantics (ADR-0031):** apply copies (optional subset); re-apply synchronizes scoped snapshot; detach soft-revokes matching `role_template` rows; editing `role_capabilities` does **not** auto-update existing users.

## Target-state tables (LLD / future phases)

The following describe the full User Management schema target. Some tables are not yet implemented or not yet exposed on admin HTTP.

### `users`
Tenant-scoped platform user profile and lightweight identity linkage.

Key fields:
- `id`
- `iq_tenant_id`
- `auth_user_id`
- `full_name`
- `email`
- `phone`
- `username`
- `org_id`
- `department`
- `status`
- `clearance_tier_required`

### `roles`
Tenant-scoped flat role definitions.

Key fields:
- `id`
- `iq_tenant_id`
- `code`
- `display_name`
- `description`
- `is_system`
- `status`

### `capabilities`
Tenant-scoped capability catalog. Every table keeps `iq_tenant_id` for Citus alignment, so canonical platform capabilities are seeded consistently per tenant rather than stored as a separate global table.

Key fields:
- `iq_tenant_id`
- `capability`
- `module`
- `feature`
- `action`
- `display_name`
- `description`
- `is_active`

### `role_capabilities`
Role composition table.

Key fields:
- `iq_tenant_id`
- `role_id`
- `capability`

Each row means "this role includes this capability".

### `role_assignments`
Target-state scoped bindings of users to roles (ward/department scope). **Phase 1A uses `user_roles` instead**; there is no `POST /role-assignments` admin route. See [ADR-0031](../../adr/0031-um-role-template-snapshot-semantics.md).

### `delegated_capability_grants`
Direct delegated capability grants.

Key fields:
- `iq_tenant_id`
- `delegatee_user_id`
- `capability`
- `active`

### `user_clearances`
Clearance map consumed as principal attributes.

Key fields:
- `iq_tenant_id`
- `user_id`
- `clearance_key`
- `access_level`

## Runtime contract

> **ADR-0031:** Persisted grants in `user_capabilities` are the write-path source of truth. Until issue #60, `listEffectiveCapabilityKeys` may also union live `user_roles ⨝ role_capabilities` — document as temporary hybrid, not the long-term model.
>
> **Superseded 2026-07-09:** issue #60 landed as [ADR-0037](../../adr/0037-user-capability-live-join-grant-deny-overrides.md). The live `user_roles ⨝ role_capabilities` join is now the permanent base layer (not a temporary union), with `user_capabilities` narrowed to grant/deny overrides evaluated on top of it. The 7-step resolution list above should be read as: (1) verify JWT, (2) resolve role codes, (3) resolve live role-derived capabilities via the join, (4) apply `user_capabilities` grant/deny overrides, (5) resolve delegated capabilities, (6) resolve clearances, (7) build Cerbos principal — step 4 above ("temporary, pre-#60 union") no longer exists as a separate temporary step.

JWTs remain lightweight and contain only identity and coarse context:

- `sub`
- `iq_tenant_id`
- `roles`
- `department`
- `org_id`
- session metadata such as `jti`, `iat`, `exp`, `iss`

JWTs do **not** contain:

- capabilities
- delegated capabilities
- clearances

Those are resolved at request time by principal enrichment:

1. verify JWT
2. resolve assigned role codes (from `user_roles` / projection)
3. resolve **active** capability keys from `user_capabilities` (`revoked_at IS NULL`)
4. *(temporary, pre-#60)* union live template capabilities from `user_roles ⨝ role_capabilities`
5. resolve delegated capabilities
6. resolve clearances and effective clearance tier
7. build Cerbos principal

Cerbos receives only UM-resolved attributes. Master Data and Configurator are consulted at **grant write** time (assignable filtering), not during PDP evaluation.

Cerbos consumes:

```json
{
  "id": "user-id",
  "roles": ["tenant-role-code"],
  "attr": {
    "iq_tenant_id": "tenant-id",
    "department": "cardiology",
    "org_id": "org-id",
    "capabilities": ["um:user:create", "um:user:read"],
    "delegated_capabilities": ["um:role:assign"],
    "clearances": { "psychiatric": "view" },
    "um_clearance_effective_tier": 1
  }
}
```

## Design rules
- Roles never inherit from other roles.
- Capabilities are the only canonical grant primitive.
- Policies must check capabilities and ABAC attributes, not role names.
- Tenant isolation must be explicit on every protected resource.
- Frontend authorization is UX only. Backend Cerbos decisions remain authoritative.

## Operational implications
- Tenant customization is a data change: update `role_capabilities`, not Cerbos YAML.
- Role administration uses `/roles`, `/roles/{id}`, and `/roles/{id}/capabilities`.
- Capability catalog is read-only from the admin surface; it drives role composition.
- List filtering should prefer Cerbos `PlanResources` over row-by-row checks.

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
| `capabilities` | `created_by`, `updated_by` | Synced from Master Data `module_permissions`, not by users |
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
