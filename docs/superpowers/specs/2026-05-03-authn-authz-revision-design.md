# AuthN/AuthZ Architecture Revision — Design Spec

**Date:** 2026-05-03  
**Status:** Approved (design review complete, pending artifact updates)  
**Scope:** Revise the User Management LLD, HLD-04, ADR-0003, and ADR-0015 to incorporate username-primary identity, BFF Token Handler pattern, JWKS key management, OAuth 2.1 Provider plugin, two-tier federation, and the synthetic email workaround.

---

## 1. Problem Statement

Three inputs triggered this revision:

1. **Product requirement:** Email is NOT unique per user across tenants. Indian hospitals regularly have multiple staff sharing one email. Login must be via username, not email.
2. **Lead's notes:** `ba_users` and `users` normalization rationale needs documentation. Username+password is the default auth method.
3. **Gemini review of HLD-04:** Validated better-auth over Keycloak but flagged three blind spots — JWT revocation gap (§11.2 unanswered), legacy SAML scoping (no strategy for non-OIDC hospitals), and JWKS key rotation (deferred as "implementation detail" but architecturally load-bearing).

All three blind spots are now resolved. This spec documents every decision and lists the exact artifacts to update.

---

## 2. Identity Model — Username-Primary Login

### 2.1 Decision

`ba_users.username` becomes the primary login credential. Usernames are org-assigned and globally unique across the platform. Users authenticate with username + password; email is not used for login.

### 2.2 Synthetic email pattern

better-auth requires `ba_users.email` to be NOT NULL and UNIQUE (the username plugin still requires email at sign-up). Since real emails cannot be unique across tenants, we use synthetic values:

```
ba_users.email = "{username}@auth.internal"
```

This is an officially supported pattern in better-auth:
- The **phone-number plugin** uses `getTempEmail()` to generate synthetic emails for phone-only users
- The **anonymous plugin** uses `getAnonUserEmail()` for anonymous users
- Source code contains `TODO(#9124)` acknowledging email should be nullable in v2
- GitHub issues #2059, #2215, #2402 confirm the community demand for non-unique/nullable email

**Safety analysis:** Username-based sign-in never touches the email field. All email-sending functions in better-auth are callback-based — the platform controls what happens. The synthetic `@auth.internal` domain is non-routable, so no email will ever be sent to it accidentally.

### 2.3 Real email handling

Real user emails live on `users.email` (per-tenant, nullable, non-unique). Password reset, notifications, and all user-facing email operations use this field:

```typescript
emailAndPassword: {
  sendResetPassword: async ({ user, url, token }) => {
    const tenantUsers = await findUsersByAuthId(user.id);
    const realEmail = tenantUsers[0]?.email;
    if (realEmail) await sendEmail(realEmail, url, token);
  }
}
```

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

## 3. BFF Token Handler Pattern

### 3.1 Decision

The BFF's role expands from "signature verification only" (ADR-0015) to "signature verification + session lifecycle management" via the Token Handler pattern.

### 3.2 How it works

1. User authenticates (username + password, or federated IdP redirect)
2. BFF receives the authentication response from better-auth
3. BFF stores the **refresh token** in an HttpOnly, SameSite=Strict, Secure cookie
4. BFF issues a **short-lived JWT** (1-2 minute lifetime) to the SPA
5. SPA attaches the JWT to API requests as a Bearer token
6. When the JWT expires, SPA calls the BFF's refresh endpoint
7. BFF uses the stored refresh token to obtain a new JWT from better-auth
8. BFF returns the new JWT to the SPA — seamless, no re-authentication

### 3.3 What this solves

