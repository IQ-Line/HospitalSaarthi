# AuthN/AuthZ Architecture Revision — Design Spec

**Date:** 2026-05-03 (revised after adversarial review)  
**Status:** Approved (design review complete, pending artifact updates)  
**Scope:** Revise the User Management LLD, HLD-04, ADR-0003, and ADR-0015 to incorporate username-primary identity, BFF Token Handler pattern, JWKS key management, OAuth 2.1 Provider plugin, two-tier federation, recovery tier model, and AuthN provider replaceability boundary.

---

## 1. Problem Statement

Four inputs triggered this revision:

1. **Product requirement:** Email is NOT unique per user across tenants. Indian hospitals regularly have multiple staff sharing one email. Login must be via username, not email.
2. **Lead's notes:** `ba_users` and `users` normalization rationale needs documentation. Username+password is the default auth method. Keep the AuthN implementation decoupled enough that switching to Keycloak fully is feasible.
3. **Gemini review of HLD-04:** Validated better-auth over Keycloak but flagged three blind spots — JWT revocation gap (§11.2 unanswered), legacy SAML scoping (no strategy for non-OIDC hospitals), and JWKS key rotation (deferred as "implementation detail" but architecturally load-bearing).
4. **Adversarial review (agents T and G):** Validated better-auth as viable but corrected the sub-addressing email strategy, identified federation account linking as the largest unsolved risk, elevated recovery to a first-class platform workflow, and demanded explicit provider replaceability boundaries.

All blind spots and gaps are now resolved. This spec documents every decision and lists the exact artifacts to update.

---

## 2. Identity Model — Username-Primary Login

### 2.1 Decision

`ba_users.username` becomes the primary login credential. Usernames are org-assigned and globally unique across the platform. Users authenticate with username + password; email is not used for login.

### 2.2 Synthetic email as internal identity anchor

better-auth requires `ba_users.email` to be NOT NULL and UNIQUE. Since real emails cannot be unique across tenants, and making the identity anchor depend on external mail infrastructure would violate the fragmented adoption constraint, we use non-routable synthetic values:

```
ba_users.email = "{username}@auth.internal"
```

**Why synthetic, not sub-addressed:** An earlier version of this spec proposed using sub-addressed emails (`admin+N@hospital.com`) in `ba_users.email`. This was rejected after adversarial review because:

- It couples the AuthN identity anchor to tenant mail infrastructure (many Indian hospitals run legacy Exchange/government mail that doesn't support RFC 5233 sub-addressing)
- Changing `ba_users.email` later (when a user gets their own email) triggers better-auth's internal email verification flows, session invalidations, and account linking logic — unnecessary mutation of the identity anchor
- It creates social engineering risk: password reset emails to an admin inbox allow anyone with inbox access to hijack delegated accounts

The synthetic `@auth.internal` domain is non-routable. `ba_users.email` is an internal key that never changes, never leaks to business logic, and never depends on external infrastructure. Real emails, recovery routes, and contact information belong exclusively in platform-owned tables.

**Supported precedent in better-auth:**
- The **phone-number plugin** uses `getTempEmail()` for phone-only users
- The **anonymous plugin** uses `getAnonUserEmail()` for anonymous users
- Source code contains `TODO(#9124)` acknowledging email should be nullable in v2
- GitHub issues #2059, #2215, #2402 confirm the community demand

### 2.3 Separation of identity from contact and recovery

| Concern | Where it lives | Mutability |
|---------|---------------|------------|
| AuthN identity anchor | `ba_users.email` = `{username}@auth.internal` | Never changes (username is immutable) |
| Business contact email | `users.email` (nullable, non-unique) | User or admin can update freely |
| Recovery email route | `delegated_recovery_routes` table or `users.email` | Platform-managed, per recovery tier |
| Phone contact/auth | `ba_users.phoneNumber` (via phone plugin) | User-updatable with OTP verification |

This separation means updating a user's real email, changing their recovery route, or migrating their phone number are all simple platform-owned CRUD operations that never touch the better-auth identity anchor.

### 2.4 JWT payload

Synthetic email is deliberately excluded from JWT claims. The `definePayload` callback on the JWT plugin constructs tokens with only platform-relevant claims:

```typescript
jwt({
  jwt: {
    definePayload: async ({ user, session }) => ({
      sub: user.id,
      // iq_tenant_id, roles, department, org_id injected by token issuance layer
      // email deliberately excluded — synthetic value has no business meaning
    })
  }
})
```

### 2.5 Schema delta for `ba_users`

```
ba_users (better-auth managed):
  username: TEXT, NOT NULL, UNIQUE  -- org-assigned login credential (NEW, via username plugin)
  email:    TEXT, NOT NULL, UNIQUE  -- synthetic: "{username}@auth.internal" (UNCHANGED constraint)
  name:     TEXT, NOT NULL          -- unchanged
```

### 2.6 `ba_users` vs `users` normalization rationale

The overlap between `ba_users` and `users` is intentional denormalization across domain boundaries:

| Aspect | `ba_users` (Layer 1) | `users` (Layer 3) |
|--------|---------------------|-------------------|
| Owner | better-auth library | Platform code |
| Purpose | Credential storage, session tracking | Business context, roles, department |
| Scope | Spans tenants (one row per human) | Per-tenant (one row per tenant per human) |
| Change cadence | Login, password change, MFA enrollment | Admin actions, SCIM sync, transfers |
| Distribution | By `id` | By `iq_tenant_id` |

They are not duplicates — they serve different layers with different lifecycles.

---

## 3. Recovery Tier Model

### 3.1 Decision

Recovery (how a user regains access) is a **first-class platform workflow**, not a generic better-auth email reset. Different users have different recovery options based on their identity assurance tier. The tier is stored on the platform `users` table and governs which recovery paths are available.

### 3.2 Tier definitions

| Tier | Who | `ba_users.email` | Login | Primary Recovery | Explicitly Disabled |
|------|-----|------------------|-------|-----------------|---------------------|
| `standard` | Staff with own verified email | `{username}@auth.internal` | Username+pwd | Self-serve email reset via `users.email` | — |
| `delegated` | Staff without email, org has verified admin mailbox | `{username}@auth.internal` | Username+pwd | Admin-initiated reset, delegated email route, magic link | Self-serve email reset |
| `phone_recovery` | Staff with verified unique phone | `{username}@auth.internal` | Username+pwd, Phone OTP | Phone OTP reset, admin reset | Self-serve email reset |
| `admin_only` | Staff without email, phone, or reliable mail route | `{username}@auth.internal` | Username+pwd | Admin direct password set, in-person | Email reset, magic link |
| `federated` | Staff bound to external IdP | SSO-created or synthetic | SSO | IdP-managed | Local reset (unless break-glass) |

### 3.3 Recovery routing logic

The platform intercepts better-auth's `sendResetPassword` callback and routes based on the user's recovery tier:

```typescript
emailAndPassword: {
  sendResetPassword: async ({ user, url, token }, request) => {
    const platformUser = await findPlatformUserByAuthId(user.id);

    switch (platformUser.recovery_tier) {
      case 'standard':
        await sendEmail(platformUser.email, "Password Reset", url);
        break;
      case 'delegated': {
        const route = await getDelegatedRecoveryRoute(platformUser);
        if (route?.verified) {
          await sendEmail(route.address, `Password reset for ${platformUser.fullName}`, url);
        }
        await notifyAdminOfRecoveryRequest(platformUser);
        break;
      }
      case 'phone_recovery':
        // Suppress email — user should use phone OTP reset flow
        break;
      case 'admin_only':
        // Suppress — admin must use setUserPassword directly
        break;
      case 'federated':
        // Suppress — redirect to IdP recovery
        break;
    }
  },
  revokeSessionsOnPasswordReset: true, // CRITICAL: off by default in better-auth
}
```

### 3.4 Delegated recovery routes

For `delegated` tier users, the platform maintains a `delegated_recovery_routes` table:

| Column | Purpose |
|--------|---------|
| `iq_tenant_id` | Tenant context |
| `user_id` | Target user |
| `base_email_id` | FK to the admin/org base mailbox record |
| `address` | Full sub-addressed email (e.g., `it.admin+emp042@hospital.com`) |
| `verified` | Whether deliverability has been tested |
| `last_delivery_check` | Timestamp of last probe |

**Operational rules:**
- The `+N` suffix must use a stable identifier (employee_id, staff code) — never CSV row index
- Deliverability is tested at tenant onboarding: a probe email to `base+hims-test@domain` must succeed before delegated routes are enabled
- Base emails must be role-based functional accounts (`it.admin@hospital.com`), not personal addresses
- Base email migration triggers a batch update of all associated delegated routes with full audit trail

### 3.5 Admin recovery workflows

Three concrete flows, all gated by Cerbos authorization and admin step-up authentication:

**Flow A — Admin direct password set (no email needed):**

1. Admin opens User Management → finds user → clicks "Reset Password"
2. Cerbos authorizes `admin:user:reset_password` for this tenant/scope
3. Admin re-authenticates (step-up verification)
4. Platform calls `auth.api.setUserPassword({ body: { userId, newPassword } })`
5. Platform calls `auth.api.revokeUserSessions({ body: { userId } })`
6. Platform sets `users.must_change_password = true`
7. `permission_change_audit` records actor, reason, channel, target
8. Admin tells user the temp password (in person, phone, printed slip)
9. User's next login forces password change before clinical access

**Flow B — Admin-generated magic link:**

1. Admin opens User Management → finds user → clicks "Generate Login Link"
2. Cerbos + step-up (same as Flow A)
3. Platform calls `auth.api.signInMagicLink` server-side with `metadata: { adminGenerated: true }`
4. `sendMagicLink` callback intercepts the URL instead of emailing:
   ```typescript
   magicLink({
     sendMagicLink: async ({ email, token, url, metadata }, ctx) => {
       if (metadata?.adminGenerated) {
         await storeRecoveryLink(metadata.targetUserId, url, metadata.adminId);
         return; // Do NOT send email
       }
       // Normal path for standard-tier users
       const platformUser = await findByAuthEmail(email);
       if (platformUser?.email) await sendEmail(platformUser.email, "Login Link", url);
     },
     expiresIn: 300,      // 5 minutes max
     allowedAttempts: 1,   // Single-use
     disableSignUp: true,  // Only existing users
   })
   ```
5. Admin UI shows the link as a QR code (shown once, not persisted in UI)
6. Admin delivers via QR scan, WhatsApp, SMS, or printed slip
7. User opens link → authenticated → lands in "recover account" flow (not directly into clinical modules)
8. User sets new password

**Flow C — Delegated email route (for `delegated` tier):**

1. User clicks "Forgot Password" on login page, enters username
2. Platform looks up recovery tier → `delegated`
3. UI shows: "Your account uses delegated recovery. A reset link has been sent to your organization's administrator."
4. Platform routes reset through `delegated_recovery_routes` (see §3.4)
5. Admin receives email, delivers reset link to user
6. User resets password via standard better-auth reset flow

---

## 4. Phone Number Auth

### 4.1 Integration with username auth

Phone number auth is supplementary, not primary. A user can have all three identifiers:

```
ba_users.username    = "sharma.cardiology"       (primary login)
ba_users.email       = "sharma.cardiology@auth.internal"  (synthetic, internal)
ba_users.phoneNumber = "+919876543210"            (supplementary auth + recovery)
```

They can sign in via `signIn.username({ username, password })` or `signIn.phoneNumber({ phoneNumber, password })`, both resolving to the same credential account.

### 4.2 Phone-only registration flow

For users who start with phone only (no email at all):

1. OTP sent to phone → user verifies
2. `signUpOnVerification.getTempEmail` returns `{username}@auth.internal` (NOT a phone-based synthetic). The platform assigns the username *before* the `getTempEmail` callback fires, ensuring the `ba_users.email` value follows the same pattern as all other users. This preserves Security Invariant §15.1.
3. Platform creates `users` record
4. **Critical:** `setPassword` must be called separately — `signUpOnVerification` creates the user record but NOT the credential account (the password hash). Without this, `signIn.username` will fail with "Credential account not found."
5. User can now log in via username + password or phone + OTP

### 4.3 Shared phone guard

In rural India, family members often share a single phone. Phone-based login becomes ambiguous if two users share a number.

**Rule:** Phone number can be used for auth only when:
- The phone is verified via OTP
- The phone is unique among auth-enabled phone users in the same identity scope
- `users.phone_auth_enabled = true` (platform-controlled flag)

If a phone is shared, it's stored as contact data only — not enabled for login or OTP recovery.

---

## 5. BFF Token Handler Pattern

### 5.1 Decision

The BFF's role expands from "signature verification only" (ADR-0015) to "signature verification + session lifecycle management" via the Token Handler pattern.

### 5.2 How it works

1. User authenticates (username + password, or federated IdP redirect)
2. BFF receives the authentication response from better-auth
3. BFF stores the **refresh token** in an HttpOnly, SameSite=Strict, Secure cookie
4. BFF issues a **short-lived JWT** (1-2 minute lifetime) to the SPA
5. SPA attaches the JWT to API requests as a Bearer token
6. When the JWT expires, SPA calls the BFF's refresh endpoint
7. BFF uses the stored refresh token to obtain a new JWT from better-auth
8. BFF returns the new JWT to the SPA — seamless, no re-authentication

### 5.3 What this solves

| Problem | How Token Handler solves it |
|---------|---------------------------|
| **JWT revocation gap** (Gemini blind spot #1) | Token lifetime is 1-2 minutes. Maximum exposure window after revocation = token lifetime. No distributed blocklist needed. |
| **Long clinical sessions** (HLD-04 §11.2 open question) | Refresh is seamless and invisible to the user. A doctor can work for 12 hours without interruption. |
| **XSS token theft** | Refresh token is in HttpOnly cookie — JavaScript cannot read it. Short-lived JWT limits damage if stolen. |

### 5.4 What stays the same

- **Zero-trust per-module verification** is preserved. Modules still verify JWTs independently against JWKS. They don't know or care about the Token Handler — they see a standard JWT.
- **Inbound Gateway** (Integration Hub) is unaffected. It's a separate ingress plane with its own auth model (API keys, mTLS, OAuth client credentials). The Token Handler is for the SPA-facing BFF only.
- **Service-to-service auth** is unaffected. Modules use service-account JWTs directly.

### 5.5 Immediate revocation path

For security incidents (compromised credentials), the flow is:

1. Admin suspends user → `users.status = 'suspended'`
2. Admin invalidates sessions → `auth.api.revokeUserSessions({ body: { userId } })` (NOT direct SQL against `ba_sessions`)
3. BFF's next refresh attempt fails (no valid session) → user is forced to re-login → login blocked by suspended status
4. Maximum exposure window: 1-2 minutes (current JWT lifetime)

### 5.6 HLD-04 §1.5 token lifetime change

| Claim | Current | Revised |
|-------|---------|---------|
| `exp` | 15 minutes default | 1-2 minutes (Token Handler managed) |
| `jti` | Not present | **Added** — unique token ID for audit correlation |

### 5.7 ADR-0015 update scope

ADR-0015 ("BFF for signature verification only") must be updated:
- BFF role expands to include session lifecycle (refresh token storage, JWT reissuance)
- The "what the BFF does not do" section remains accurate — BFF still does NOT perform fine-grained authorization, does NOT run Cerbos
- The zero-trust rationale is strengthened, not weakened: modules see shorter-lived tokens, which is strictly better for security

---

## 6. JWKS Key Management

### 6.1 Decision

JWKS key management is handled by better-auth's **JWT plugin** with DB-persisted keys. This is a definitive architectural decision, not deferred to implementation.

### 6.2 How it works

The JWT plugin manages a `jwks` table in the database:

| Column | Type | Purpose |
|--------|------|---------|
| `id` / `kid` | TEXT | Key identifier, included in JWT header for key selection |
| `alg` | TEXT | Algorithm (EdDSA default, ES256, RS256, PS256 supported) |
| `publicKey` | TEXT | PEM-encoded public key — served via JWKS endpoint |
| `privateKey` | TEXT | PEM-encoded private key — encrypted at rest with AES-256-GCM by default |
| `createdAt` | TIMESTAMPTZ | Key creation timestamp |
| `expiresAt` | TIMESTAMPTZ | Key expiration — after this, key is not used for signing |

### 6.3 Key rotation

**Key rotation is disabled by default.** The `jwks` table exists but rotation does not happen unless explicitly configured. The platform MUST set:

- `rotationInterval`: How often a new key is generated (production value TBD, likely 7-14 days)
- `gracePeriod`: How long old keys remain valid for verification after rotation (likely 2x rotation interval)

During grace period, both old and new keys are in the JWKS response. Modules verifying JWTs match the `kid` header to the correct key. After grace period, old keys are removed from JWKS.

### 6.4 Required configuration

```typescript
jwt({
  jwt: {
    expirationTime: "2m",
    // disablePrivateKeyEncryption: false,  ← default, DO NOT set to true
    rotationInterval: "7d",    // MUST be explicitly set
    gracePeriod: "14d",        // MUST be explicitly set
    jwksPath: "/.well-known/jwks.json",
  }
})
```

### 6.5 JWKS endpoint

Published at `/.well-known/jwks.json` (configurable path). Any service can fetch public keys for JWT verification. Modules cache the JWKS with a TTL aligned to the rotation schedule.

### 6.6 Pod-restart safety

Keys are in the database, not in memory. Pod restarts, rolling deployments, and horizontal scaling all work — every instance reads the same keys from the DB.

### 6.7 KMS integration path

The JWT plugin supports a custom `sign` function for delegating signing to external KMS (Azure Key Vault, AWS KMS, HashiCorp Vault). This is a future enhancement, not MVP.

---

## 7. OAuth 2.1 Provider Plugin

### 7.1 Decision

The platform uses better-auth's **OAuth 2.1 Provider plugin** (not the deprecated OIDC Provider plugin) when the platform acts as an identity source for third-party systems.

### 7.2 What it provides

- Publishes `/.well-known/openid-configuration` discovery document
- Publishes JWKS endpoint (integrated with JWT plugin)
- Authorization endpoint with PKCE (mandatory per OAuth 2.1)
- Token endpoint with `authorization_code`, `refresh_token`, `client_credentials` grant types
- Token revocation (RFC 7009)
- Token introspection (RFC 7662)
- Dynamic client registration (RFC 7591)
- Rate limiting per endpoint

**Known limitation:** Dynamic client registration does not yet support `jwks` and `jwks_uri` parameters. Clients needing private-key JWT authentication must use alternative mechanisms. Not a blocker for MVP.

### 7.3 Custom claims injection

```typescript
oauthProvider({
  customAccessTokenClaims: async (user, token) => ({
    iq_tenant_id: selectedTenant.id,
    roles: userRoles,
    department: primaryDepartment,
    org_id: user.org_id,
  }),
  customUserInfoClaims: async (user) => ({
    email: await getRealEmail(user.id), // Real email from users.email, NOT synthetic
  })
})
```

### 7.4 When this is used

- Third-party clinical systems that need SSO into the platform
- Integration Hub partners that authenticate via OAuth
- Future: mobile apps using authorization code + PKCE flow

---

## 8. Two-Tier Federation Strategy

### 8.1 Decision

Federation to external IdPs uses two tiers. The former three-tier model (where Tier 2 = hospital deploys own broker) is eliminated because waiting 3-6 months for a hospital to deploy infrastructure kills onboarding velocity.

### 8.2 Tier 1 — Direct federation (modern IdPs)

For hospitals running modern IdPs (Microsoft Entra ID, Okta, PingIdentity, Auth0):

- better-auth SSO plugin for OIDC federation
- better-auth SAML plugin for SAML 2.0 (SP-initiated and IdP-initiated)
- Configuration per tenant via `idp_configurations` table
- JIT provisioning creates shadow records on first login

### 8.3 Tier 2 — Shared Keycloak broker (legacy IdPs)

For hospitals with legacy/non-standard identity systems that cannot speak OIDC or modern SAML:

**Architecture:**
- Shared Keycloak cluster managed by the platform team
- One **realm** per legacy hospital (full logical isolation)
- Each realm connects to that hospital's legacy IdP (LDAP, legacy SAML, custom protocols)
- Each realm exposes its own OIDC endpoint
- better-auth is configured with the realm's OIDC endpoint as a federated IdP for that tenant

**Operational characteristics:**
- Multi-realm: full isolation between hospitals, independent IdP connections per realm
- ~2GB heap for 20 realms (measured)
- Runtime realm CRUD via Keycloak Admin API (no restart needed for onboarding)
- Scaling ceiling: 100-200 realms safely on a single cluster
- Only adds ~200ms at login redirect; zero impact on API requests (JWKS verification is local)

### 8.4 Federation data flow

```
Tier 1 (Modern):  User → Hospital Entra/Okta → better-auth OIDC/SAML plugin → JWT
Tier 2 (Legacy):  User → Hospital legacy IdP → Keycloak realm (OIDC bridge) → better-auth OIDC plugin → JWT
```

In both cases, better-auth issues the final JWT. Downstream modules see no difference.

---

## 9. Federation Account Linking

### 9.1 The problem

When a hospital that already has 1,000 local users deploys an IdP (e.g., Entra ID), those existing users arrive via SSO with a different email (`sharma@hospital.onmicrosoft.com`) than their better-auth identity (`sharma.cardiology@auth.internal`). better-auth's automatic account linking works by **same email under verified domain** — it will NOT link these accounts and will instead create a duplicate user.

This is the largest unsolved risk identified by adversarial review. We must not rely on undocumented `mapProfileToUser` semantics to force linking.

### 9.2 Explicit linking workflow

Federation rollout at an existing tenant follows this protocol:

1. **Tenant admin configures IdP** and verifies domain/provider
2. **Disable implicit SSO sign-up** until matching is complete
3. **Platform imports/previews IdP user roster** by stable subject and claims
4. **Admin matches IdP users to existing platform users** by employee_id, HR-id, or manual review — never by email alone
5. **Platform records explicit links** in `auth_identity_links`:
   ```
   auth_identity_links:
     iq_tenant_id, user_id, auth_user_id, provider_id, issuer,
     subject, claim_snapshot, linked_by, linked_at
   ```
6. **Test first login** for matched users in sandbox/staging
7. **Only then enable JIT provisioning** for unmatched NEW users, with duplicate detection

### 9.3 SSO callback behavior

On SSO callback, the platform's `provisionUser` hook:
1. Looks up `auth_identity_links` by `(provider_id, issuer, subject)`
2. If found → link to existing user, update claims snapshot
3. If not found AND implicit sign-up is enabled → JIT provision with duplicate detection (check employee_id, name similarity)
4. If not found AND implicit sign-up is disabled → reject with "Contact your administrator to link your account"
5. **Never silently create a second clinical user for the same employee**

### 9.4 POC requirement

**Before finalizing federation migration semantics,** a proof of concept must verify:
- SSO `provisionUser` hook can reliably link to an existing `ba_users` record with a synthetic email
- Session and token behavior after linking is correct
- The platform-controlled linking workflow works end-to-end

This POC is a prerequisite for the federation section of the LLD.

---

## 10. AuthN Provider Replaceability

### 10.1 Design principle

The AuthN layer must be replaceable without touching modules, authorization, or business logic. ADR-0003 established the `IdentityProvider` interface for this purpose. This spec reinforces and maps the replaceability boundary.

### 10.2 What is inside the replaceable boundary (better-auth specific)

- `ba_*` tables (managed by better-auth library)
- `jwks` table (managed by JWT plugin)
- Plugin configuration (username, JWT, phone, magic link, admin, SSO, SAML, OAuth Provider)
- better-auth's internal APIs (`auth.api.*`)
- Cookie/session format and storage
- JWKS key format and signing implementation

### 10.3 What is outside (platform-owned, provider-agnostic)

- `users` table and all Layer 3 AuthZ data (roles, capabilities, delegations, clearances)
- Recovery tier model and `delegated_recovery_routes`
- `auth_identity_links` (federation linking)
- PEP enrichment pattern
- Cerbos policies and sidecar deployment
- JWT claim contract (modules verify claims, not the issuer implementation)
- BFF Token Handler pattern (works with any JWT issuer)
- `permission_change_audit`

### 10.4 The `IdentityProvider` interface contract

All modules interact with AuthN through this interface, never through better-auth directly:

```typescript
interface IdentityProvider {
  verifyToken(jwt: string): Promise<TokenClaims>;
  getJWKS(): Promise<JWKSet>;
  issueToken(userId: string, tenantId: string): Promise<string>;
  refreshToken(refreshToken: string): Promise<string>;
  revokeSession(userId: string): Promise<void>;
  revokeSessions(userId: string): Promise<void>;
  setPassword(userId: string, password: string): Promise<void>;
  createUser(params: CreateUserParams): Promise<AuthUser>;
}
```

The current implementation is `BetterAuthIdentityProvider`. If the platform switches to Keycloak:
1. Implement `KeycloakIdentityProvider` against the same interface
2. Migrate user credentials (username, password hash) to Keycloak's user store
3. Update JWKS endpoint to point at Keycloak's JWKS
4. Update `users.auth_user_id` references to point at Keycloak user IDs
5. All platform-owned data (recovery tiers, delegated routes, identity links, roles, capabilities, delegations, clearances) stays unchanged
6. PEP, Cerbos, BFF Token Handler — all unchanged (they verify JWTs against JWKS, don't care who issued them)
7. Synthetic `@auth.internal` emails become irrelevant — Keycloak manages its own user model

### 10.5 What makes replaceability practical

The synthetic email pattern is load-bearing for replaceability. Because `ba_users.email` is a meaningless internal key:
- No business logic depends on its value
- No module ever sees it
- No user ever interacts with it
- Migrating away from better-auth means discarding it, not migrating it

If we had used real sub-addressed emails in `ba_users.email`, migration would require preserving those values in the new provider — an unnecessary coupling.

---

## 11. Updated Login Flow

### 11.1 Username + password (direct auth)

1. User enters **username** + password on login page
2. better-auth authenticates via username plugin (email is never shown or entered)
3. User Management queries `users WHERE auth_user_id = ? AND status = 'active'`
4. If multiple tenants: frontend shows tenant picker
5. User selects tenant
6. BFF receives auth response, stores refresh token in HttpOnly cookie
7. BFF issues 1-2 min JWT with selected tenant context (`iq_tenant_id`, `roles`, `department`, `org_id`, `jti`)
8. SPA stores JWT, attaches to API requests

### 11.2 Federated login (Tier 1)

1. User clicks "Sign in with [Hospital IdP]" on login page
2. Redirect to external IdP (Entra, Okta, etc.)
3. IdP authenticates, redirects back to better-auth callback
4. Platform `provisionUser` hook checks `auth_identity_links`, performs JIT provisioning if needed
5. Steps 3-8 from §11.1

### 11.3 Federated login (Tier 2 — legacy)

1. User clicks "Sign in with [Hospital IdP]" on login page
2. Redirect to Keycloak realm for that hospital
3. Keycloak realm redirects to legacy IdP
4. Legacy IdP authenticates, redirects back to Keycloak realm
5. Keycloak realm issues OIDC token, redirects back to better-auth callback
6. Steps 4-8 from §11.2

### 11.4 Tenant switch (no re-auth)

1. User clicks "Switch Organization" in UI
2. Frontend calls tenant-switch endpoint with target `iq_tenant_id`
3. BFF requests new JWT from better-auth with updated tenant context
4. BFF returns new JWT — no re-authentication, no new refresh token needed

---

## 12. HLD-04 Open Questions — Closed

### 12.1 §11.1 — Cerbos policy storage

**Decision:** Git + bundle distribution. Policies committed to Git, compiled and tested in CI (`cerbos compile` + `cerbos test`), distributed to sidecars as bundles. Admin API not enabled unless concrete evidence shows deployment cycle is too slow.

### 12.2 §11.2 — Token lifetime and refresh strategy

**Decision:** BFF Token Handler pattern. 1-2 minute token lifetime with seamless refresh via HttpOnly cookie-stored refresh token. See §5 of this spec.

---

## 13. better-auth Plugin Stack

| Plugin | Purpose | Status |
|--------|---------|--------|
| **Username** | Username-based sign-in | Required — primary login method |
| **JWT** | JWKS key management, custom token claims, DB-persisted keys | Required — core infrastructure |
| **Admin** | User provisioning, password set, session revocation, ban/unban | Required — admin recovery flows |
| **Magic Link** | Admin-generated login links, passwordless recovery | Required — recovery Flow B |
| **Phone Number** | Phone OTP auth, phone-based recovery | Required — supplementary auth |
| **OAuth 2.1 Provider** | Platform as IdP for third parties | Required — replaces deprecated OIDC Provider |
| **SSO** | OIDC federation to external IdPs (Tier 1) | Required — Entra, Okta, etc. |
| **SAML** | SAML 2.0 federation (Tier 1) | Required — government/enterprise IdPs |
| **Two Factor** | TOTP-based MFA | Optional — enabled per tenant, not MVP |
| **Generic OAuth** | Custom OAuth2/OIDC providers | As needed — non-standard IdPs |
| **Organization** | Multi-org user management | **Rejected** — see §16 |
| **Sentinel** | Email normalization, disposable domain blocking | **Forbidden** — strips `+` suffixes, incompatible with sub-addressing in delegated recovery routes |

---

## 14. Required better-auth Configuration

These settings MUST be explicitly configured — relying on defaults is unsafe:

| Setting | Required Value | Why |
|---------|---------------|-----|
| `revokeSessionsOnPasswordReset` | `true` | Off by default. Without it, old sessions survive password resets. |
| `jwt.rotationInterval` | Set explicitly (e.g., `"7d"`) | Key rotation is disabled by default. |
| `jwt.gracePeriod` | Set explicitly (e.g., `"14d"`) | Without it, old keys vanish instantly on rotation. |
| `jwt.disablePrivateKeyEncryption` | Do NOT set (leave default) | Private keys encrypted with AES-256-GCM by default. |
| `jwt.expirationTime` | `"2m"` or less | Token Handler pattern requires short-lived tokens. |
| `magicLink.disableSignUp` | `true` (for admin-generated links) | Prevents unknown users from creating accounts via magic link. |
| `magicLink.allowedAttempts` | `1` | Magic links must be single-use. |
| `username.isUsernameAvailable` | Disable or wrap behind admin-only endpoint | Prevents username enumeration by unauthenticated users. |
| `user.changeEmail.enabled` | `true` | Disabled by default. Needed for email upgrade path. |

---

## 15. Security Invariants

These must hold after the revision:

1. **No real email in `ba_users`.** All `ba_users.email` values match the pattern `{username}@auth.internal`. Real emails exist only on `users.email`.
2. **No synthetic email in JWTs, logs, or UI.** The `definePayload` callback excludes email. The synthetic value must never leak to clients, downstream services, or end-user-visible audit logs.
3. **Refresh tokens never in JavaScript.** The refresh token is in an HttpOnly cookie. The SPA only ever sees the short-lived JWT.
4. **Module independence from BFF.** Every module verifies JWTs independently. If the BFF is down, existing JWTs remain valid until expiry.
5. **Token lifetime <= 2 minutes.** This is the maximum acceptable revocation window given the Token Handler pattern.
6. **JWKS keys in DB, encrypted at rest.** Keys must survive pod restarts. Private key encryption must not be disabled.
7. **Key rotation explicitly configured.** `rotationInterval` and `gracePeriod` must be set — no reliance on defaults.
8. **Sessions revoked on password reset.** `revokeSessionsOnPasswordReset: true` is mandatory.
9. **Keycloak realms are isolated.** One hospital's realm configuration cannot affect another hospital's authentication.
10. **No direct SQL against better-auth tables** for session revocation, password reset, or user management. Use `auth.api.*` methods.
11. **Sentinel / email normalization plugins forbidden.** Any plugin that strips `+` suffixes or normalizes email must never be enabled.
12. **Federation never silently creates duplicate clinical users.** SSO callbacks must check `auth_identity_links` and reject ambiguous matches.
13. **Recovery is authorized.** Admin-initiated password resets, magic links, and 2FA resets require Cerbos authorization, step-up auth, and audit.

---

## 16. Organization Plugin — Evaluated and Rejected

better-auth's **Organization plugin** was evaluated and rejected for this platform:

1. **Citus conflict:** The Organization plugin's `member` table is not distributed by `iq_tenant_id`.
2. **Cerbos overlap:** The plugin provides its own role/permission model that conflicts with the Cerbos-based capability model.
3. **Missing features:** Does not support capabilities, delegations, clearances, or ward-level scoping.

---

## 17. Artifacts to Update

### 17.1 LLD — `01-schema-design.md`

| Section | Change |
|---------|--------|
| §8 JWT claims | Change `exp` default from 15 min to 1-2 min. Add `jti` claim. |
| §9 better-auth tables | Add `username` column. Document synthetic email as identity anchor (not contact). Note username plugin as required. |
| New §9.1 | **Synthetic email pattern** — rationale, adversarial review decision, separation from recovery, `getTempEmail` precedent. |
| New §15 | **Recovery tier model** — tier definitions, recovery routing logic, delegated recovery routes, admin workflows. |
| New §16 | **BFF Token Handler interaction** — session lifecycle, refresh token storage, revocation window. |
| New §17 | **JWKS key management** — `jwks` table, rotation, encryption, pod-restart safety. |
| New §18 | **Phone number auth** — integration, shared phone guard, credential account footgun. |

### 17.2 LLD — `schema-reference.json`

| Entity | Change |
|--------|--------|
| `ba_users` | Add `username` column (TEXT, NOT NULL, UNIQUE). Update `email` description: synthetic identity anchor. |
| New: `jwks` | JWT plugin key storage table. Mark as better-auth managed. |
| `users` | Add `recovery_tier`, `phone_auth_enabled`, `must_change_password` columns. |
| New: `delegated_recovery_routes` | Tenant/user → admin mailbox route mapping. |
| New: `auth_identity_links` | Explicit IdP-subject → platform-user mapping. |

### 17.3 LLD — `user-management.erd.json`

| Change |
|--------|
| Add `username` column to `ba_users` entity |
| Add `jwks` entity (blue = better-auth managed) |
| Add `delegated_recovery_routes` entity (green = distributed) |
| Add `auth_identity_links` entity (green = distributed) |
| Add new columns to `users` entity |

### 17.4 LLD — `02-scenarios.md`

**Existing scenario updates:**

| Scenario | Change |
|----------|--------|
| §1 Tenant onboarding | Update `ba_users` to show `username` + synthetic email |
| §2 Staff onboarding | Show `ba_users.email = 'sharma.cardiology@auth.internal'` |
| §3 Multi-tenant login | Username-based login; Token Handler cookie/JWT split |
| §13 Security incident | Revocation via `auth.api.revokeUserSessions`, 1-2 min window |

**New scenarios (from adversarial review):**

| New § | Scenario |
|-------|----------|
| §16 | **Token Handler refresh** — seamless refresh during long clinical session |
| §17 | **Key rotation** — JWKS rotation, grace period, module cache invalidation |
| §18 | **Standard-tier password reset** — user with own email self-serves |
| §19 | **Delegated-tier password reset** — admin-initiated, delegated email route |
| §20 | **Admin-only tier recovery** — direct password set, in-person handoff |
| §21 | **Magic link recovery** — admin generates link, delivers via QR/SMS |
| §22 | **Phone-only user sets up username/password** — credential account creation |
| §23 | **Shared phone number** — contact-only, no phone auth |
| §24 | **Federation after 1,000 local users** — explicit linking, duplicate prevention |
| §25 | **Federated user email differs from synthetic** — link by subject, not email |
| §26 | **SCIM pushes real email for delegated user** — recovery tier upgrade |
| §27 | **Admin mailbox changes** — delegated route migration with audit |
| §28 | **Admin mailbox compromised** — disable delegated recovery, rotate, revoke |
| §29 | **2FA recovery for delegated user** — backup codes on screen only, never emailed |
| §30 | **Shared workstation** — fast user switching, re-auth before clinical action |
| §31 | **BFF down during clinical session** — existing JWTs expire, operational behavior |
| §32 | **Training/sandbox environment** — prevent unsafe credential practices from normalizing |

### 17.5 HLD — `04-authn-authz-flow.md`

| Section | Change |
|---------|--------|
| §1.2 Federation | Two-tier strategy + account linking workflow summary |
| §1.5 Token format | Lifetime 1-2 min. Add `jti`, `org_id`. |
| §1.6 JWKS verification | JWT plugin, DB-persisted keys, rotation, encryption, grace period. |
| §2 User-facing auth flow | Username-based, Token Handler, BFF role expanded. |
| §7 BFF role | Token Handler session management. Add §7.4. |
| §11 Open questions | Replace `[OPEN]` markers with decisions. |
| New §13 | **OAuth 2.1 Provider** — platform as IdP for third parties. |
| New §14 | **Recovery tier model** — summary with cross-reference to LLD. |

### 17.6 ADR — `0003-authn-better-auth-identity-adapter.md`

| Section | Change |
|---------|--------|
| Decision outcome | Username plugin, synthetic email, two-tier federation, recovery tier model, replaceability boundary. |
| Federation | Tier 1 (direct) + Tier 2 (Keycloak broker). Account linking workflow. |
| OIDC Provider | Replace with OAuth 2.1 Provider (OIDC deprecated). |
| Follow-up actions | Close "token refresh" item. Add: implement recovery tier model, federation POC, required config checklist. |

### 17.7 ADR — `0015-bff-role-zero-trust.md`

| Section | Change |
|---------|--------|
| Decision outcome | "Signature verification + session lifecycle management (Token Handler)." |
| Consequences (positive) | 1-2 min tokens reduce revocation window. Refresh token never in JS. |
| Consequences (negative) | BFF is stateful (cookie store). BFF outage blocks new JWT issuance. |

### 17.8 New dev-doubt — `dev-doubts/03-analysis.md`

Six analysis sections:

1. **ba_users/users normalization** — domain boundary, change cadence, Citus distribution
2. **Synthetic email vs sub-addressing** — why synthetic wins for the identity anchor (adversarial review reasoning: infrastructure independence, mutation avoidance, social engineering risk)
3. **Token Handler vs distributed blocklist** — short-lived tokens + refresh denial
4. **Keycloak-as-broker vs direct legacy adapters** — onboarding velocity, operational burden
5. **Recovery as platform workflow** — why better-auth's reset callbacks are primitives, not solutions; recovery tier justification
6. **Federation linking risk** — why automatic same-email linking fails with synthetic emails; explicit linking workflow rationale

---

## 18. Out of Scope

- **2FA implementation details** — TOTP plugin config deferred to implementation. Schema accommodates it but not MVP.
- **KMS integration** — JWT plugin supports custom `sign` for KMS. Deferred to deployment planning.
- **SCIM endpoint implementation** — Schema supports sync state. Actual SCIM server is a separate work item.
- **Cerbos policy authoring** — This spec covers the data model that feeds Cerbos. Policy YAML is a separate LLD.
- **Frontend login UI** — Login form, tenant picker, tenant switch UX are frontend implementation concerns.

---

## 19. Prerequisites Before Final Approval

1. **Federation POC:** Verify SSO `provisionUser` hook can link a synthetic-email local user to an IdP account with a different email, end-to-end, before finalizing federation migration semantics.
2. **Phone signup credential gap:** Verify the `setPassword` flow after `signUpOnVerification` in a local test before writing the phone auth LLD scenario.

---

## 20. References

### better-auth plugins
- Username: https://better-auth.com/docs/plugins/username
- JWT: https://better-auth.com/docs/plugins/jwt
- Admin: https://better-auth.com/docs/plugins/admin
- Magic Link: https://better-auth.com/docs/plugins/magic-link
- Phone Number: https://better-auth.com/docs/plugins/phone-number
- OAuth 2.1 Provider: https://better-auth.com/docs/plugins/oauth-provider
- SSO: https://better-auth.com/docs/plugins/sso
- SAML: https://better-auth.com/docs/plugins/saml
- Two Factor: https://better-auth.com/docs/plugins/two-factor

### Source code references (synthetic email safety)
- `getTempEmail` in phone-number plugin: phone-number/index.ts
- `getAnonUserEmail` in anonymous plugin: anonymous/index.ts
- `TODO(#9124)` for nullable email: core schema definitions

### RFCs
- RFC 7009 — OAuth 2.0 Token Revocation
- RFC 7517 — JSON Web Key (JWK)
- RFC 7591 — OAuth 2.0 Dynamic Client Registration
- RFC 7662 — OAuth 2.0 Token Introspection
- OAuth 2.1 — draft-ietf-oauth-v2-1 (PKCE mandatory, implicit grant removed)

### GitHub issues
- #2059 — Email uniqueness constraint discussion
- #2215 — Make email optional
- #2402 — Non-unique email support

### Architecture documents (internal)
- HLD-04: Authentication and Authorization Flow
- ADR-0003: AuthN with better-auth and identity adapter pattern
- ADR-0015: BFF role and zero-trust between modules
- LLD User Management: 01-schema-design.md, 02-scenarios.md

### Adversarial reviews
- Agent T: `agent-reviews/t/authn-email-recovery-deliberation-review/review.md`
- Agent G: `agent-reviews/g/better-auth-authn-review.md`, `agent-reviews/g/synthetic-vs-subaddressing-verdict.md`
