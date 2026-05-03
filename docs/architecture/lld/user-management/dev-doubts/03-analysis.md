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
