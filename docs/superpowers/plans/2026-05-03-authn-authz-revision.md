# AuthN/AuthZ Architecture Revision — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update all architecture documents (LLD, HLD, ADRs, dev-doubts) to incorporate the AuthN/AuthZ revision decisions documented in the design spec.

**Architecture:** This is a documentation-only plan. No application code is written. The deliverables are updated Markdown files, a JSON schema reference, and an ERD. All changes flow from the approved spec at `docs/superpowers/specs/2026-05-03-authn-authz-revision-design.md`.

**Tech Stack:** Markdown, JSON (schema-reference), dineug/erd-editor v3 (ERD JSON format)

**Important context for implementers:**
- The design spec (§17) lists every change needed. This plan provides the exact content and edit locations.
- All `ba_users.email` values are synthetic: `{username}@auth.internal`. Real emails live on `users.email` only.
- `ba_users` is better-auth managed — platform code reads but never writes these tables directly.
- Session revocation uses `auth.api.revokeUserSessions()`, NEVER direct SQL against `ba_sessions`.
- JWT lifetime changes from 15 min to 1-2 min (Token Handler pattern). `jti` claim added.
- Recovery is a first-class platform workflow with 5 tiers (`standard`, `delegated`, `phone_recovery`, `admin_only`, `federated`).
- Three new platform-owned tables: `jwks` (better-auth managed), `delegated_recovery_routes`, `auth_identity_links`.
- Scenarios use SQL-style pseudocode (not literal queries) with abbreviated column lists.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `docs/architecture/lld/user-management/01-schema-design.md` | Modify | Update §8, §9, §13, §14. Add §9.1, §15, §16, §17, §18. |
| `docs/architecture/lld/user-management/schema-reference.json` | Modify | Add `username` to `ba_users`. Add `recovery_tier`, `phone_auth_enabled`, `must_change_password` to `users`. Add `jwks`, `delegated_recovery_routes`, `auth_identity_links` entities. Add relationships. |
| `docs/architecture/lld/user-management/user-management.erd.json` | Modify | Add entities/columns in ERD editor matching schema-reference changes. |
| `docs/architecture/lld/user-management/02-scenarios.md` | Modify | Update §1, §2, §3, §13. Add §16–§32. Update summary table. |
| `docs/architecture/hld/04-authn-authz-flow.md` | Modify | Update §1.2, §1.5, §1.6, §2, §7. Close §11 open questions. Add §13 (OAuth 2.1 Provider), §14 (recovery tier summary). |
| `docs/architecture/adr/0003-authn-better-auth-identity-adapter.md` | Modify | Update decision outcome, federation section, OIDC→OAuth 2.1, follow-ups. |
| `docs/architecture/adr/0015-bff-role-zero-trust.md` | Modify | Update decision outcome for Token Handler, add consequences. |
| `docs/architecture/lld/user-management/dev-doubts/03-analysis.md` | Create | Six analysis sections covering key design decisions. |

---

### Task 1: LLD schema-design — Update §8 JWT claims and §9 better-auth tables

**Files:**
- Modify: `docs/architecture/lld/user-management/01-schema-design.md:185-208`

- [ ] **Step 1: Update §8 JWT claims table**

In `01-schema-design.md`, replace the JWT claims table (lines 185-197) with:

```markdown
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
```

- [ ] **Step 2: Update §9 better-auth managed tables**

Replace §9 (lines 200-208) with:

```markdown
## 9. better-auth managed tables

better-auth manages its own tables for credential storage, session tracking, OAuth account linking, and JWKS key management. These tables live in the `user_management` schema but are **not directly modified by platform code** — they are managed by the better-auth library through its adapter interface. Session revocation, password resets, and user management operations MUST use `auth.api.*` methods, never direct SQL.

The link between better-auth and platform data is `users.auth_user_id` → `ba_users.id`. This is a logical reference, not a database foreign key, because better-auth's schema is managed by the library and may change across versions.

Table names are prefixed with `ba_` to distinguish them from platform-owned tables.

**Username as primary login credential:** The username plugin adds `ba_users.username` (TEXT, NOT NULL, UNIQUE) as the primary login field. Users authenticate with username + password — email is never shown on the login form and is never used for authentication.

**`jwks` table:** The JWT plugin manages a `jwks` table for JWKS key storage. Keys are DB-persisted (surviving pod restarts), with private keys encrypted at rest using AES-256-GCM by default. Key rotation must be explicitly configured — see §17 for details.
```

- [ ] **Step 3: Validate cross-references**

Verify:
- §8 references §16 (BFF Token Handler) — will exist after Task 3
- §8 references §9.1 (synthetic email) — will exist after Task 2
- §8 references §7 (PEP enrichment) — already exists
- §9 references §17 (JWKS) — will exist after Task 3

---

### Task 2: LLD schema-design — Add §9.1 synthetic email pattern and §15 recovery tier model

**Files:**
- Modify: `docs/architecture/lld/user-management/01-schema-design.md` (insert after §9, before §10)

- [ ] **Step 1: Add §9.1 after the existing §9**

Insert immediately after §9:

```markdown
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
```

- [ ] **Step 2: Add §15 recovery tier model**

Insert after §14 (before the current end of the file), as a new section:

```markdown
## 15. Recovery tier model

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
```

- [ ] **Step 3: Validate**

Verify:
- §15 references `users.recovery_tier` — will be added in Task 5 (schema-reference)
- §15 references `delegated_recovery_routes` — will be added in Task 5
- §15 references design spec §3.3–§3.5 — exists in spec

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/lld/user-management/01-schema-design.md
git commit -m "docs(lld): update JWT claims, ba_users, add synthetic email pattern and recovery tier model"
```

---

### Task 3: LLD schema-design — Add §16 BFF Token Handler, §17 JWKS, §18 phone auth

**Files:**
- Modify: `docs/architecture/lld/user-management/01-schema-design.md` (insert after §15)

- [ ] **Step 1: Add §16 BFF Token Handler interaction**

```markdown
## 16. BFF Token Handler interaction

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
```

- [ ] **Step 2: Add §17 JWKS key management**

```markdown
## 17. JWKS key management

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
```

- [ ] **Step 3: Add §18 phone number auth**

```markdown
## 18. Phone number auth

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
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/lld/user-management/01-schema-design.md
git commit -m "docs(lld): add BFF Token Handler, JWKS key management, and phone auth sections"
```

---

### Task 4: LLD schema-design — Update §13 Citus distribution and §14 HLD updates

**Files:**
- Modify: `docs/architecture/lld/user-management/01-schema-design.md:258-295`

- [ ] **Step 1: Add new tables to §13 Citus distribution table**

In the distribution table in §13, add these rows after the `ba_accounts` row:

```markdown
| `jwks` | **Local table** (single coordinator node) | better-auth managed; few rows, queried for token signing/verification only |
| `delegated_recovery_routes` | Distributed by `iq_tenant_id` | Co-located with `users`; queried during password reset |
| `auth_identity_links` | Distributed by `iq_tenant_id` | Co-located with `users`; queried during SSO callback |
```

- [ ] **Step 2: Add new tables to §12 audit column exceptions**

Add these rows to the audit column exceptions table in §12:

```markdown
| `delegated_recovery_routes` | `created_by`, `updated_by` | Operational table — changes are logged in `permission_change_audit` instead |
| `auth_identity_links` | `updated_at`, `updated_by` | Create/delete pattern — links are created and revoked, not edited. Uses `linked_by`/`linked_at` as semantic `created_by`/`created_at`. |
| `jwks` | all four | better-auth managed (JWT plugin). Uses `createdAt` in library convention. |
```

- [ ] **Step 3: Update §14 HLD updates checklist**

Replace the existing §14 with (preserving original items + adding new ones):

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/lld/user-management/01-schema-design.md
git commit -m "docs(lld): update Citus distribution, audit exceptions for new tables, expand HLD update checklist"
```

---

### Task 5: schema-reference.json — Add new columns and entities

**Files:**
- Modify: `docs/architecture/lld/user-management/schema-reference.json`

- [ ] **Step 1: Add `username` column to `ba_users` entity**

In the `ba_users.columns` object, add `username` as the first column entry:

```json
"username": {
  "type": "TEXT",
  "nullable": false,
  "description": "Org-assigned login credential. Primary login method (via username plugin)."
}
```

Update `ba_users.description` to:

```json
"description": "better-auth managed — user credentials and profile. NOT directly modified by platform code. Username is the primary login credential; email is a synthetic identity anchor ({username}@auth.internal)."
```

Add a unique index:

```json
{
  "columns": ["username"],
  "name": "idx_ba_users_username",
  "unique": true
}
```

Update `email` column description:

```json
"email": {
  "type": "TEXT",
  "nullable": false,
  "description": "Synthetic identity anchor: {username}@auth.internal. Non-routable. Never used for login, email sending, or business logic."
}
```

- [ ] **Step 2: Add new columns to `users` entity**

In the `users.columns` object, add after the `status` column:

```json
"recovery_tier": {
  "type": "TEXT",
  "nullable": false,
  "default": "admin_only",
  "check": "recovery_tier IN ('standard', 'delegated', 'phone_recovery', 'admin_only', 'federated')",
  "description": "Governs which recovery paths are available when user is locked out. See 01-schema-design.md §15."
},
"phone_auth_enabled": {
  "type": "BOOLEAN",
  "nullable": false,
  "default": false,
  "description": "Whether this user's phone number can be used for OTP-based login and recovery. False if phone is shared."
},
"must_change_password": {
  "type": "BOOLEAN",
  "nullable": false,
  "default": false,
  "description": "When true, user must change password before accessing clinical modules. Set by admin recovery Flow A."
}
```

- [ ] **Step 3: Add `jwks` entity**

Add a new entity to the `entities` object:

```json
"jwks": {
  "description": "better-auth managed (JWT plugin) — JWKS key storage. Private keys encrypted at rest with AES-256-GCM by default.",
  "distribution": "local",
  "managed_by": "better-auth",
  "columns": {
    "id": {
      "type": "TEXT",
      "nullable": false,
      "description": "Key identifier (kid), included in JWT header for key selection"
    },
    "publicKey": {
      "type": "TEXT",
      "nullable": false,
      "description": "PEM-encoded public key — served via JWKS endpoint"
    },
    "privateKey": {
      "type": "TEXT",
      "nullable": false,
      "description": "PEM-encoded private key — encrypted at rest with AES-256-GCM by default. DO NOT disable encryption."
    },
    "createdAt": {
      "type": "TIMESTAMPTZ",
      "nullable": false
    },
    "expiresAt": {
      "type": "TIMESTAMPTZ",
      "nullable": true,
      "description": "After this timestamp, key is not used for signing. Null if rotation is not configured."
    }
  },
  "primary_key": ["id"],
  "note": "Local table (not distributed). Few rows. Queried for token signing and JWKS endpoint serving."
}
```

