# ADR-0003: AuthN with better-auth and identity adapter pattern

- **Status:** Proposed
- **Date:** 2026-04-28
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

As of v1.5+, better-auth natively covers the federation capabilities that historically required a heavyweight IAM server like Keycloak:

- **OIDC federation** via the SSO plugin — supports Entra ID, Okta, Keycloak, Auth0, and Google as external IdPs with configuration, not custom code.
- **SAML 2.0** — both SP-initiated and IdP-initiated flows, with self-service IdP configuration per tenant.
- **SCIM provisioning** (v1.5+) — including Microsoft Entra ID compatibility for automated user/group synchronization with external directories.
- **Custom OAuth2/OIDC providers** via the Generic OAuth plugin — any standards-compliant IdP can be added through configuration alone.
- **OIDC Provider mode** — better-auth can act as an OIDC Provider itself (dynamic client registration, JWKS endpoints), enabling the platform to be the identity source for third-party systems that need to integrate with it.

These capabilities eliminate the federation gap that was previously Keycloak's primary justification over library-based AuthN solutions. The `IdentityProvider` adapter pattern remains the module-facing contract, but the underlying federation machinery is now built-in rather than custom.

### Consequences

**Positive:**

- Every module consumes the same `IdentityProvider` interface regardless of whether the tenant uses better-auth natively, federates to Entra ID, or uses hospital SSO. Module code is IdP-agnostic.
- The User Management module owns the full token lifecycle — issue, verify, refresh, revoke — and controls exactly which claims appear in every JWT. This guarantees the claim contract that Cerbos policies depend on.
- JIT provisioning creates shadow records on first federated login, providing an unbroken audit chain from external identity to every platform action. SCIM synchronization keeps shadow records current where the external IdP supports it.
- better-auth is a TypeScript library that runs in-process with User Management. No separate JVM, no Wildfly/Quarkus server to operate, no separate HA cluster to maintain.
- On-premises deployments carry no external identity dependency. The full AuthN stack ships with the platform.

**Negative / accepted trade-offs:**

- better-auth is a younger library than Keycloak. Its ecosystem (plugins, community knowledge base) is smaller. We accept this because the `IdentityProvider` interface limits our surface-area dependency — if better-auth is ever abandoned, the adapter pattern isolates the replacement to one module.
- Federation adapters (Entra, Okta, Keycloak-as-external-IdP, SAML) must be built and maintained by the platform team. Keycloak provides these out of the box. We accept this because the adapters are thin OIDC/SAML clients, and the alternative — operating Keycloak — carries a higher ongoing cost for the team's skill profile.
- No built-in admin UI for identity management. The User Management module must build its own administrative interface for user provisioning, role assignment, and session management. This is acceptable because we need a tenant-aware admin UI integrated into the platform's application shell, which Keycloak's admin console would not provide.

**Follow-up actions:**

- [ ] Define the `IdentityProvider` interface contract in the User Management LLD, including `verifyToken`, `getJWKS`, `refreshToken`, and `revokeSession` operations.
- [ ] Implement the better-auth native adapter as the default `IdentityProvider` implementation.
- [ ] Implement the Entra ID / OIDC federation adapter as the first external IdP integration (highest demand among target hospitals).
- [ ] Define the JWT claim schema as a platform-level contract shared with the PEP middleware SDK.
- [ ] Determine token refresh strategy for long clinical sessions (open question from [HLD 04 §11.2](../hld/04-authn-authz-flow.md#112-token-lifetime-and-refresh-strategy)).

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
- *Good:* The team can debug and extend the AuthN pipeline with their existing skills.
- *Bad:* Younger project than Keycloak. Fewer battle-tested deployments in regulated environments.
- *Bad:* Federation adapters must be built and maintained by the platform team.
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