| Problem | How Token Handler solves it |
|---------|---------------------------|
| **JWT revocation gap** (Gemini blind spot #1) | Token lifetime is 1-2 minutes. Maximum exposure window after revocation = token lifetime. No distributed blocklist needed. |
| **Long clinical sessions** (HLD-04 §11.2 open question) | Refresh is seamless and invisible to the user. A doctor can work for 12 hours without interruption. |
| **XSS token theft** | Refresh token is in HttpOnly cookie — JavaScript cannot read it. Short-lived JWT limits damage if stolen. |

### 3.4 What stays the same

- **Zero-trust per-module verification** is preserved. Modules still verify JWTs independently against JWKS. They don't know or care about the Token Handler — they see a standard JWT.
- **Inbound Gateway** (Integration Hub) is unaffected. It's a separate ingress plane with its own auth model (API keys, mTLS, OAuth client credentials). The Token Handler is for the SPA-facing BFF only.
- **Service-to-service auth** is unaffected. Modules use service-account JWTs directly.

### 3.5 Immediate revocation path

For security incidents (compromised credentials), the flow is:

1. Admin suspends user → `users.status = 'suspended'`
2. Admin invalidates sessions → `DELETE FROM ba_sessions WHERE user_id = ?`
3. BFF's next refresh attempt fails (no valid session) → user is forced to re-login → login blocked by suspended status
4. Maximum exposure window: 1-2 minutes (current JWT lifetime)

This closes the gap identified in Scenario 13 (security incident), where the current design acknowledges a 15-minute window.

### 3.6 HLD-04 §1.5 token lifetime change

| Claim | Current | Revised |
|-------|---------|---------|
| `exp` | 15 minutes default | 1-2 minutes (Token Handler managed) |
| `jti` | Not present | **Added** — unique token ID for audit correlation |

### 3.7 ADR-0015 update scope

ADR-0015 ("BFF for signature verification only") must be updated:
- BFF role expands to include session lifecycle (refresh token storage, JWT reissuance)
- The "what the BFF does not do" section remains accurate — BFF still does NOT perform fine-grained authorization, does NOT run Cerbos
- The zero-trust rationale is strengthened, not weakened: modules see shorter-lived tokens, which is strictly better for security

---

## 4. JWKS Key Management

### 4.1 Decision

JWKS key management is handled by better-auth's **JWT plugin** with DB-persisted keys. This is a definitive architectural decision, not deferred to implementation.

### 4.2 How it works

The JWT plugin manages a `jwks` table in the database:

| Column | Type | Purpose |
|--------|------|---------|
| `id` / `kid` | TEXT | Key identifier, included in JWT header for key selection |
| `alg` | TEXT | Algorithm (EdDSA default, ES256, RS256, PS256 supported) |
| `publicKey` | TEXT | PEM-encoded public key — served via JWKS endpoint |
| `privateKey` | TEXT | PEM-encoded private key — used for signing (library-managed storage) |
| `createdAt` | TIMESTAMPTZ | Key creation timestamp |
| `expiresAt` | TIMESTAMPTZ | Key expiration — after this, key is not used for signing |

### 4.3 Key rotation

- `rotationInterval`: How often a new key is generated (configurable; production value TBD, likely 7-14 days)
- `gracePeriod`: How long old keys remain valid for verification after rotation (configurable; likely 2x rotation interval)
- During grace period, both old and new keys are in the JWKS response. Modules verifying JWTs match the `kid` header to the correct key.
- After grace period, old keys are removed from JWKS.

### 4.4 JWKS endpoint

Published at `/.well-known/jwks.json` (configurable path). Any service can fetch public keys for JWT verification. Modules cache the JWKS with a TTL aligned to the rotation schedule.

### 4.5 Pod-restart safety

Keys are in the database, not in memory. Pod restarts, rolling deployments, and horizontal scaling all work — every instance reads the same keys from the DB.

### 4.6 KMS integration path

The JWT plugin supports a custom `sign` function for delegating signing to external KMS (Azure Key Vault, AWS KMS, HashiCorp Vault). This is a future enhancement, not MVP:

```typescript
jwt({
  jwt: {
    // Future: delegate signing to KMS
    sign: async (payload, key) => kmsClient.sign(payload, key.kid),
  }
})
```

---

## 5. OAuth 2.1 Provider Plugin

### 5.1 Decision

The platform uses better-auth's **OAuth 2.1 Provider plugin** (not the deprecated OIDC Provider plugin) when the platform acts as an identity source for third-party systems.

### 5.2 What it provides

- Publishes `/.well-known/openid-configuration` discovery document
- Publishes JWKS endpoint (integrated with JWT plugin)
- Authorization endpoint with PKCE (mandatory per OAuth 2.1)
- Token endpoint with `authorization_code`, `refresh_token`, `client_credentials` grant types
- Token revocation (RFC 7009)
- Token introspection (RFC 7662)
- Dynamic client registration (RFC 7591)
- Rate limiting per endpoint

### 5.3 Custom claims injection

The `customAccessTokenClaims` callback injects platform-specific claims into tokens issued to third-party clients:

```typescript
oauthProvider({
  customAccessTokenClaims: async (user, token) => ({
    iq_tenant_id: selectedTenant.id,
    roles: userRoles,
    department: primaryDepartment,
    org_id: user.org_id,
  }),
  customUserInfoClaims: async (user) => ({
    email: await getRealEmail(user.id), // Real email, not synthetic
  })
})
```

### 5.4 When this is used

- Third-party clinical systems that need SSO into the platform
- Integration Hub partners that authenticate via OAuth
- Future: mobile apps using authorization code + PKCE flow

---

## 6. Two-Tier Federation Strategy

### 6.1 Decision

Federation to external IdPs uses two tiers. The former three-tier model (where Tier 2 = hospital deploys own broker) is eliminated because waiting 3-6 months for a hospital to deploy infrastructure kills onboarding velocity.

### 6.2 Tier 1 — Direct federation (modern IdPs)

For hospitals running modern IdPs (Microsoft Entra ID, Okta, PingIdentity, Auth0):

- better-auth SSO plugin for OIDC federation
- better-auth SAML plugin for SAML 2.0 (SP-initiated and IdP-initiated)
- Configuration per tenant via `idp_configurations` table
- JIT provisioning creates shadow records on first login

### 6.3 Tier 2 — Shared Keycloak broker (legacy IdPs)

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

**Why shared multi-realm, not one-Keycloak-per-hospital:**
- Onboarding a new legacy hospital = create a realm + configure IdP connection (hours, not months)
- Platform team operates one cluster, not N clusters
- Realms are fully isolated — one hospital's IdP misconfiguration cannot affect another

### 6.4 Federation data flow

```
Tier 1 (Modern):  User → Hospital Entra/Okta → better-auth OIDC/SAML plugin → JWT
Tier 2 (Legacy):  User → Hospital legacy IdP → Keycloak realm (OIDC bridge) → better-auth OIDC plugin → JWT
```

In both cases, better-auth issues the final JWT. Downstream modules see no difference.

---

## 7. Updated Login Flow

### 7.1 Username + password (direct auth)

1. User enters **username** + password on login page
2. better-auth authenticates via username plugin (email is never shown or entered)
3. User Management queries `users WHERE auth_user_id = ? AND status = 'active'`
4. If multiple tenants: frontend shows tenant picker
5. User selects tenant
6. BFF receives auth response, stores refresh token in HttpOnly cookie
7. BFF issues 1-2 min JWT with selected tenant context (`iq_tenant_id`, `roles`, `department`, `org_id`, `jti`)
8. SPA stores JWT, attaches to API requests

### 7.2 Federated login (Tier 1)

1. User clicks "Sign in with [Hospital IdP]" on login page
2. Redirect to external IdP (Entra, Okta, etc.)
3. IdP authenticates, redirects back to better-auth callback
4. JIT provisioning runs if no shadow record exists
5. Steps 3-8 from §7.1

### 7.3 Federated login (Tier 2 — legacy)

1. User clicks "Sign in with [Hospital IdP]" on login page
2. Redirect to Keycloak realm for that hospital
3. Keycloak realm redirects to legacy IdP
4. Legacy IdP authenticates, redirects back to Keycloak realm
5. Keycloak realm issues OIDC token, redirects back to better-auth callback
6. Steps 4-8 from §7.2

### 7.4 Tenant switch (no re-auth)

1. User clicks "Switch Organization" in UI
2. Frontend calls tenant-switch endpoint with target `iq_tenant_id`
3. BFF requests new JWT from better-auth with updated tenant context
4. BFF returns new JWT — no re-authentication, no new refresh token needed

---

## 8. HLD-04 Open Questions — Closed

### 8.1 §11.1 — Cerbos policy storage

**Decision:** Git + bundle distribution. Policies committed to Git, compiled and tested in CI (`cerbos compile` + `cerbos test`), distributed to sidecars as bundles. Admin API not enabled unless concrete evidence shows deployment cycle is too slow.

### 8.2 §11.2 — Token lifetime and refresh strategy

**Decision:** BFF Token Handler pattern. 1-2 minute token lifetime with seamless refresh via HttpOnly cookie-stored refresh token. See Section 3 of this spec.

---

## 9. Artifacts to Update

Each artifact below lists the specific sections/changes required. These are the deliverables for the implementation plan.

### 9.1 LLD — `01-schema-design.md`

| Section | Change |
|---------|--------|
| §8 JWT claims | Change `exp` default from 15 min to 1-2 min. Add `jti` claim. |
| §9 better-auth tables | Add `username` column to `ba_users` description. Document synthetic email pattern. Note username plugin as required plugin. |
| New §9.1 | **Synthetic email pattern** — rationale, safety analysis, `getTempEmail` precedent, JWT exclusion. |
| New §15 | **BFF Token Handler interaction** — how BFF manages session lifecycle, refresh token storage, impact on revocation window (cross-ref §13 security incident scenario). |
| New §16 | **JWKS key management** — `jwks` table, rotation interval, grace period, JWKS endpoint, pod-restart safety. |

### 9.2 LLD — `schema-reference.json`

| Entity | Change |
|--------|--------|
| `ba_users` | Add `username` column (TEXT, NOT NULL, UNIQUE). Update `email` description to note synthetic values. |
| New: `jwks` | Add entity for JWT plugin's key storage table (id/kid, alg, publicKey, privateKey, createdAt, expiresAt). Mark as better-auth managed. |

### 9.3 LLD — `user-management.erd.json`

| Change |
|--------|
| Add `username` column to `ba_users` entity |
| Add `jwks` entity (blue = better-auth managed) |
| Update relationship annotations if needed |

### 9.4 LLD — `02-scenarios.md`

| Scenario | Change |
|----------|--------|
| §1 Tenant onboarding | Update `ba_users` example to show `username` + synthetic email |
| §2 Staff onboarding | Same; show `ba_users.email = 'sharma@auth.internal'` |
| §3 Multi-tenant login | Update login flow to username-based; add Token Handler cookie/JWT split |
| §13 Security incident | Update revocation window from 15 min to 1-2 min; note Token Handler's refresh-denial as immediate cut-off |
| New §16 | **Token Handler refresh** — seamless refresh during long clinical session, cookie lifecycle |
| New §17 | **Key rotation** — JWKS rotation scenario, grace period overlap, module cache invalidation |

### 9.5 HLD — `04-authn-authz-flow.md`

| Section | Change |
|---------|--------|
| §1.2 Federation | Add two-tier strategy summary (Tier 1 direct, Tier 2 Keycloak broker). Remove implication that all IdPs connect directly. |
| §1.5 Token format | Change default lifetime from 15 min to 1-2 min. Add `jti` claim. Add `org_id` claim (currently only in LLD). |
| §1.6 JWKS verification | Expand: mention JWT plugin, DB-persisted keys, rotation, grace period. |
| §2 User-facing auth flow | Step 1: username, not email. Step 3: BFF stores refresh token in cookie, issues short-lived JWT. Step 4: BFF role expanded per §7. |
| §7 BFF role | Update §7.1 to include Token Handler session management alongside signature verification. Update §7.2 — BFF now manages refresh tokens but still does NOT perform authorization. Add §7.4 explaining the Token Handler pattern. |
| §11 Open questions | Replace `[OPEN]` markers with decisions. §11.1: Git + bundle confirmed. §11.2: Token Handler pattern. |
| New §13 | **OAuth 2.1 Provider** — when platform acts as IdP for third parties, `customAccessTokenClaims`, RFC references. |

### 9.6 ADR — `0003-authn-better-auth-identity-adapter.md`

| Section | Change |
|---------|--------|
| Decision outcome | Add: username plugin for primary login, synthetic email pattern, two-tier federation strategy. |
| Federation section | Replace single-paragraph OIDC/SAML mention with Tier 1 (direct) + Tier 2 (Keycloak broker with multi-realm) strategy. |
| OIDC Provider | Replace reference to OIDC Provider plugin with OAuth 2.1 Provider plugin (OIDC Provider is deprecated). |
| Follow-up actions | Close "token refresh strategy" item. Add: implement username plugin, implement Token Handler, configure OAuth 2.1 Provider. |
| Links | Add: OAuth 2.1 Provider plugin URL, username plugin URL. |

### 9.7 ADR — `0015-bff-role-zero-trust.md`

| Section | Change |
|---------|--------|
| Title consideration | Title stays — "BFF role and zero-trust" still accurate. |
| Decision outcome | BFF role expands: "signature verification + session lifecycle management (Token Handler pattern)." |
| §7.1 equivalent | Add Token Handler responsibilities: refresh token in HttpOnly cookie, JWT reissuance, session invalidation forwarding. |
| Consequences (positive) | Add: 1-2 min token lifetime reduces revocation window from 15 min. Refresh token never exposed to JavaScript. |
| Consequences (negative) | Add: BFF is now stateful (cookie store). BFF outage blocks new JWT issuance (but existing JWTs remain valid for 1-2 min, and modules can still verify them). |
| Follow-up actions | Add: implement Token Handler middleware, define cookie parameters (domain, path, SameSite, Secure, HttpOnly, max-age). |

### 9.8 New dev-doubt — `dev-doubts/03-analysis.md`

Four analysis sections:

1. **ba_users/users normalization** — why the overlap is intentional, not accidental. Domain boundary argument, change cadence differences, Citus distribution incompatibility.
2. **Token Handler vs distributed blocklist** — why short-lived tokens + refresh denial beats maintaining a cross-service revocation list. Latency, complexity, and consistency tradeoffs.
3. **Keycloak-as-broker vs direct legacy adapters** — why a shared Keycloak cluster with per-hospital realms beats building custom adapters for every legacy protocol. Onboarding velocity, operational burden, isolation guarantees.
4. **Synthetic email safety** — why `{username}@auth.internal` is safe. Code audit findings: username sign-in path, callback-based email sending, `getTempEmail` precedent, `TODO(#9124)`.

---

## 10. Organization Plugin — Evaluated and Rejected

better-auth's **Organization plugin** was evaluated and rejected for this platform:

1. **Citus conflict:** The Organization plugin's `member` table is not distributed by `iq_tenant_id` — it would need to be a reference table or cause cross-shard queries on every request.
2. **Cerbos overlap:** The plugin provides its own role/permission model that conflicts with the Cerbos-based capability model. Running both would create two competing authorization sources.
3. **Missing features:** The plugin does not support capabilities, delegations, clearances, or ward-level scoping — all of which are core to the platform's authorization model.

The platform's own `users` + `roles` + `role_assignments` + `capabilities` tables fulfill the same purpose with full Citus compatibility and Cerbos integration.

---

## 11. better-auth Plugin Stack (Summary)

| Plugin | Purpose | Status |
|--------|---------|--------|
| **Username** | Username-based sign-in | Required — primary login method |
| **JWT** | JWKS key management, custom token claims, DB-persisted keys | Required — core infrastructure |
| **OAuth 2.1 Provider** | Platform as IdP for third parties | Required — replaces deprecated OIDC Provider |
| **SSO** | OIDC federation to external IdPs (Tier 1) | Required — Entra, Okta, etc. |
| **SAML** | SAML 2.0 federation (Tier 1) | Required — government/enterprise IdPs |
| **Two Factor** | TOTP-based MFA | Optional — enabled per tenant, not MVP |
| **Generic OAuth** | Custom OAuth2/OIDC providers | As needed — non-standard IdPs |
| **Organization** | Multi-org user management | **Rejected** — see §10 |

---

## 12. Security Invariants

These must hold after the revision:

1. **No real email in `ba_users`.** All `ba_users.email` values match the pattern `{username}@auth.internal`. Real emails exist only on `users.email`.
2. **No email in JWTs.** The `definePayload` callback excludes email. The synthetic value must never leak to clients or downstream services.
3. **Refresh tokens never in JavaScript.** The refresh token is in an HttpOnly cookie. The SPA only ever sees the short-lived JWT.
4. **Module independence from BFF.** Every module verifies JWTs independently. If the BFF is down, existing JWTs remain valid until expiry. Modules do not call the BFF for verification.
5. **Token lifetime <= 2 minutes.** This is the maximum acceptable revocation window given the Token Handler pattern.
6. **JWKS keys in DB.** Keys must survive pod restarts. No in-memory-only key generation.
7. **Keycloak realms are isolated.** One hospital's realm configuration cannot affect another hospital's authentication.

---

## 13. Out of Scope

- **2FA implementation details** — TOTP plugin configuration is deferred to implementation. The schema and flow accommodate it but it's not MVP.
- **KMS integration** — The JWT plugin supports custom `sign` functions for KMS. Configuration is deferred to deployment planning.
- **SCIM endpoint implementation** — The schema supports SCIM sync state tracking. The actual SCIM server implementation is a separate work item.
- **Cerbos policy authoring** — This spec covers the data model that feeds Cerbos. Policy YAML authoring is a separate LLD.
- **Frontend login UI** — Username-based login form, tenant picker, and tenant switch UX are frontend implementation concerns.

---

## 14. References

### better-auth plugins
- Username plugin: https://better-auth.com/docs/plugins/username
- JWT plugin: https://better-auth.com/docs/plugins/jwt
- OAuth 2.1 Provider: https://better-auth.com/docs/plugins/oauth-provider
- SSO plugin: https://better-auth.com/docs/plugins/sso
- SAML plugin: https://better-auth.com/docs/plugins/saml
- Two Factor plugin: https://better-auth.com/docs/plugins/two-factor

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