- [ ] **Step 4: Add `delegated_recovery_routes` entity**

```json
"delegated_recovery_routes": {
  "description": "Maps delegated-tier users to sub-addressed admin mailbox recovery routes. Platform-owned.",
  "distribution": "distributed",
  "columns": {
    "iq_tenant_id": {
      "type": "UUID",
      "nullable": false,
      "description": "Citus distribution key"
    },
    "id": {
      "type": "UUID",
      "nullable": false,
      "default": "gen_random_uuid()"
    },
    "user_id": {
      "type": "UUID",
      "nullable": false,
      "description": "Target user (FK to users.id)"
    },
    "base_email_id": {
      "type": "UUID",
      "nullable": false,
      "description": "FK to the admin/org base mailbox record"
    },
    "address": {
      "type": "TEXT",
      "nullable": false,
      "description": "Full sub-addressed email (e.g., it.admin+emp042@hospital.com)"
    },
    "verified": {
      "type": "BOOLEAN",
      "nullable": false,
      "default": false,
      "description": "Whether deliverability has been tested"
    },
    "last_delivery_check": {
      "type": "TIMESTAMPTZ",
      "nullable": true,
      "description": "Timestamp of last deliverability probe"
    },
    "created_at": {
      "type": "TIMESTAMPTZ",
      "nullable": false,
      "default": "now()"
    },
    "updated_at": {
      "type": "TIMESTAMPTZ",
      "nullable": false,
      "default": "now()"
    }
  },
  "primary_key": ["iq_tenant_id", "id"],
  "foreign_keys": [
    {
      "columns": ["iq_tenant_id", "user_id"],
      "references": {
        "table": "users",
        "columns": ["iq_tenant_id", "id"]
      }
    }
  ],
  "indexes": [
    {
      "columns": ["iq_tenant_id", "user_id"],
      "name": "idx_recovery_routes_user",
      "unique": true,
      "note": "One recovery route per user per tenant"
    }
  ]
}
```

- [ ] **Step 5: Add `auth_identity_links` entity**

```json
"auth_identity_links": {
  "description": "Explicit IdP-subject to platform-user mapping for federation account linking. Platform-owned.",
  "distribution": "distributed",
  "columns": {
    "iq_tenant_id": {
      "type": "UUID",
      "nullable": false,
      "description": "Citus distribution key"
    },
    "id": {
      "type": "UUID",
      "nullable": false,
      "default": "gen_random_uuid()"
    },
    "user_id": {
      "type": "UUID",
      "nullable": false,
      "description": "Platform user (FK to users.id)"
    },
    "auth_user_id": {
      "type": "UUID",
      "nullable": false,
      "description": "better-auth user (logical FK to ba_users.id)"
    },
    "provider_id": {
      "type": "TEXT",
      "nullable": false,
      "description": "IdP identifier (e.g., 'entra_id', 'hospital_keycloak_realm_x')"
    },
    "issuer": {
      "type": "TEXT",
      "nullable": false,
      "description": "OIDC issuer URL of the external IdP"
    },
    "subject": {
      "type": "TEXT",
      "nullable": false,
      "description": "External IdP subject identifier (sub claim)"
    },
    "claim_snapshot": {
      "type": "JSONB",
      "nullable": true,
      "description": "Last-seen claims from the IdP token (name, email, groups). Updated on each login."
    },
    "linked_by": {
      "type": "UUID",
      "nullable": false,
      "description": "Admin who created the link (FK to users.id)"
    },
    "linked_at": {
      "type": "TIMESTAMPTZ",
      "nullable": false,
      "default": "now()"
    }
  },
  "primary_key": ["iq_tenant_id", "id"],
  "foreign_keys": [
    {
      "columns": ["iq_tenant_id", "user_id"],
      "references": {
        "table": "users",
        "columns": ["iq_tenant_id", "id"]
      }
    }
  ],
  "indexes": [
    {
      "columns": ["iq_tenant_id", "provider_id", "subject"],
      "name": "idx_identity_links_provider_subject",
      "unique": true,
      "note": "One link per IdP subject per tenant — prevents duplicate linking"
    },
    {
      "columns": ["iq_tenant_id", "user_id"],
      "name": "idx_identity_links_user",
      "note": "Find all IdP links for a user"
    }
  ]
}
```

- [ ] **Step 6: Add new relationships**

Add to the `relationships` array:

```json
{
  "name": "recovery_route_user",
  "from": {
    "table": "delegated_recovery_routes",
    "columns": ["iq_tenant_id", "user_id"]
  },
  "to": {
    "table": "users",
    "columns": ["iq_tenant_id", "id"]
  },
  "type": "many-to-one"
},
{
  "name": "identity_link_user",
  "from": {
    "table": "auth_identity_links",
    "columns": ["iq_tenant_id", "user_id"]
  },
  "to": {
    "table": "users",
    "columns": ["iq_tenant_id", "id"]
  },
  "type": "many-to-one"
}
```

- [ ] **Step 7: Validate and commit**

Verify:
- Entity count is now 18 (was 15 + 3 new: `jwks`, `delegated_recovery_routes`, `auth_identity_links`)
- All column types, nullability, and descriptions match spec §2, §3, §6, §9
- Relationship references use correct table/column names
- `ba_users` now has `username` column

```bash
# Validate JSON is well-formed
python3 -c "import json; json.load(open('docs/architecture/lld/user-management/schema-reference.json'))"
git add docs/architecture/lld/user-management/schema-reference.json
git commit -m "docs(lld): add username to ba_users, recovery_tier/phone_auth to users, add jwks/recovery_routes/identity_links entities"
```

---

### Task 6: ERD — Add new entities and columns

**Files:**
- Modify: `docs/architecture/lld/user-management/user-management.erd.json`

**Note:** The ERD JSON uses dineug/erd-editor v3 format with UUIDs for every entity, column, and relationship. Editing this JSON by hand is error-prone. Use the ERD editor VS Code extension to make changes visually.

- [ ] **Step 1: Open ERD in VS Code**

Open `docs/architecture/lld/user-management/user-management.erd.json` in VS Code with the ERD Editor extension.

- [ ] **Step 2: Add `username` column to `ba_users` entity**

In the `ba_users` entity (blue color = better-auth managed):
- Add column: `username` — TEXT, NOT NULL, marked unique
- Update the comment on `email` column to: "Synthetic: {username}@auth.internal"

- [ ] **Step 3: Add `jwks` entity**

Create new entity `jwks` (blue color = better-auth managed):
- `id` — TEXT, PK
- `publicKey` — TEXT, NOT NULL
- `privateKey` — TEXT, NOT NULL
- `createdAt` — TIMESTAMPTZ, NOT NULL
- `expiresAt` — TIMESTAMPTZ, NULLABLE

Comment: `"better-auth managed (JWT plugin). Local table. AES-256-GCM encrypted private keys."`

- [ ] **Step 4: Add `delegated_recovery_routes` entity**

Create new entity `delegated_recovery_routes` (green color = distributed):
- `iq_tenant_id` — UUID, PK, NOT NULL
- `id` — UUID, PK, NOT NULL
- `user_id` — UUID, NOT NULL, FK to `users`
- `base_email_id` — UUID, NOT NULL
- `address` — TEXT, NOT NULL
- `verified` — BOOLEAN, NOT NULL
- `last_delivery_check` — TIMESTAMPTZ, NULLABLE
- `created_at` — TIMESTAMPTZ, NOT NULL
- `updated_at` — TIMESTAMPTZ, NOT NULL

Comment: `"Citus: DISTRIBUTED by iq_tenant_id. Maps delegated-tier users to admin mailbox recovery routes."`

Add relationship: `delegated_recovery_routes.user_id` → `users.id` (many-to-one)

- [ ] **Step 5: Add `auth_identity_links` entity**

Create new entity `auth_identity_links` (green color = distributed):
- `iq_tenant_id` — UUID, PK, NOT NULL
- `id` — UUID, PK, NOT NULL
- `user_id` — UUID, NOT NULL, FK to `users`
- `auth_user_id` — UUID, NOT NULL
- `provider_id` — TEXT, NOT NULL
- `issuer` — TEXT, NOT NULL
- `subject` — TEXT, NOT NULL
- `claim_snapshot` — JSONB, NULLABLE
- `linked_by` — UUID, NOT NULL
- `linked_at` — TIMESTAMPTZ, NOT NULL

Comment: `"Citus: DISTRIBUTED by iq_tenant_id. Explicit federation account linking."`

Add relationship: `auth_identity_links.user_id` → `users.id` (many-to-one)

- [ ] **Step 6: Add new columns to `users` entity**

In the `users` entity, add:
- `recovery_tier` — TEXT, NOT NULL, DEFAULT 'admin_only'
- `phone_auth_enabled` — BOOLEAN, NOT NULL, DEFAULT false
- `must_change_password` — BOOLEAN, NOT NULL, DEFAULT false

- [ ] **Step 7: Save and commit**

```bash
git add docs/architecture/lld/user-management/user-management.erd.json
git commit -m "docs(lld): update ERD — add username, jwks, recovery_routes, identity_links, recovery columns"
```

---

### Task 7: Scenarios — Update existing §1, §2, §3, §13

**Files:**
- Modify: `docs/architecture/lld/user-management/02-scenarios.md`

- [ ] **Step 1: Update §1 Step 3 — First super-admin created**

In §1 "Tenant onboarding," replace the `ba_users` and `users` blocks in Step 3 (around line 40-48) with:

```
ba_users:
  id: 'auth-001'  name: 'Admin Patel'  username: 'patel.admin'  email: 'patel.admin@auth.internal'

users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-001'  auth_user_id: 'auth-001'  kind: 'user'
  full_name: 'Admin Patel'  email: 'patel@aiims.edu'  status: 'active'  recovery_tier: 'standard'
```

- [ ] **Step 2: Update §2 — Staff onboarding**

Replace the `ba_users` and `users` blocks in §2 (around line 92-98) with:

```
ba_users:
  id: 'auth-111'  name: 'Dr. Sharma'  username: 'sharma.cardiology'  email: 'sharma.cardiology@auth.internal'

users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-111'  auth_user_id: 'auth-111'  kind: 'user'
  full_name: 'Dr. Sharma'  email: 'sharma@example.com'  status: 'active'  recovery_tier: 'standard'
```

Update the JWT example (around line 111) to add `jti` and change `exp`:

```json
{
  "sub": "usr-111",
  "iq_tenant_id": "aiims-delhi",
  "roles": ["physician"],
  "department": "dept-cardiology",
  "org_id": null,
  "jti": "tok-abc123",
  "exp": "... (1-2 min from iat)",
  "iat": "...",
  "iss": "..."
}
```

- [ ] **Step 3: Update §3 — Multi-tenant login**

In §3, update the login description (around line 130) to reflect username-based login and Token Handler:

Replace the "What happens" section with:

```markdown
### What happens

**Step 1 — Dr. Sharma logs in with username**

Dr. Sharma enters username `sharma.cardiology` and password on the login page. better-auth authenticates via the username plugin (email is never shown or entered).

**Step 2 — Tenant picker**

User Management queries `users WHERE auth_user_id = 'auth-111' AND status = 'active'` and finds two rows:

| iq_tenant_id | id | full_name | roles (via role_assignments) |
|---|---|---|---|
| aiims-delhi | usr-111 | Dr. Sharma | physician |
| district-hosp | usr-222 | Dr. Sharma | physician, chief-resident |

The frontend presents a tenant picker showing both hospitals.

**Step 3 — Token Handler issues JWT**

Dr. Sharma selects "AIIMS Delhi". The BFF stores the refresh token in an HttpOnly cookie and issues a 1-2 minute JWT:

```json
{
  "sub": "usr-111",
  "iq_tenant_id": "aiims-delhi",
  "roles": ["physician"],
  "department": "dept-cardiology",
  "jti": "tok-def456"
}
```

When the JWT expires, the SPA silently refreshes via the BFF — no re-authentication.
```

- [ ] **Step 4: Update §13 — Security incident**

Replace §13's "What happens" section (around lines 656-680) with:

```markdown
### What happens

**Step 1 — Suspend the user**

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-666'  status: 'suspended'  updated_by: 'usr-001'
```

**Step 2 — Invalidate all sessions**

Platform calls `auth.api.revokeUserSessions({ body: { userId: 'auth-666' } })` — this revokes all active sessions for the compromised user across all tenants. Direct SQL against `ba_sessions` is never used.

Next refresh attempt at the BFF fails (no valid session). The user is forced to re-login, which is blocked by `status = 'suspended'`. Maximum exposure window: 1-2 minutes (current JWT lifetime).

**Step 3 — Audit**

```
permission_change_audit:
  entity_type: 'user_status'  action: 'updated'  changed_by: 'usr-001'
  reason: 'Credential compromise — incident INC-2026-0042'
  old_value: { status: 'active' }
  new_value: { status: 'suspended' }
```

**Step 4 — Investigate and remediate**

Security admin reviews `ba_sessions` records (via admin API, not direct SQL) for the compromised user's recent activity. After investigation, admin can either:
- Unsuspend and force password change (`users.must_change_password = true`)
- Keep suspended if the breach is severe
```

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/lld/user-management/02-scenarios.md
git commit -m "docs(lld): update scenarios §1-§3, §13 for username login, synthetic email, Token Handler, API-based revocation"
```

---

### Task 8: Scenarios — Add §16–§20 (Token Handler, key rotation, standard/delegated/admin-only recovery)

**Files:**
- Modify: `docs/architecture/lld/user-management/02-scenarios.md` (insert after §15, before the Summary)

- [ ] **Step 1: Add §16 Token Handler refresh**

Insert before the Summary section:

```markdown
## 16. Token Handler refresh — seamless refresh during long clinical session

**Scenario:** Dr. Sharma is in the middle of a 6-hour outpatient clinic. Her JWT expires every 1-2 minutes but she should never be interrupted.

### What happens

**Step 1 — JWT expires**

Dr. Sharma clicks to view a patient's lab results. The SPA detects the current JWT has expired.

**Step 2 — Silent refresh**

The SPA calls the BFF's refresh endpoint. The BFF sends the HttpOnly refresh token cookie to better-auth. better-auth validates the session (still active in `ba_sessions`), issues a new JWT.

**Step 3 — Seamless continuation**

The BFF returns the new JWT to the SPA. The SPA retries the original request with the fresh token. Dr. Sharma sees the lab results without any interruption or login prompt.

**Step 4 — If the session was revoked**

If an admin had revoked Dr. Sharma's session during those 1-2 minutes, the BFF's refresh call would fail. The SPA receives a 401, redirects to the login page. Maximum exposure after revocation: 1-2 minutes (one JWT lifetime).

### Why the schema supports this

- `ba_sessions` stores the refresh token server-side (BFF holds only an opaque cookie reference)
- `users.status` is checked at refresh time — a suspended user's refresh will fail
- Short JWT lifetime (1-2 min) means revocation without a distributed blocklist
```

- [ ] **Step 2: Add §17 Key rotation**

```markdown
## 17. Key rotation — JWKS rotation with grace period

**Scenario:** The platform's JWKS keys are rotated per the configured schedule (e.g., every 7 days).

### What happens

**Step 1 — Rotation fires**

better-auth's JWT plugin generates a new key pair. The old key's `expiresAt` is set to `now() + gracePeriod`.

```
jwks:
  id: 'key-001'  alg: 'EdDSA'  expiresAt: '2026-05-10'  (old, in grace period)
  id: 'key-002'  alg: 'EdDSA'  expiresAt: NULL            (new, active for signing)
```

**Step 2 — JWKS endpoint serves both keys**

Any module fetching `/.well-known/jwks.json` receives both keys. JWTs signed with `key-001` (still valid, not yet expired) are verified using the `kid` header.

**Step 3 — Grace period expires**

After the grace period (e.g., 14 days), `key-001` is removed from the JWKS response. Any JWT signed with `key-001` that somehow survives beyond 14 days will fail verification. Given 1-2 minute token lifetimes, this is impossible under normal operation — the grace period exists for edge cases like long-offline pods.

**Step 4 — Module cache invalidation**

Modules cache the JWKS with a TTL (e.g., 1 hour). On rotation, modules will fetch the updated JWKS within one TTL cycle. During the window between rotation and cache refresh, the old key is still in the JWKS (grace period), so no verification failures occur.

### Why the schema supports this

- `jwks` table persists keys in the DB — all pods see the same keys
- `expiresAt` tracks rotation lifecycle per key
- Private keys are AES-256-GCM encrypted at rest — database access alone does not compromise signing capability
```

- [ ] **Step 3: Add §18 Standard-tier password reset**

```markdown
## 18. Standard-tier password reset — user with own email self-serves

**Scenario:** Dr. Sharma (recovery_tier = `standard`, `users.email = 'sharma@example.com'`) forgets her password.

### What happens

**Step 1 — Dr. Sharma clicks "Forgot Password"**

On the login page, she enters her username `sharma.cardiology`.

**Step 2 — Platform routes the reset**

Platform intercepts better-auth's `sendResetPassword` callback, looks up `users WHERE auth_user_id = 'auth-111'`, finds `recovery_tier = 'standard'` and `email = 'sharma@example.com'`. Sends the reset email to `sharma@example.com`.

**Step 3 — Password reset**

Dr. Sharma clicks the reset link in her email, sets a new password. `revokeSessionsOnPasswordReset: true` means all existing sessions are invalidated. She logs in with the new password.

### Why the schema supports this

- `users.recovery_tier = 'standard'` tells the routing logic to use self-serve email reset
- `users.email` holds the real email (not the synthetic `ba_users.email`)
- `ba_users.email` (`sharma.cardiology@auth.internal`) is never shown and never emailed
```

- [ ] **Step 4: Add §19 Delegated-tier password reset**

```markdown
## 19. Delegated-tier password reset — admin-initiated, delegated email route

**Scenario:** Nurse Patel (recovery_tier = `delegated`, no personal email) is locked out.

### What happens

**Step 1 — Setup: Nurse Patel was onboarded with delegated recovery**

```
ba_users:
  id: 'auth-666'  username: 'patel.nurse'  email: 'patel.nurse@auth.internal'

users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-666'  auth_user_id: 'auth-666'
  email: NULL  recovery_tier: 'delegated'  phone_auth_enabled: false

delegated_recovery_routes:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-666'
  address: 'it.admin+emp042@aiims.edu'  verified: true
```

**Step 2 — Nurse Patel clicks "Forgot Password"**

She enters username `patel.nurse`. The platform looks up `recovery_tier = 'delegated'`.

**Step 3 — UI shows delegated message**

The UI shows: "Your account uses delegated recovery. A reset link has been sent to your organization's administrator."

**Step 4 — Platform routes reset**

`sendResetPassword` callback finds the `delegated_recovery_routes` entry, sends the reset link to `it.admin+emp042@aiims.edu`. Also notifies the admin via the admin dashboard.

**Step 5 — Admin delivers the link**

The IT admin receives the email, walks to the ward, and gives Nurse Patel the reset link (or scans a QR code).

**Step 6 — Nurse Patel resets password**

She clicks the link, sets a new password, and logs in.

### Why the schema supports this

- `delegated_recovery_routes.address` holds the sub-addressed admin email for routing
- `delegated_recovery_routes.verified = true` means deliverability was tested at setup
- The real email route is platform-owned — `ba_users.email` is synthetic and uninvolved
```

- [ ] **Step 5: Add §20 Admin-only tier recovery**

```markdown
## 20. Admin-only tier recovery — direct password set, in-person handoff

**Scenario:** Ward attendant Raju (recovery_tier = `admin_only`, no email, no phone for auth) is locked out.

### What happens

**Step 1 — Raju approaches the IT admin in person**

There is no self-serve path. The IT admin verifies Raju's identity (badge, known face).

**Step 2 — Admin resets password**

Admin opens User Management → finds Raju → clicks "Reset Password":

1. Cerbos authorizes `admin:user:reset_password`
2. Admin re-authenticates (step-up verification)
3. Platform calls `auth.api.setUserPassword({ body: { userId: 'auth-raju', newPassword: 'Temp@1234' } })`
4. Platform calls `auth.api.revokeUserSessions({ body: { userId: 'auth-raju' } })`
5. Platform sets `users.must_change_password = true`

```
permission_change_audit:
  entity_type: 'user_password'  action: 'admin_reset'  changed_by: 'usr-001'
  target_user_id: 'usr-raju'  reason: 'User locked out, in-person verification'
