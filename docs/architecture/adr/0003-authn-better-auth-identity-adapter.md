# ADR-0003: AuthN with better-auth and identity adapter pattern

- **Status:** Accepted — core-identity MVP implemented (2026-06-21); federation + BFF Token Handler deferred
- **Date:** 2026-04-28 (implementation status appended 2026-06-21)
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform requires an authentication layer that supports both direct credential-based login and federation to external Identity Providers (IdPs) — hospitals running Entra ID, Okta, Keycloak, or custom SSO systems must be able to bring their existing directory as the identity source of truth without forcing staff into a second set of credentials. The platform must also support fully on-premises deployments where a cloud-dependent identity service is not viable. See [HLD 04 §1 — Authentication architecture](../hld/04-authn-authz-flow.md#1-authentication-architecture), [HLD 01 §3.4 — Federated identity](../hld/01-system-overview.md#34-federated-identity), and [HLD 03 §3 — Identity adapter](../hld/03-module-shape-template.md#3-identity-adapter).

## Decision drivers

- **Fragmented adoption requires IdP flexibility.** A hospital deploying only the Pharmacy module alongside a legacy HIS will not adopt a new identity system. The platform must accept tokens from the hospital's existing IdP ([HLD 01 §2.3 — fragmented adoption constraint](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption)).
- **On-premises deployment must work without cloud dependencies.** AIIMS and government hospitals require full on-premises operation. A SaaS-only identity provider is a non-starter ([HLD 01 §8.1 — full on-premises deployment](../hld/01-system-overview.md#81-full-on-premises-deployment)).
- **Audit chain-of-custody for federated users.** Healthcare regulations require that every access event be traceable to a named individual indefinitely, even for users authenticated by external IdPs. The platform must maintain shadow records for every federated user who has ever acted on the system ([HLD 04 §1.3 — JIT provisioning](../hld/04-authn-authz-flow.md#13-jit-provisioning), [HLD 04 §10.2 — shadow records for audit](../hld/04-authn-authz-flow.md#102-shadow-records-for-audit-chain-of-custody)).
- **Control over token claims.** The authorization layer (Cerbos) depends on specific JWT claims (`iq_tenant_id`, `roles`, `department`, `kind`). The AuthN layer must produce tokens with exactly these claims regardless of which IdP authenticated the user ([HLD 04 §1.5 — token format](../hld/04-authn-authz-flow.md#15-token-format)).
- **Team skill and maintenance burden.** The team has TypeScript/Node expertise. The AuthN solution should be operable and debuggable by the existing team without requiring Java/JBoss operations knowledge.

## Considered options

1. **Keycloak (full-featured IAM server)** — deploy Keycloak as the platform's identity server, using its built-in federation, user management, and token issuance capabilities.
2. **better-auth behind an IdentityProvider interface** — use better-auth as the primary AuthN library, wrapped behind a thin `IdentityProvider` adapter interface owned by the User Management module, with federation handled through OIDC/SAML adapters per external IdP.
3. **Auth0 / managed SaaS identity** — delegate authentication to a managed identity-as-a-service provider (Auth0, Okta Identity Platform, or equivalent).

## Decision outcome

Chosen option: **better-auth behind an IdentityProvider interface**, because it gives us full control over the authentication pipeline and token format while the adapter pattern decouples modules from the underlying IdP — hospitals bring their own identity system without any module-level code changes, and the solution runs entirely on-premises with zero cloud dependencies.

**Key revisions since initial proposal (2026-05-03):**

- **Username-primary login:** The username plugin makes `ba_users.username` the primary login credential. Email is not used for login. `ba_users.email` is a synthetic identity anchor (`{username}@auth.internal`) satisfying better-auth's NOT NULL UNIQUE constraint without depending on external infrastructure.
- **BFF Token Handler:** The BFF's role expands from signature verification only to session lifecycle management. JWTs are 1-2 minutes (not 15), refresh tokens stored in HttpOnly cookies. Solves the JWT revocation gap and long clinical session support.
- **Two-tier federation:** Tier 1 = direct OIDC/SAML via better-auth plugins. Tier 2 = shared Keycloak cluster with one realm per legacy hospital (OIDC bridge). Former Tier 2 (hospital deploys own broker) eliminated.
- **OAuth 2.1 Provider:** Replaces the deprecated OIDC Provider plugin. Production-ready with RFC 7009/7662/7591 support.
- **Recovery tier model:** 5-tier recovery system (`standard`, `delegated`, `phone_recovery`, `admin_only`, `federated`) as a first-class platform workflow.
- **AuthN provider replaceability:** The `IdentityProvider` interface contract is formalized. Synthetic emails make migration to Keycloak practical — they're meaningless internal keys that get discarded, not migrated. All platform-owned data (roles, capabilities, recovery tiers, identity links) survives a provider switch.

### Implementation status (2026-06-21 — "core identity first" MVP)

The username-primary identity flip shipped and is verified on real Citus + better-auth 1.6.10 (full provision → `signIn.username` → admin reset round-trip). What is live:

- **Username-primary login.** `username()` + `admin()` plugins enabled; `signIn.username` on the web client; login + admin create-user forms are username-first. Create-user **requires** `username` (lowercase `^[a-z0-9._]{3,30}$`, matching better-auth's default validator — no hyphen) and makes **email optional** (contact data only). OpenAPI `POST /users` `required` flipped accordingly.
- **Synthetic identity anchor.** `ba_users.email = {username}@auth.internal`, derived in exactly one place (`services/user-management-svc/src/auth/synthetic-email.ts`) and consumed by the provisioner, the dev seed, and the dev bootstrap. Real contact email lives only on `users.email`. Security invariant §15.1/§15.2 hold; the synthetic value is removed from the provider-agnostic `CreatePasswordAuthAccountInput` (it lives inside the better-auth boundary, spec §10.2).
- **Recovery tier (MVP slice).** `users.recovery_tier` column (migration `0004`, distributed-table-safe CHECK) emitting only `standard` (real email present) or `admin_only` (no email), derived at creation. The other tiers and the `sendResetPassword` routing that *reads* the tier are Phase 2.
- **Recovery Flow A.** `POST /users/{id}/reset-password` → Cerbos action **`user.reset_password`** (distinct from `user.update` so account recovery is separable; capability gate currently reuses `users:users:update`, task 9 may split a dedicated capability) → set password + revoke sessions (§15.8). Password is set via better-auth's own context (`auth.$context.password.hash` + `internalAdapter.updatePassword`) as a **trusted server-side call** — Cerbos is authoritative, so we deliberately bypass better-auth's `admin()` role gate rather than couple our authz to it (consistent with the existing session-revoker stance).

**Replaceability boundary is realized as focused ports, not a monolithic interface.** The spec §10.4 `IdentityProvider` lists 8 methods; 4 of them (`verifyToken`/`getJWKS`/`issueToken`/`refreshToken`) belong to the deferred BFF Token Handler / verification path and have no callers today. Building them now would be dead surface (violates the simplicity doctrine). The boundary's purpose — *modules never touch better-auth directly* — is fully met by three narrow, single-responsibility ports, each independently swappable for a Keycloak adapter:

| Concern | Port | better-auth adapter |
|---------|------|---------------------|
| Create credential account | `AuthAccountProvisioner` | `createPasswordAuthAccountProvisioner` |
| Revoke sessions | `AuthSessionRevokerPort` | `DrizzleAuthSessionRevoker` |
| Set/reset password | `AuthPasswordResetterPort` | `BetterAuthPasswordResetter` |

The monolithic `IdentityProvider` interface (and its token-issue/verify methods) is deferred until the BFF Token Handler pass gives those methods real callers.

**Explicitly deferred (with a gate):** BFF Token Handler (own pass; JWT lifetime stays 5 min until it ships — dropping to ≤2 min before then would force re-login every 2 min); recovery routing that reads `recovery_tier` (Phase 2); `must_change_password` login enforcement (column intentionally **not** added this pass — it is a transient flag with a safe default and no reader yet, so it lands with its enforcement in Phase 2, not pre-emptively); `delegated`/`phone_recovery`/`federated` tiers + `delegated_recovery_routes` + `auth_identity_links` (Phase 2/3, regenerable migrations); Flows B/C. **`recovery_tier` is write-only/internal this phase** — derived and persisted at creation but deliberately not surfaced in read APIs (OpenAPI `User` schema, `GET /users(/:id)`) or the admin UI until the recovery-routing UX lands; exposing it now would be speculative surface with no consumer.

**Known deviation (gated):** Security invariant §15.10 (prefer `auth.api.*` over direct SQL for session revocation) — `DrizzleAuthSessionRevoker` deletes session rows directly (pre-existing) and Flow A reuses it. Not deepened here; to be reconciled in the Cerbos/Token-Handler passes (both `auth.api.revokeUserSessions` and `setUserPassword` sit behind the same admin middleware, so aligning them is one change once the trusted-call header strategy is settled).

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

**Follow-up actions:**

- [x] Define the `IdentityProvider` interface contract — see [design spec §10.4](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#104-the-identityprovider-interface-contract).
- [x] Implement the better-auth identity adapter — **realized as three focused ports** (`AuthAccountProvisioner`, `AuthSessionRevokerPort`, `AuthPasswordResetterPort`) rather than the monolithic §10.4 `IdentityProvider` interface; the token-issue/verify methods of that interface are deferred until the BFF Token Handler pass has callers (see Implementation status above).
- [ ] Implement Entra ID / OIDC federation adapter as the first external IdP integration.
- [ ] Define the JWT claim schema as a platform-level contract shared with PEP middleware SDK.
- [x] Determine token refresh strategy — BFF Token Handler pattern (1-2 min JWTs + HttpOnly refresh cookie). See [design spec §5](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#5-bff-token-handler-pattern).
- [~] Recovery tier model and admin recovery workflows — **Flow A (admin direct reset) + `recovery_tier` column (`standard`/`admin_only`) shipped 2026-06-21**; Flows B/C and the `delegated`/`phone_recovery`/`federated` tiers + recovery routing are deferred to Phase 2/3.
- [ ] **Federation POC:** Verify SSO `provisionUser` hook can link a synthetic-email local user to an IdP account with a different email, end-to-end.
- [ ] Implement the required better-auth configuration checklist from [design spec §14](../../superpowers/specs/2026-05-03-authn-authz-revision-design.md#14-required-better-auth-configuration).

## Pros and cons of the options

### Keycloak (full-featured IAM server)

- *Good:* Mature, battle-tested IAM server with 10+ years of production use in enterprise environments.
- *Good:* Built-in federation to LDAP, Active Directory, SAML 2.0 IdPs, and OIDC providers — no custom adapter code required.
- *Good:* Built-in admin console for user management, realm configuration, and session management.
- *Good:* Extensive FIPS and compliance certifications.
- *Bad:* Heavyweight — requires a JVM, a dedicated database (typically PostgreSQL), and a separate HA cluster. Operating Keycloak in production is a non-trivial ops burden for a team without Java expertise.
- *Bad:* Keycloak's admin UI is Keycloak-specific, not integrated into the platform's application shell. For tenant-aware user management (multi-tenant with `iq_tenant_id`, department hierarchies, Cerbos-compatible role structures), we would still need to build a custom admin UI on top of Keycloak's Admin REST API.
- *Bad:* Keycloak's token format follows its own conventions. Customizing claims to match the platform's exact contract (`iq_tenant_id`, `roles` array, `department`, `kind`) requires protocol mappers and custom SPIs — feasible but brittle across Keycloak upgrades.
- *Bad:* Embedded mode for lite deployments (single-process, no external services) is not practical with Keycloak.
- *Bad:* The federation gap that historically justified Keycloak's weight no longer exists. better-auth v1.5+ natively supports OIDC federation (SSO plugin), SAML 2.0 (SP- and IdP-initiated), SCIM provisioning (Entra ID compatible), custom OAuth2/OIDC providers (Generic OAuth plugin), and can act as an OIDC Provider itself. Keycloak's only remaining advantage is maturity — but at the cost of a JVM runtime, a heavy memory footprint (512MB–1GB minimum), and operational complexity that is hostile to embedded mode and single-process lite deployments.

### better-auth behind IdentityProvider interface

- *Good:* TypeScript library, same language as the platform. Runs in-process with User Management — no separate server, no JVM, no additional infrastructure.
- *Good:* Full control over the token lifecycle. Claims are defined in application code, not in an external server's configuration UI.
- *Good:* The `IdentityProvider` adapter pattern decouples all modules from the specific AuthN implementation. Federation to Entra, Okta, or any OIDC/SAML provider is a new adapter, not a module change.
- *Good:* Works identically in service mode (Kubernetes) and embedded mode (single-process lite deployment).
- *Good:* OAuth 2.1 Provider plugin (replaces deprecated OIDC Provider) enables the platform to act as an identity source for third-party systems — dynamic client registration, JWKS endpoints, custom token claims.
- *Good:* The team can debug and extend the AuthN pipeline with their existing skills.
- *Bad:* Younger project than Keycloak. Fewer battle-tested deployments in regulated environments.
- *Bad:* Edge-case federation (non-standard hospital SSO protocols) may require thin custom adapters. Standard IdPs (OIDC, SAML, SCIM) are covered natively via plugins.
- *Bad:* No built-in admin UI — User Management must build its own.

### Auth0 / managed SaaS identity

- *Good:* Fully managed — no infrastructure to operate. Handles token issuance, federation, MFA, and user management out of the box.
- *Good:* Mature federation support for enterprise IdPs (Entra, Okta, SAML).
- *Good:* Built-in compliance features (SOC 2, HIPAA BAA available on enterprise plans).
- *Bad:* Cloud dependency. On-premises hospital deployments cannot reach a SaaS identity provider — this is a hard blocker for AIIMS and government hospital requirements.
- *Bad:* Vendor lock-in on the most critical infrastructure layer. Pricing changes, region restrictions, or service outages are outside the platform's control.
- *Bad:* Custom claim injection requires Auth0 Actions/Rules. The claim contract (`iq_tenant_id` from the platform's tenant model, `roles` from the platform's role system) requires tight integration between Auth0 and the platform's data layer, undermining the "fully managed" value proposition.
- *Bad:* Latency — every token verification that cannot use cached JWKS requires a call to Auth0's infrastructure. For on-premises deployments this adds internet round-trips to the authentication path.

## Links

- Related ADRs: [ADR-0001](./0001-record-architecture-decisions.md), [ADR-0004](./0004-authz-cerbos-sidecar.md), [ADR-0005](./0005-policy-as-code-permission-data-as-config.md), [ADR-0015](./0015-bff-role-zero-trust.md)
- Related HLD: [HLD 04 — Authentication and Authorization Flow](../hld/04-authn-authz-flow.md), [HLD 01 §3.4 — Federated identity](../hld/01-system-overview.md#34-federated-identity), [HLD 03 §3 — Identity adapter](../hld/03-module-shape-template.md#3-identity-adapter)
- External sources:
  - better-auth, "Documentation — Getting Started", https://www.better-auth.com/docs, accessed 2026-04-28
  - better-auth, "SSO Plugin", https://better-auth.com/docs/plugins/sso, accessed 2026-04-28
  - better-auth, "Generic OAuth Plugin", https://better-auth.com/docs/plugins/generic-oauth, accessed 2026-04-28
  - better-auth, "OIDC Provider Plugin", https://better-auth.com/docs/plugins/oidc-provider, accessed 2026-04-28
  - NIST, "SP 800-63C: Digital Identity Guidelines — Federation and Assertions", https://pages.nist.gov/800-63-4/sp800-63c.html, accessed 2026-04-28
  - OpenID Foundation, "OpenID Connect Core 1.0", https://openid.net/specs/openid-connect-core-1_0.html, accessed 2026-04-28
  - better-auth, "OAuth 2.1 Provider Plugin", https://better-auth.com/docs/plugins/oauth-provider, accessed 2026-05-03 (replaces deprecated OIDC Provider)
  - better-auth, "Username Plugin", https://better-auth.com/docs/plugins/username, accessed 2026-05-03
  - better-auth, "JWT Plugin", https://better-auth.com/docs/plugins/jwt, accessed 2026-05-03