```

**Step 3 — Admin tells Raju the temp password**

In person, phone call, or printed slip — never emailed.

**Step 4 — Raju logs in**

Raju enters username and temp password. `must_change_password = true` forces a password change screen before any clinical access is granted.

### Why the schema supports this

- `users.recovery_tier = 'admin_only'` means the `sendResetPassword` callback is suppressed
- `users.must_change_password` enforces password rotation after admin set
- `permission_change_audit` records who reset whose password, when, and why
```

- [ ] **Step 6: Commit**

```bash
git add docs/architecture/lld/user-management/02-scenarios.md
git commit -m "docs(lld): add scenarios §16-§20 — Token Handler, key rotation, standard/delegated/admin-only recovery"
```

---

### Task 9: Scenarios — Add §21–§25 (magic link, phone, federation)

**Files:**
- Modify: `docs/architecture/lld/user-management/02-scenarios.md`

- [ ] **Step 1: Add §21 Magic link recovery**

```markdown
## 21. Magic link recovery — admin generates link, delivers via QR/SMS

**Scenario:** Lab technician Anand (recovery_tier = `delegated`) needs password recovery, but the admin mailbox is temporarily down.

### What happens

**Step 1 — Admin chooses magic link**

Admin opens User Management → finds Anand → clicks "Generate Login Link" (Flow B):

1. Cerbos authorizes `admin:user:generate_recovery_link`
2. Admin re-authenticates (step-up)
3. Platform calls `auth.api.signInMagicLink` server-side with `metadata: { adminGenerated: true, targetUserId: 'usr-anand', adminId: 'usr-001' }`

**Step 2 — sendMagicLink callback intercepts**

The `sendMagicLink` callback sees `metadata.adminGenerated = true`, stores the recovery link in the platform's recovery link table instead of emailing it.

**Step 3 — Admin delivers the link**

Admin UI shows the link as a one-time QR code. Admin shows the QR to Anand, or sends it via SMS/WhatsApp.

**Step 4 — Anand opens the link**

The magic link is single-use (`allowedAttempts: 1`), expires in 5 minutes (`expiresIn: 300`). Anand is authenticated and lands in a "recover your account" flow — not directly into clinical modules. He sets a new password.

### Why the schema supports this

- `permission_change_audit` logs the admin who generated the link, the target user, and the timestamp
- `users.must_change_password` can be set to force password change after magic link entry
- Magic link configuration (`disableSignUp: true`) prevents unknown users from creating accounts
```

- [ ] **Step 2: Add §22 Phone-only user setup**

```markdown
## 22. Phone-only user sets up username/password — credential account creation

**Scenario:** Community health worker Priya registers with her phone number (no email).

### What happens

**Step 1 — Phone OTP sign-up**

Priya enters phone `+919876543210`. OTP is sent and verified.

**Step 2 — User record created**

Platform assigns username `priya.chw`. `signUpOnVerification` fires with `getTempEmail` returning `priya.chw@auth.internal`.

```
ba_users:
  id: 'auth-priya'  username: 'priya.chw'  email: 'priya.chw@auth.internal'  phoneNumber: '+919876543210'

users:
  iq_tenant_id: 'phc-rajapur'  id: 'usr-priya'  auth_user_id: 'auth-priya'
  phone: '+919876543210'  email: NULL  recovery_tier: 'phone_recovery'  phone_auth_enabled: true
```

**Step 3 — Credential account created**

**Critical:** Platform calls `auth.api.setUserPassword({ body: { userId: 'auth-priya', newPassword: (temporary) } })` — because `signUpOnVerification` creates the user record but NOT the credential account. Without this step, `signIn.username` would fail with "Credential account not found."

**Step 4 — Priya sets her own password**

`users.must_change_password = true` forces Priya to choose her own password on first login.

**Step 5 — Priya can now log in two ways**

- Username (`priya.chw`) + password
- Phone (`+919876543210`) + OTP

### Why the schema supports this

- `users.phone_auth_enabled = true` enables phone OTP login for this user
- `users.recovery_tier = 'phone_recovery'` means recovery uses phone OTP, not email
- `ba_users.email` follows the standard synthetic pattern — no special case for phone users
```

- [ ] **Step 3: Add §23 Shared phone number**

```markdown
## 23. Shared phone number — contact only, no phone auth

**Scenario:** Two nurses at a rural PHC share a family phone number `+919111222333`.

### What happens

**Step 1 — First nurse onboarded**

```
ba_users:
  id: 'auth-n1'  username: 'meera.nurse'  email: 'meera.nurse@auth.internal'  phoneNumber: '+919111222333'

users:
  iq_tenant_id: 'phc-village'  id: 'usr-n1'  phone: '+919111222333'  phone_auth_enabled: true
```

**Step 2 — Second nurse onboarded with same phone**

Platform detects `+919111222333` is already associated with another auth-enabled user.

```
ba_users:
  id: 'auth-n2'  username: 'asha.nurse'  email: 'asha.nurse@auth.internal'
  phoneNumber: NULL  (not stored in ba_users — ambiguous for auth)

users:
  iq_tenant_id: 'phc-village'  id: 'usr-n2'  phone: '+919111222333'  phone_auth_enabled: false
```

**Step 3 — First nurse's phone auth is also disabled**

Since the phone is now shared, `phone_auth_enabled` is set to `false` for both users. The phone is contact-only for both.

Both nurses log in with username + password only.

### Why the schema supports this

- `users.phone_auth_enabled` is the platform-controlled flag that gates phone OTP login
- The phone number is stored as contact info (`users.phone`) even when not auth-enabled
- `ba_users.phoneNumber` is only set when the phone is unique and auth-enabled
```

- [ ] **Step 4: Add §24 Federation after 1,000 local users**

```markdown
## 24. Federation after 1,000 local users — explicit linking, duplicate prevention

**Scenario:** AIIMS Delhi deploys Microsoft Entra ID. 1,000 staff already have local username+password accounts.

### What happens

**Step 1 — Tenant admin configures IdP**

```
idp_configurations:
  iq_tenant_id: 'aiims-delhi'  provider: 'entra_id'
  issuer: 'https://login.microsoftonline.com/abc123/v2.0'
  domain: 'aiims.edu'  status: 'configured'  implicit_signup_enabled: false
```

Implicit SSO sign-up is disabled until matching is complete.

**Step 2 — Platform imports Entra user roster**

Platform queries Entra ID for users, displaying them alongside existing platform users for admin matching.

**Step 3 — Admin matches users**

For each Entra user, the admin matches by employee_id, HR-id, or manual review — never by email alone:

```
auth_identity_links:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-111'  auth_user_id: 'auth-111'
  provider_id: 'entra_id'  issuer: 'https://login.microsoftonline.com/abc123/v2.0'
  subject: '550e8400-e29b-41d4-a716-446655440000'
  claim_snapshot: { email: 'sharma@aiims.edu', name: 'Dr. Sharma', groups: ['physicians'] }
  linked_by: 'usr-001'  linked_at: now()
```

**Step 4 — Test and enable**

After linking is verified in staging, the admin enables `implicit_signup_enabled = true` for genuinely new users (employees who join after federation is live).

**Step 5 — Dr. Sharma logs in via SSO**

Dr. Sharma clicks "Sign in with AIIMS ID" → redirected to Entra → authenticated → better-auth callback fires → platform's `provisionUser` hook looks up `auth_identity_links` by `(provider_id, issuer, subject)` → finds `usr-111` → linked. No duplicate user created.

### Why the schema supports this

- `auth_identity_links` provides explicit, admin-controlled matching — no reliance on email-based auto-linking
- `idp_configurations.implicit_signup_enabled` gates JIT provisioning until matching is done
- `auth_identity_links.subject` uses the IdP's stable subject identifier, not email (which can change)
- The unique index `(iq_tenant_id, provider_id, subject)` prevents duplicate linking
```

- [ ] **Step 5: Add §25 Federated user email mismatch**

```markdown
## 25. Federated user email differs from synthetic — link by subject, not email

**Scenario:** Dr. Sharma's Entra email is `sharma@aiims.edu`, but her `ba_users.email` is `sharma.cardiology@auth.internal`. Auto-linking by email would fail.

### What happens

This scenario demonstrates why explicit linking (§24) is necessary:

1. better-auth's automatic SSO account linking works by matching `ba_users.email` to the IdP's email claim under a verified domain
2. `sharma@aiims.edu` does not match `sharma.cardiology@auth.internal` — auto-linking fails
3. Without explicit `auth_identity_links`, better-auth would create a new `ba_users` record for `sharma@aiims.edu` — resulting in a duplicate clinical user
4. With explicit linking, the platform's `provisionUser` hook checks `auth_identity_links` first, finds the match by `(provider_id, issuer, subject)`, and links to the existing `auth-111` user

### Why the schema supports this

- Synthetic emails make auto-linking impossible by design — this is intentional, not a bug
- `auth_identity_links.subject` (the IdP's stable sub claim) is the correct matching key
- The platform controls the linking workflow, not better-auth's internal logic
```

- [ ] **Step 6: Commit**

```bash
git add docs/architecture/lld/user-management/02-scenarios.md
git commit -m "docs(lld): add scenarios §21-§25 — magic link, phone setup, shared phone, federation linking"
```

---

### Task 10: Scenarios — Add §26–§32 (SCIM upgrade, mailbox ops, 2FA, shared workstation, BFF, sandbox)

**Files:**
- Modify: `docs/architecture/lld/user-management/02-scenarios.md`

- [ ] **Step 1: Add §26 SCIM pushes real email**

```markdown
## 26. SCIM pushes real email for delegated user — recovery tier upgrade

**Scenario:** Nurse Patel (recovery_tier = `delegated`) gets her own AIIMS email when the hospital rolls out email for all staff via SCIM.

### What happens

**Step 1 — SCIM event received**

SCIM sync pushes `{ email: 'patel.nurse@aiims.edu' }` for Nurse Patel.

**Step 2 — Platform updates contact email**

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-666'
  email: 'patel.nurse@aiims.edu'  (was NULL)
  recovery_tier: 'standard'       (was 'delegated')
```

**Step 3 — Delegated route deactivated**

The `delegated_recovery_routes` entry for `usr-666` is soft-deleted or marked inactive. Nurse Patel can now self-serve password resets via her own email.

**Step 4 — ba_users unchanged**

`ba_users.email` remains `patel.nurse@auth.internal` — the identity anchor is never mutated. Only `users.email` and `users.recovery_tier` changed.

### Why the schema supports this

- Recovery tier upgrade is a simple `UPDATE users` — no AuthN layer changes
- `ba_users.email` stability means no better-auth verification flows, no session invalidation
- `delegated_recovery_routes` lifecycle is independent of the identity anchor
```

- [ ] **Step 2: Add §27 Admin mailbox changes**

```markdown
## 27. Admin mailbox changes — delegated route migration with audit

**Scenario:** AIIMS Delhi's IT admin mailbox changes from `it.admin@aiims.edu` to `helpdesk@aiims.edu`.

### What happens

**Step 1 — Admin updates base mailbox**

In the admin UI, the tenant admin changes the base email from `it.admin@aiims.edu` to `helpdesk@aiims.edu`.

**Step 2 — Deliverability test**

Platform sends a probe to `helpdesk+hims-test@aiims.edu`. If it fails, the migration is blocked.

**Step 3 — Batch update**

All `delegated_recovery_routes` rows referencing the old `base_email_id` are updated:
- `address` changes from `it.admin+emp042@aiims.edu` to `helpdesk+emp042@aiims.edu`
- `verified` resets to `false`
- Platform sends probes to each new address

**Step 4 — Audit trail**

```
permission_change_audit:
  entity_type: 'delegated_recovery_routes'  action: 'batch_migrated'
  changed_by: 'usr-001'
  reason: 'IT admin mailbox migration — it.admin@ → helpdesk@'
  old_value: { base_email: 'it.admin@aiims.edu', affected_users: 42 }
  new_value: { base_email: 'helpdesk@aiims.edu' }
```

### Why the schema supports this

- `delegated_recovery_routes.base_email_id` allows batch lookup of all routes using a given base mailbox
- `verified` flag requires re-verification after address change
- `permission_change_audit` captures the bulk operation for compliance
```

- [ ] **Step 3: Add §28 Admin mailbox compromised**

```markdown
## 28. Admin mailbox compromised — disable delegated recovery, rotate, revoke

**Scenario:** The IT admin mailbox `it.admin@aiims.edu` is compromised. All delegated recovery routes using it must be disabled immediately.

### What happens

**Step 1 — Disable all delegated routes**

```
UPDATE delegated_recovery_routes
SET verified = false
WHERE iq_tenant_id = 'aiims-delhi' AND base_email_id = (compromised mailbox ID);
```

This immediately prevents any password reset from being routed through the compromised mailbox.

**Step 2 — Revoke sessions for affected users**

For each user who had a delegated route through the compromised mailbox:
- Platform calls `auth.api.revokeUserSessions({ body: { userId } })` for each affected `auth_user_id`
- This is precautionary — if the attacker used a reset link before detection

**Step 3 — Notify and investigate**

- All affected users are flagged for admin-initiated password reset (Flow A)
- Admin reviews `permission_change_audit` for any suspicious resets in the timeframe
- New base mailbox is configured, routes migrated (§27)

### Why the schema supports this

- `delegated_recovery_routes.verified = false` is the kill switch — unverified routes are never used
- Session revocation uses `auth.api.revokeUserSessions()`, not direct SQL
- Audit trail enables forensic investigation of the compromise window
```

- [ ] **Step 4: Add §29 2FA recovery for delegated user**

```markdown
## 29. 2FA recovery for delegated user — backup codes on screen only, never emailed

**Scenario:** Nurse Meera (recovery_tier = `delegated`) enables TOTP 2FA and later loses her authenticator app.

### What happens

**Step 1 — 2FA enrollment**

When Nurse Meera enables TOTP, the platform shows backup codes on screen one time. Codes are NOT emailed (no personal email to send to, and emailing to the admin mailbox would expose them).

**Step 2 — Authenticator lost**

Nurse Meera cannot provide TOTP. She approaches the IT admin.

**Step 3 — Admin resets 2FA**

1. Cerbos authorizes `admin:user:reset_2fa`
2. Admin re-authenticates (step-up)
3. Platform calls `auth.api.disableTwoFactor({ body: { userId: 'auth-meera' } })` (or equivalent admin API)
4. Platform calls `auth.api.revokeUserSessions({ body: { userId: 'auth-meera' } })`

```
permission_change_audit:
  entity_type: 'user_2fa'  action: 'admin_reset'  changed_by: 'usr-001'
  target_user_id: 'usr-meera'  reason: 'Authenticator app lost, in-person verification'
```

**Step 4 — Nurse Meera re-enrolls**

On next login, Nurse Meera is prompted to set up TOTP again.

### Why the schema supports this

- 2FA reset follows the same Cerbos-gated, step-up-authenticated, audited pattern as password reset
- Session revocation ensures the compromised authenticator (if stolen) cannot maintain access
```

- [ ] **Step 5: Add §30 Shared workstation**

```markdown
## 30. Shared workstation — fast user switching, re-auth before clinical action

**Scenario:** Emergency department has a shared workstation. Multiple staff use it during a shift.

### What happens

**Step 1 — Nurse Asha logs in**

Nurse Asha enters username `asha.emergency` + password. BFF issues JWT, stores refresh token.

**Step 2 — Dr. Kapoor needs the workstation**

Asha clicks "Switch User" (not "Logout"). The SPA clears the current JWT from memory but does NOT destroy the BFF cookie (Asha's session stays active server-side for fast switch-back).

Dr. Kapoor enters his username + password. New JWT issued, new refresh token cookie.

**Step 3 — Clinical action requires re-authentication**

When Dr. Kapoor attempts to prescribe a controlled substance, the module's PEP enforces step-up authentication (a high-assurance action). Dr. Kapoor must re-enter his password before the action proceeds.

### Why the schema supports this

- Username-based login enables fast switching (no email to type)
- Short JWT lifetime (1-2 min) limits exposure from abandoned sessions
- Step-up re-authentication is enforced by Cerbos policies, not by the workstation
- `permission_change_audit` logs each distinct user's actions for the full shift
```

- [ ] **Step 6: Add §31 BFF down**

```markdown
## 31. BFF down during clinical session — existing JWTs expire, operational behavior

**Scenario:** The BFF goes down for 5 minutes during a busy clinic.

### What happens

**Step 1 — BFF goes down**

Existing JWTs are still valid — modules verify signatures against cached JWKS, not against the BFF. Doctors currently in the middle of a clinical note can continue working.

**Step 2 — JWT expires (1-2 minutes later)**

The SPA tries to refresh via the BFF. The refresh call fails (BFF is unreachable). The SPA shows a "Connection lost, retrying..." banner but does NOT immediately log the user out.

**Step 3 — BFF recovers**

When the BFF comes back, the SPA retries the refresh. If the underlying better-auth session is still valid, the refresh succeeds and the user continues seamlessly. If the session expired during the outage (unlikely in 5 min, since sessions last longer), the user must re-login.

**Step 4 — Module independence preserved**

Modules that received valid JWTs before the outage continue processing those requests. The BFF outage does NOT cause module-level errors for in-flight requests.

### Why the schema supports this

- Zero-trust: modules verify JWTs against JWKS, independent of BFF
- JWKS is cached — module verification works even if the JWKS endpoint (behind the BFF) is temporarily unreachable
- BFF is stateful (cookie store) but its outage is bounded — no data loss, only a brief auth gap
```

- [ ] **Step 7: Add §32 Training/sandbox**

```markdown
## 32. Training/sandbox environment — prevent unsafe credential practices from normalizing

**Scenario:** Hospital sets up a training environment for new staff to learn the system.

### What happens

**Step 1 — Sandbox tenant created**

A separate tenant (`aiims-delhi-sandbox`) is created with `environment = 'sandbox'` (Configurator-managed).

**Step 2 — Training accounts**

Training accounts are created with explicit sandbox markers:

```
ba_users:
  id: 'auth-train-1'  username: 'train.nurse.01'  email: 'train.nurse.01@auth.internal'

users:
  iq_tenant_id: 'aiims-delhi-sandbox'  id: 'usr-train-1'  auth_user_id: 'auth-train-1'
  kind: 'user'  status: 'active'  recovery_tier: 'admin_only'
```

**Step 3 — Password policy enforced**

Training accounts still require unique passwords and follow the same credential policies as production. Password sharing ("everyone use `Training123`") is prevented by:
- Each account has a distinct username and password
- `permission_change_audit` logs all access even in sandbox
- Sandbox accounts cannot be reused in production tenants (different `iq_tenant_id`)

**Step 4 — No cross-contamination**

Sandbox tenant data is on a separate Citus shard. Cerbos tenant isolation ensures sandbox principals cannot access production resources.

### Why the schema supports this

- `iq_tenant_id` distribution provides complete data isolation between sandbox and production
- Same auth model in sandbox and production prevents "training shortcuts" from becoming habits
- `recovery_tier = 'admin_only'` for training accounts — no email recovery, admin resets only
```

- [ ] **Step 8: Commit**

```bash
git add docs/architecture/lld/user-management/02-scenarios.md
git commit -m "docs(lld): add scenarios §26-§32 — SCIM upgrade, mailbox ops, 2FA, shared workstation, BFF down, sandbox"
```

---

### Task 11: Scenarios — Update summary table

**Files:**
- Modify: `docs/architecture/lld/user-management/02-scenarios.md` (the Summary section at the end)

- [ ] **Step 1: Replace the summary table**

Replace the "Summary: what the schema handles" section with:

```markdown
## Summary: what the schema handles

| Category | Scenarios | Key schema features |
|----------|-----------|-------------------|
| **Tenant lifecycle** | §1 onboarding, §14 feature rollout, §32 sandbox | `iq_tenant_id` distribution, `is_system` roles, capabilities reference table |
| **User lifecycle** | §2 onboarding, §7 transfer, §13 security incident, §22 phone setup | `users.status`, department assignments, `ba_users.username`, synthetic email |
| **Multi-tenancy** | §3 multi-tenant login, §4 role customization | `auth_user_id` linking, per-tenant `role_capabilities`, Token Handler |
| **Authorization granularity** | §4 capabilities, §6 clearances, §15 ward scoping | `role_capabilities`, `user_clearances`, `role_assignments.scope_type` |
| **Delegation** | §5 superintendent delegation | `delegations` with time bounds, PEP enrichment |
| **Non-human principals** | §8 service accounts, §9 agents | `users.kind` (user/service/agent), same capability model |
| **External integration** | §10 SCIM, §24 federation, §25 email mismatch, §26 SCIM upgrade | `idp_configurations`, `auth_identity_links`, `employee_id` |
| **Recovery** | §18 standard, §19 delegated, §20 admin-only, §21 magic link, §29 2FA | `recovery_tier`, `delegated_recovery_routes`, `must_change_password` |
| **Phone auth** | §22 phone setup, §23 shared phone | `phone_auth_enabled`, phone-only registration flow |
| **Token lifecycle** | §16 refresh, §17 key rotation, §31 BFF down | `jwks`, Token Handler, JWKS caching |
| **Operations** | §11 audit, §27 mailbox migration, §28 mailbox compromise, §30 shared workstation | `permission_change_audit`, `delegated_recovery_routes` lifecycle |
| **Compliance** | §11 audit, §13 incident, §29 2FA recovery | `permission_change_audit` with `reason`, `status` lifecycle |
| **Organization** | §12 regional director | `org_id`, `scope_level: 'organization'` |
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/lld/user-management/02-scenarios.md
git commit -m "docs(lld): update scenarios summary table for §16-§32"
```

---

### Task 12: HLD-04 — Update authentication sections

**Files:**
- Modify: `docs/architecture/hld/04-authn-authz-flow.md`

- [ ] **Step 1: Update §1.2 Federation**

Replace §1.2 (lines 16-18) with:

```markdown
### 1.2 Federation

The platform supports a **two-tier federation strategy** for external Identity Providers:

**Tier 1 — Direct federation (modern IdPs):** For hospitals running modern IdPs (Microsoft Entra ID, Okta, PingIdentity, Auth0), better-auth's SSO plugin (OIDC) and SAML plugin connect directly. Configuration is per-tenant via the Configurator module.

**Tier 2 — Shared Keycloak broker (legacy IdPs):** For hospitals with legacy/non-standard identity systems that cannot speak OIDC or modern SAML, the platform operates a shared Keycloak cluster. Each legacy hospital gets its own realm (full logical isolation). Each realm bridges to the hospital's legacy IdP and exposes an OIDC endpoint that better-auth consumes as a standard federated IdP.

**Account linking:** When a hospital that already has local users deploys an IdP, existing users must be explicitly linked to their IdP identity by an admin using employee_id or HR-id matching — never by email alone. This is managed through an `auth_identity_links` table. See [User Management LLD §15](../lld/user-management/01-schema-design.md) and [design spec §9](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#9-federation-account-linking) for the full linking workflow.

A hospital that already runs Entra ID for staff accounts does not need to maintain a separate set of credentials in the HIMS — their existing directory is the source of truth for identity.
```

- [ ] **Step 2: Update §1.5 Token format**

Replace the JWT claims table in §1.5 (lines 30-41) with:

```markdown
### 1.5 Token format

Authentication produces a signed JWT (JSON Web Token). The JWT payload includes the following claims:

| Claim | Description |
|-------|-------------|
| `sub` | Platform-internal `user_id` (from the shadow record for federated users) |
| `iq_tenant_id` | The tenant (hospital) context for this session |
| `roles` | Array of role identifiers assigned to this user within this tenant |
| `department` | Department or ward context, if applicable |
| `org_id` | Organization ID for multi-hospital users (null for single-tenant users) |
| `jti` | Unique token ID for audit correlation and replay detection |
| `iss` | Issuer — the platform's AuthN service |
| `exp` | Expiration timestamp (1-2 minutes — Token Handler pattern) |
| `iat` | Issued-at timestamp |

Tokens are short-lived (1-2 minutes, managed by the BFF Token Handler). The BFF stores refresh tokens in HttpOnly cookies and seamlessly reissues JWTs on expiry — doctors can work for 12-hour shifts without re-authentication. See [ADR-0015](../adr/0015-bff-role-zero-trust.md) for the Token Handler pattern.

**What is NOT in the JWT:** Email (the synthetic `ba_users.email` has no business meaning), capabilities, delegations, clearances. These are resolved by the PEP at request time. See [User Management LLD §7](../lld/user-management/01-schema-design.md#7-pep-enrichment-pattern).
```

- [ ] **Step 3: Update §1.6 JWKS-based verification**

Replace §1.6 (lines 43-45) with:

```markdown
### 1.6 JWKS-based verification

The AuthN service publishes a JWKS (JSON Web Key Set) endpoint at `/.well-known/jwks.json`. Any service holding the public keys can verify a JWT signature locally without calling back to the AuthN service. This is the foundation for the zero-trust verification model described in sections 2 and 7 ([RFC 7517 — JSON Web Key](https://datatracker.ietf.org/doc/html/rfc7517)).

**Key management:** JWKS keys are managed by better-auth's JWT plugin and persisted in a database `jwks` table — surviving pod restarts and horizontal scaling. Private keys are encrypted at rest with AES-256-GCM by default. Key rotation is configured with an explicit `rotationInterval` (e.g., 7 days) and `gracePeriod` (e.g., 14 days) during which both old and new keys are served. See [User Management LLD §17](../lld/user-management/01-schema-design.md).
```

- [ ] **Step 4: Update §2 User-facing authentication flow**

In §2, update Step 1 and Step 3 (lines 53-58):

Replace Step 1 with:
```markdown
**Step 1 — User login.** The user navigates to the HIMS web application and enters their **username** and password. If the tenant is configured for direct authentication, better-auth validates the credentials via the username plugin. If the tenant is configured for federation, the user clicks "Sign in with [Hospital IdP]" and is redirected to the external IdP for authentication.
```

Replace Step 3 with:
```markdown
**Step 3 — Token Handler issues JWT.** The BFF receives the authentication response from better-auth, stores the **refresh token** in an HttpOnly, SameSite=Strict, Secure cookie, and issues a **short-lived JWT** (1-2 minutes) to the SPA. The SPA stores the JWT and attaches it to every subsequent API request as a `Bearer` token. When the JWT expires, the SPA silently refreshes via the BFF's refresh endpoint — no re-authentication needed.
```

- [ ] **Step 5: Update §4 Step 2 — PEP enrichment**

Replace Step 2 in §4 (line 167) with:

```markdown
**Step 2 — Principal extraction and enrichment.** The PEP extracts the `Principal` from the verified JWT claims: `user_id`, `iq_tenant_id`, `roles[]`, `department`, `org_id`. It then enriches the principal with **capabilities** (by resolving `roles[]` → `role_capabilities` → `capabilities`), **active delegations**, and **clearances** — all from the module's local cache of User Management data. See [User Management LLD §7 — PEP enrichment pattern](../lld/user-management/01-schema-design.md#7-pep-enrichment-pattern).
```

- [ ] **Step 6: Update §3.4 — mention capabilities**

In §3.4, update the bullet list (lines 96-101) to add capabilities:

Replace the list with:
```markdown
- Role definitions (what roles exist in a given tenant)
- Role assignments (which users hold which roles)
- **Capabilities** (what actions each role is allowed to perform — the bridge between policies-as-code and data-as-config)
- Department and ward hierarchies
- Tenant-specific scope overrides (e.g., "in this hospital, nurses can order labs; in that hospital, they cannot")
```

- [ ] **Step 7: Update §7 — Add §7.4 Token Handler**

After §7.3, add:

```markdown
### 7.4 Token Handler session management

The BFF's role expands beyond signature verification to include **session lifecycle management** via the Token Handler pattern:

- The BFF stores refresh tokens in HttpOnly, SameSite=Strict, Secure cookies
- The BFF issues 1-2 minute JWTs to the SPA
- When a JWT expires, the SPA calls the BFF's refresh endpoint, which uses the cookie-stored refresh token to obtain a new JWT from better-auth
- If the session has been revoked (e.g., admin suspended the user), the refresh fails and the user is redirected to login

This expansion does not weaken the zero-trust model. Modules still verify JWTs independently against JWKS — they do not know or care about the Token Handler. They see a standard JWT with a short lifetime, which is strictly better for security than the previous 15-minute default.

The BFF becomes stateful (it stores cookies), introducing a new consequence: if the BFF is down, new JWT issuance stops. However, existing JWTs remain valid until expiry, and modules continue processing in-flight requests. See [User Management LLD §16](../lld/user-management/01-schema-design.md).
```

- [ ] **Step 8: Commit**

```bash
git add docs/architecture/hld/04-authn-authz-flow.md
git commit -m "docs(hld): update HLD-04 — two-tier federation, Token Handler, JWKS management, JWT claims, PEP enrichment"
```

---

### Task 13: HLD-04 — Close open questions, add OAuth 2.1 and recovery sections

**Files:**
- Modify: `docs/architecture/hld/04-authn-authz-flow.md`

- [ ] **Step 1: Close §11 open questions**

Replace §11 (lines 381-398) with:

```markdown
## 11. Resolved questions

### 11.1 Cerbos policy storage and distribution

**Decision:** Git + bundle distribution. Policies are committed to a Git repository, compiled and tested in CI (`cerbos compile` + `cerbos test`), and distributed to Cerbos sidecars as bundles. The Admin API with database-backed storage is not enabled unless concrete evidence shows the deployment cycle is too slow for a specific class of policy changes. If enabled, Admin API changes must still be synced back to Git as the source of record.

### 11.2 Token lifetime and refresh strategy

**Decision:** BFF Token Handler pattern. Token lifetime is 1-2 minutes (not 15 minutes). The BFF stores refresh tokens in HttpOnly cookies and seamlessly reissues JWTs on expiry. This solves the JWT revocation gap (maximum exposure = token lifetime) and supports long clinical sessions (12+ hours) without interruption. See §7.4 and [User Management LLD §16](../lld/user-management/01-schema-design.md).
```

- [ ] **Step 2: Add §13 OAuth 2.1 Provider**

Insert after §12, before References:

```markdown
## 13. OAuth 2.1 Provider

When the platform acts as an identity source for third-party systems (e.g., clinical systems that need SSO into the platform, Integration Hub partners, future mobile apps), it uses better-auth's **OAuth 2.1 Provider plugin** (the older OIDC Provider plugin is deprecated).

The plugin provides:
- `/.well-known/openid-configuration` discovery document
- JWKS endpoint (integrated with the JWT plugin key management from §1.6)
- Authorization endpoint with PKCE (mandatory per OAuth 2.1)
- Token endpoint with `authorization_code`, `refresh_token`, and `client_credentials` grant types
- Token revocation ([RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009))
- Token introspection ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662))

Custom claims injection ensures third-party tokens include `iq_tenant_id`, `roles`, `department`, and `org_id` — the same claim contract used internally.
```

- [ ] **Step 3: Add §14 Recovery tier model**

```markdown
## 14. Recovery tier model

Recovery (how a user regains access when locked out) is a first-class platform workflow, not a generic password-reset email. Users are classified into five recovery tiers (`standard`, `delegated`, `phone_recovery`, `admin_only`, `federated`), each with different allowed recovery paths.

The recovery tier is stored on the platform `users` table and drives routing in better-auth's `sendResetPassword` callback:

- **Standard:** Self-serve email reset via `users.email`
- **Delegated:** Reset routed to admin mailbox via `delegated_recovery_routes` table
- **Phone recovery:** Phone OTP reset
- **Admin only:** Admin sets password directly via `auth.api.setUserPassword()`
- **Federated:** IdP-managed recovery

Three admin recovery workflows (direct password set, admin-generated magic link, delegated email route) are all gated by Cerbos authorization, admin step-up authentication, and full audit trail.

See [User Management LLD §15](../lld/user-management/01-schema-design.md) and [design spec §3](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#3-recovery-tier-model) for full details.
```

- [ ] **Step 4: Update References section**

Add these references to the References list:

```markdown
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) — PKCE mandatory, implicit grant removed
- [RFC 7009 — OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
- [RFC 7662 — OAuth 2.0 Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662)
```

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/hld/04-authn-authz-flow.md
git commit -m "docs(hld): close open questions, add OAuth 2.1 Provider and recovery tier model sections"
```

---

### Task 14: ADR-0003 — Update for revision

**Files:**
- Modify: `docs/architecture/adr/0003-authn-better-auth-identity-adapter.md`

- [ ] **Step 1: Update Decision outcome**

Replace the "Decision outcome" section (starting at line 27) through the end of "Consequences" (line 53) with:

```markdown
## Decision outcome

Chosen option: **better-auth behind an IdentityProvider interface**, because it gives us full control over the authentication pipeline and token format while the adapter pattern decouples modules from the underlying IdP — hospitals bring their own identity system without any module-level code changes, and the solution runs entirely on-premises with zero cloud dependencies.

**Key revisions since initial proposal (2026-05-03):**

- **Username-primary login:** The username plugin makes `ba_users.username` the primary login credential. Email is not used for login. `ba_users.email` is a synthetic identity anchor (`{username}@auth.internal`) satisfying better-auth's NOT NULL UNIQUE constraint without depending on external infrastructure.
- **BFF Token Handler:** The BFF's role expands from signature verification only to session lifecycle management. JWTs are 1-2 minutes (not 15), refresh tokens stored in HttpOnly cookies. Solves the JWT revocation gap and long clinical session support.
- **Two-tier federation:** Tier 1 = direct OIDC/SAML via better-auth plugins. Tier 2 = shared Keycloak cluster with one realm per legacy hospital (OIDC bridge). Former Tier 2 (hospital deploys own broker) eliminated.
- **OAuth 2.1 Provider:** Replaces the deprecated OIDC Provider plugin. Production-ready with RFC 7009/7662/7591 support.
- **Recovery tier model:** 5-tier recovery system (`standard`, `delegated`, `phone_recovery`, `admin_only`, `federated`) as a first-class platform workflow.
- **AuthN provider replaceability:** The `IdentityProvider` interface contract is formalized. Synthetic emails make migration to Keycloak practical — they're meaningless internal keys that get discarded, not migrated. All platform-owned data (roles, capabilities, recovery tiers, identity links) survives a provider switch.

As of v1.5+, better-auth natively covers the federation capabilities that historically required a heavyweight IAM server like Keycloak:

- **OIDC federation** via the SSO plugin — supports Entra ID, Okta, Keycloak, Auth0, and Google.
- **SAML 2.0** — both SP-initiated and IdP-initiated flows.
- **SCIM provisioning** (v1.5+) — including Microsoft Entra ID compatibility.
- **Custom OAuth2/OIDC providers** via the Generic OAuth plugin.
- **OAuth 2.1 Provider mode** — the platform can act as an identity source for third-party systems (dynamic client registration, JWKS endpoints, custom claims).

### Consequences

**Positive:**

- Every module consumes the same `IdentityProvider` interface regardless of IdP. Module code is IdP-agnostic.
- User Management owns the full token lifecycle and controls exactly which claims appear in every JWT.
- JIT provisioning creates shadow records for federated users, providing an unbroken audit chain. SCIM keeps shadow records current.
- better-auth is a TypeScript library that runs in-process with User Management. No separate JVM or HA cluster.
- On-premises deployments carry no external identity dependency.
- Synthetic emails decouple the AuthN identity anchor from business logic and external infrastructure, making provider replacement practical.
- The BFF Token Handler pattern eliminates the need for a distributed token blocklist while supporting 12-hour clinical sessions.

**Negative / accepted trade-offs:**

- better-auth is a younger library than Keycloak. We accept this because the `IdentityProvider` interface limits our dependency surface, and the synthetic email pattern makes migration to an alternative provider (including Keycloak) a single-adapter replacement.
- Edge-case federation (non-standard hospital SSO) may require thin custom adapters.
- No built-in admin UI — User Management builds its own tenant-aware admin interface.
- BFF becomes stateful (cookie store for refresh tokens). BFF outage blocks new JWT issuance but does not affect in-flight requests.
```

- [ ] **Step 2: Update follow-up actions**

Replace the "Follow-up actions" list with:

```markdown
**Follow-up actions:**

- [x] Define the `IdentityProvider` interface contract — see [design spec §10.4](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#104-the-identityprovider-interface-contract).
- [ ] Implement the `BetterAuthIdentityProvider` as the default implementation.
- [ ] Implement Entra ID / OIDC federation adapter as the first external IdP integration.
- [ ] Define the JWT claim schema as a platform-level contract shared with PEP middleware SDK.
- [x] Determine token refresh strategy — BFF Token Handler pattern (1-2 min JWTs + HttpOnly refresh cookie). See [design spec §5](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#5-bff-token-handler-pattern).
- [ ] Implement the recovery tier model and admin recovery workflows (Flows A, B, C).
- [ ] **Federation POC:** Verify SSO `provisionUser` hook can link a synthetic-email local user to an IdP account with a different email, end-to-end.
- [ ] Implement the required better-auth configuration checklist from [design spec §14](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#14-required-better-auth-configuration).
```

- [ ] **Step 3: Update OIDC Provider reference**

In the "Pros and cons" section under "better-auth behind IdentityProvider interface" (line 79), change "OIDC Provider" references to "OAuth 2.1 Provider":

Replace:
```
- *Good:* Works identically in service mode (Kubernetes) and embedded mode (single-process lite deployment).
```

With:
```
- *Good:* Works identically in service mode (Kubernetes) and embedded mode (single-process lite deployment).
- *Good:* OAuth 2.1 Provider plugin (replaces deprecated OIDC Provider) enables the platform to act as an identity source for third-party systems — dynamic client registration, JWKS endpoints, custom token claims.
```

- [ ] **Step 4: Update Links section**

Add to the Links section:

```markdown
  - better-auth, "OAuth 2.1 Provider Plugin", https://better-auth.com/docs/plugins/oauth-provider, accessed 2026-05-03 (replaces deprecated OIDC Provider)
  - better-auth, "Username Plugin", https://better-auth.com/docs/plugins/username, accessed 2026-05-03
  - better-auth, "JWT Plugin", https://better-auth.com/docs/plugins/jwt, accessed 2026-05-03
```

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/adr/0003-authn-better-auth-identity-adapter.md
git commit -m "docs(adr): update ADR-0003 — username login, Token Handler, two-tier federation, OAuth 2.1, recovery tiers, replaceability"
```

---

### Task 15: ADR-0015 — Update for Token Handler

**Files:**
- Modify: `docs/architecture/adr/0015-bff-role-zero-trust.md`

- [ ] **Step 1: Update Decision outcome**

Replace the first paragraph of "Decision outcome" (line 27) with:

```markdown
Chosen option: **BFF for signature verification + session lifecycle management (Token Handler)**, because the BFF is an optimization layer (routing, token format validation, response aggregation) and not a security boundary. The BFF's role expands from pure signature verification to include refresh token storage and short-lived JWT reissuance — the Token Handler pattern — while each module continues to verify tokens and evaluate Cerbos policies independently.
```

- [ ] **Step 2: Add Token Handler consequences**

In the "Positive" consequences, add after the existing items:

```markdown
- Short-lived JWTs (1-2 minutes) reduce the revocation window to near-zero. No distributed token blocklist is needed — revoking a session means the next refresh attempt fails, and the maximum exposure is one JWT lifetime.
- Refresh tokens are stored in HttpOnly, SameSite=Strict, Secure cookies. JavaScript cannot access them, mitigating XSS-based token theft.
- Long clinical sessions (12+ hours) are supported seamlessly. The refresh cycle is invisible to the user.
```

In the "Negative" consequences, add:

```markdown
- The BFF is now stateful — it stores refresh token cookies. A BFF outage blocks new JWT issuance. However, existing JWTs remain valid until expiry (1-2 min), and modules continue processing in-flight requests. This is a bounded failure mode.
```

- [ ] **Step 3: Update the option name in Pros/Cons**

In the "Pros and cons" section, rename the chosen option heading from:

```markdown
### BFF for signature verification only + per-module zero-trust
```

To:

```markdown
### BFF for signature verification + session lifecycle (Token Handler) + per-module zero-trust
```

Add to the pros for this option:

```markdown
- *Good:* Token Handler pattern — 1-2 min JWTs, HttpOnly refresh cookies — eliminates JWT revocation gap without distributed blocklist.
- *Good:* Supports 12+ hour clinical sessions seamlessly.
```

- [ ] **Step 4: Update follow-up actions**

Add to the follow-up actions:

```markdown
- [ ] Implement BFF Token Handler: refresh token cookie management, JWT reissuance endpoint, session revocation propagation.
- [ ] Configure JWT plugin: `expirationTime: "2m"`, `rotationInterval`, `gracePeriod`. See [design spec §14](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#14-required-better-auth-configuration).
```

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/adr/0015-bff-role-zero-trust.md
git commit -m "docs(adr): update ADR-0015 — Token Handler pattern, session lifecycle, short-lived JWTs"
```

---

### Task 16: Dev-doubts — Write 03-analysis.md

**Files:**
- Create: `docs/architecture/lld/user-management/dev-doubts/03-analysis.md`

- [ ] **Step 1: Write the analysis document**

Create `docs/architecture/lld/user-management/dev-doubts/03-analysis.md`:

```markdown
# Dev-Doubt 03 — AuthN/AuthZ Revision Analysis

This document captures the reasoning behind six design decisions from the AuthN/AuthZ revision. Each section explains why the chosen approach was selected over alternatives, grounded in the platform's constraints and validated by adversarial review.

**Design spec:** [`2026-05-03-authn-authz-revision-design.md`](../../../../superpowers/specs/2026-05-03-authn-authz-revision-design.md)  
**Adversarial reviews:** [`agent-reviews/t/`](../../../../agent-reviews/t/authn-email-recovery-deliberation-review/review.md), [`agent-reviews/g/`](../../../../agent-reviews/g/synthetic-vs-subaddressing-verdict.md)

---

## 1. ba_users / users normalization

**Question:** Why do `ba_users` and `users` overlap? Isn't this unnecessary duplication?

**Answer:** They serve different layers with different lifecycles:

| Aspect | `ba_users` (Layer 1) | `users` (Layer 3) |
|--------|---------------------|-------------------|
| Owner | better-auth library | Platform code |
| Purpose | Credential storage, session tracking | Business context, roles, department |
| Scope | Spans tenants (one row per human) | Per-tenant (one row per tenant per human) |
| Distribution | By `id` | By `iq_tenant_id` |

A single human operating across 3 tenants has 1 `ba_users` row and 3 `users` rows. The `auth_user_id` link is logical, not a FK — because better-auth's schema is library-managed and may change across versions.

This is intentional denormalization across domain boundaries — a well-understood pattern when two systems with different ownership, change cadence, and distribution strategies share a data point.

---

## 2. Synthetic email vs sub-addressing

**Question:** Why not use `admin+N@hospital.com` in `ba_users.email` instead of `{username}@auth.internal`?

**Answer:** Sub-addressing was proposed and rejected after adversarial review (agents T and G independently reached the same conclusion):

1. **Infrastructure coupling.** Sub-addressing requires the tenant's mail server to support RFC 5233. Many Indian hospitals run legacy Exchange or government mail that strips `+` suffixes. Coupling the identity anchor to external mail infrastructure violates the fragmented adoption constraint.

2. **Unnecessary mutation.** When a user gets their own email, changing `ba_users.email` from `admin+42@hospital.com` to `staff@hospital.com` triggers better-auth's email verification flows, session invalidation, and account linking logic. The synthetic email never needs to change.

3. **Social engineering risk.** Password reset emails sent to an admin inbox mean anyone with inbox access can hijack delegated accounts. Synthetic emails decouple the identity anchor from the recovery channel — recovery routing is platform-controlled.

4. **Replaceability.** Synthetic emails are meaningless internal keys. If the platform migrates from better-auth to Keycloak, synthetic emails are discarded, not migrated. Sub-addressed emails would need to be preserved in the new provider — unnecessary coupling.

The `@auth.internal` domain is non-routable. The synthetic pattern is used by better-auth's own phone-number and anonymous plugins (`getTempEmail`, `getAnonUserEmail`), confirming it is an intended pattern, not a hack.

---

## 3. Token Handler vs distributed blocklist

**Question:** Why not use a centralized token blocklist (Redis/database) for JWT revocation instead of short-lived tokens?

**Answer:** A distributed blocklist requires:
- A highly available shared store (Redis cluster or database)
- Every module to check the blocklist on every request (added latency, added dependency)
- Blocklist entries to be kept in sync across pods with minimal propagation delay
- Cleanup of expired entries to prevent unbounded growth

The Token Handler pattern achieves the same security guarantee (bounded revocation window) without any shared state:
- Token lifetime = revocation window = 1-2 minutes
- Revoking a session means the next refresh fails — no blocklist needed
- Modules verify JWTs against cached JWKS — no network call per request
- Zero additional infrastructure

The trade-off: the BFF becomes stateful (cookie store). But this is a bounded, well-understood stateful component — not a distributed cache.

---

## 4. Keycloak-as-broker vs direct legacy adapters

**Question:** Why use a shared Keycloak cluster for legacy hospitals instead of building custom adapters?

**Answer:** Custom adapters would mean building and maintaining a protocol translation layer for every non-standard IdP — LDAP, legacy SAML, proprietary protocols. This is high-effort, custom code for each hospital.

Keycloak is battle-tested at bridging legacy protocols. Using it as a broker (one realm per hospital) gives:
- Proven LDAP, Active Directory, SAML, Kerberos connectors out of the box
- Full logical isolation between hospitals via realms
- Runtime realm CRUD via Admin API (no restart for onboarding)
- ~200ms added latency at login redirect only — zero impact on API requests

The key insight: Keycloak is **not** the identity server. better-auth remains the identity server. Keycloak is a protocol translation layer for legacy edge cases. better-auth consumes each realm's OIDC endpoint as a standard federated IdP.

Scaling: ~2GB heap for 20 realms, ceiling at 100-200 realms on a single cluster. Beyond that, horizontal Keycloak clustering (which Keycloak natively supports).

---

## 5. Recovery as platform workflow

**Question:** Why not just use better-auth's built-in password reset? Why build a 5-tier recovery model?

**Answer:** better-auth's password reset assumes every user has a unique, reachable email. This assumption fails in Indian hospitals:

- Nurses sharing `ward-a@hospital.com` — who gets the reset email?
- Ward attendants with no email at all — reset goes where?
- Delegated users whose recovery email is an admin mailbox — admin can hijack accounts
- Federated users whose recovery should go to their IdP, not to better-auth

better-auth's `sendResetPassword` callback is a **primitive**, not a solution. The callback gives us the hook; the platform's recovery tier model is the solution:

| Tier | Problem it solves |
|------|-------------------|
| `standard` | "I have my own email" — happy path |
| `delegated` | "My org has a shared mailbox I can receive through" — controlled delegation |
| `phone_recovery` | "I have my own phone" — OTP alternative |
| `admin_only` | "I have nothing" — in-person admin reset |
| `federated` | "My IdP manages my credentials" — redirect |

Each tier has explicit rules about what recovery channels are enabled and disabled. `admin_only` users cannot receive magic links by email. `federated` users cannot reset local passwords (unless break-glass). The tier classification is itself the security policy.

---

## 6. Federation linking risk

**Question:** Why can't we use better-auth's automatic account linking for federation?

**Answer:** better-auth's SSO auto-linking works by matching the IdP's email claim against `ba_users.email`. With synthetic emails (`sharma.cardiology@auth.internal`), this match will never succeed — the IdP sends `sharma@hospital.com`, which doesn't match.

This means every federated login for an existing user would create a **duplicate** `ba_users` record — and potentially a duplicate clinical user. In a healthcare system, duplicate users mean:
- Split medical records
- Fragmented audit trails
- Potential clinical harm (missing allergy data, incomplete medication history)

The solution is explicit, admin-controlled account linking via `auth_identity_links`:
- Admin matches IdP users to existing platform users by employee_id, HR-id, or manual review
- Platform records the link: `(provider_id, issuer, subject)` → `user_id`
- SSO callback checks `auth_identity_links` first, JIT provisions only genuinely new users

**POC required:** The `provisionUser` hook's ability to link to an existing `ba_users` record with a synthetic email must be verified end-to-end before the federation LLD is finalized.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/lld/user-management/dev-doubts/03-analysis.md
git commit -m "docs(lld): add dev-doubt 03 — AuthN/AuthZ revision analysis (6 sections)"
```

---

### Task 17: Final cross-reference validation

**Files:** All modified files

- [ ] **Step 1: Validate section numbers**

Open `01-schema-design.md` and verify section numbering is sequential (1-18) with no gaps or duplicates. The new sections should be:
- §9.1 (subsection of §9)
- §15, §16, §17, §18 (new top-level sections)

- [ ] **Step 2: Validate scenario numbers**

Open `02-scenarios.md` and verify:
- Existing §1-§15 are unchanged in numbering
- New §16-§32 are sequential
- Summary table references correct scenario numbers

- [ ] **Step 3: Validate HLD-04 section numbers**

Open `04-authn-authz-flow.md` and verify:
- §11 is now "Resolved questions" (was "Open questions")
- §13 and §14 are new sections, inserted after §12
- References section is still last

- [ ] **Step 4: Validate cross-references between documents**

Check these links are valid:
- `01-schema-design.md §15` is referenced by `04-authn-authz-flow.md §14`
- `01-schema-design.md §16` is referenced by `04-authn-authz-flow.md §7.4`
- `01-schema-design.md §17` is referenced by `04-authn-authz-flow.md §1.6`
- `01-schema-design.md §7` is referenced by `04-authn-authz-flow.md §1.5`
- `ADR-0015` is referenced by `04-authn-authz-flow.md §1.5`
- Design spec is referenced by `ADR-0003` follow-ups, `04-authn-authz-flow.md §14`, `dev-doubts/03-analysis.md`

- [ ] **Step 5: Validate column names across documents**

Grep across all modified files for consistency:
```bash
grep -r "recovery_tier" docs/architecture/lld/user-management/ docs/architecture/hld/04-authn-authz-flow.md
grep -r "phone_auth_enabled" docs/architecture/lld/user-management/
grep -r "must_change_password" docs/architecture/lld/user-management/
grep -r "delegated_recovery_routes" docs/architecture/lld/user-management/ docs/architecture/hld/
grep -r "auth_identity_links" docs/architecture/lld/user-management/ docs/architecture/hld/ docs/architecture/adr/
```

Verify all references use consistent naming (no typos like `recovery_routes` vs `delegated_recovery_routes`).

- [ ] **Step 6: Validate JSON**

```bash
python3 -c "import json; json.load(open('docs/architecture/lld/user-management/schema-reference.json')); print('schema-reference.json: valid')"
python3 -c "import json; json.load(open('docs/architecture/lld/user-management/user-management.erd.json')); print('ERD JSON: valid')"
```

- [ ] **Step 7: Check §14 update checklist**

Open `01-schema-design.md §14` and verify each checkbox corresponds to a change made in this plan. Mark any items as complete if they were addressed.
