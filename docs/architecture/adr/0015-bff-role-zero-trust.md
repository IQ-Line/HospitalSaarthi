# ADR-0015: BFF role and zero-trust between modules

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform uses a Backend For Frontend (BFF) as the entry point for client requests. A key architectural question is how much security responsibility the BFF should carry. Centralizing authorization at the BFF is operationally simpler but creates a single point of failure and a false security boundary — particularly dangerous in a platform where modules must also be deployable without a BFF (fragmented adoption, service-to-service calls). The platform needs an explicit position on where authorization enforcement lives and what trust assumptions modules make about upstream request processing. See [HLD 04 §7 — BFF role in authentication and authorization](../hld/04-authn-authz-flow.md#7-bff-role-in-authentication-and-authorization) and [HLD 01 §3.5 — Authorization as a cross-cutting policy layer](../hld/01-system-overview.md#35-authorization-as-a-cross-cutting-policy-layer).

## Decision drivers

- **Fragmented adoption means modules must work without a BFF.** A hospital running a single platform module alongside a legacy HIS may not deploy the BFF at all. Other modules making service-to-service calls bypass the BFF entirely. Authorization cannot depend on a component that is not always present ([HLD 01 §2.3 — fragmented adoption constraint](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption), [HLD 04 §6 — Service-to-service authorization](../hld/04-authn-authz-flow.md#6-service-to-service-authorization)).
- **Defense in depth.** A BFF compromise or misconfiguration must not result in unauthorized access to patient data. If the BFF is the only component checking authorization, a single vulnerability in the BFF bypasses all access control for every module behind it ([HLD 04 §7.3 — Why the BFF is not a security boundary](../hld/04-authn-authz-flow.md#73-why-the-bff-is-not-a-security-boundary)).
- **Consistent security guarantees regardless of request path.** Whether a request arrives via the BFF (frontend user), via service-to-service call (another module), or via the Integration Hub (external system), the receiving module must apply the same authorization checks. The security posture cannot vary by entry point.
- **Performance at scale.** Fine-grained authorization (role + department + tenant + resource attributes) requires domain context that the BFF does not have. Pushing AuthZ to the BFF means either the BFF fetches resource attributes from downstream modules (adding latency and coupling) or the BFF performs coarse-grained checks that are insufficient, requiring modules to re-check anyway (redundant work).
- **N+1 authorization mitigation.** Modules use Cerbos `PlanResources` to push authorization filters into SQL queries and `CheckResources` bulk batching to avoid per-row authorization overhead. These optimizations require the PDP to be co-located with the module's data access layer, not at the BFF ([HLD 04 §5 — N+1 mitigation](../hld/04-authn-authz-flow.md#5-n1-mitigation)).

## Considered options

1. **BFF as full API gateway with AuthZ enforcement** — the BFF runs a Cerbos sidecar and performs fine-grained authorization before forwarding requests to modules. Modules trust the BFF's authorization decision.
2. **BFF for signature verification only + per-module zero-trust** — the BFF verifies JWT signatures (JWKS) and rejects expired/malformed tokens with 401. Fine-grained authorization is performed independently by each module using its own Cerbos sidecar. Modules do not trust the BFF's verification.
3. **No BFF — clients call modules directly** — the frontend calls module APIs directly. Each module handles both token verification and authorization.

## Decision outcome

Chosen option: **BFF for signature verification only + per-module zero-trust**, because the BFF is an optimization layer (routing, token format validation, response aggregation) and not a security boundary. Each module verifies tokens and evaluates Cerbos policies independently, ensuring that authorization is enforced identically whether the request arrives from the BFF, from another module, or from an external system — and ensuring that a BFF compromise does not cascade into unauthorized access across the platform.

### Consequences

**Positive:**

- Every module is a self-contained security perimeter. A module deployed behind the BFF or accessed directly (service-to-service, Integration Hub, fragmented adoption without BFF) has identical security guarantees. There is no "trusted network" assumption.
- BFF compromise is contained. If the BFF is exploited, the attacker can route requests to modules, but every module independently verifies the JWT signature and evaluates fine-grained authorization. The attacker cannot forge valid tokens (they lack the signing key) and cannot bypass per-module Cerbos policies.
- N+1 authorization mitigation works naturally. Each module's PEP uses `PlanResources` and bulk `CheckResources` with its co-located Cerbos sidecar. These optimizations are impossible at the BFF, which lacks access to module-specific resource attributes and database queries.
- The BFF stays simple. It verifies token signatures (JWKS lookup, cached), routes requests, and optionally aggregates responses. It does not need a Cerbos sidecar, does not need to understand module-specific resource types, and does not need to be updated when authorization policies change.
- Service-to-service calls (e.g., OPD module calling Lab module) follow the same authorization path as user-initiated calls — the Lab module's PEP checks the OPD service account's Cerbos policies. There is no separate "internal" trust model.

**Negative / accepted trade-offs:**

- Token verification happens multiple times per request: once at the BFF and once at the receiving module. This is redundant work. We accept this because JWKS-based JWT verification is a microsecond-scale cryptographic operation (a single RSA or ECDSA signature check against a cached public key). The redundancy is the cost of zero-trust, and it is negligible relative to the authorization evaluation and business logic that follow.
- Each module pod includes a Cerbos sidecar, increasing total cluster resource consumption compared to a single centralized PDP at the BFF. We accept this because the per-pod resource overhead is small (Cerbos PDP is ~30MB memory) and the availability and latency benefits are substantial — see [ADR-0004](./0004-authz-cerbos-sidecar.md).
- The BFF cannot provide fine-grained error responses for authorization failures. A request that passes BFF signature verification but fails module-level authorization returns 403 from the module, not from the BFF. The frontend must handle both 401 (BFF: invalid/expired token) and 403 (module: unauthorized action). This is standard HTTP semantics and not a real burden on frontend development.
- Cerbos policy changes must be distributed to every module's sidecar, not just one central PDP. The bundle distribution mechanism (Git-based CI pipeline pushing compiled bundles) handles this, but the rollout surface is larger. We accept this because the same bundle distribution infrastructure is already required by the sidecar-per-pod model chosen in [ADR-0004](./0004-authz-cerbos-sidecar.md).

**Follow-up actions:**

- [ ] Implement BFF JWT verification middleware using JWKS with key caching (TTL aligned with key rotation schedule).
- [ ] Verify that the PEP middleware SDK (from [ADR-0004](./0004-authz-cerbos-sidecar.md) follow-ups) performs independent token verification and does not assume prior BFF verification.
- [ ] Document the request flow for each entry path (BFF, service-to-service, Integration Hub) showing that the same PEP evaluation occurs regardless of entry point.
- [ ] Implement request-scoped PEP caching to ensure that repeated authorization checks within a single request (e.g., list rendering with per-row action buttons) do not cause redundant Cerbos calls.
- [ ] Define the service-account JWT issuance and rotation process for inter-module calls.

## Pros and cons of the options

### BFF as full API gateway with AuthZ enforcement

- *Good:* Single enforcement point for all frontend-initiated requests. Authorization is centralized, making it easier to reason about what is allowed.
- *Good:* Modules behind the BFF can be simpler — they trust the BFF's decision and skip their own authorization.
- *Bad:* Single point of failure. A BFF compromise or misconfiguration bypasses all authorization for every module. In a healthcare system handling psychiatric records, controlled substance prescriptions, and break-glass emergency access, this is an unacceptable risk posture.
- *Bad:* The BFF must understand every module's resource types, attributes, and authorization semantics. It becomes a coupling point that must be updated whenever a module adds a new resource type or changes its authorization model. This violates the platform's module independence principle.
- *Bad:* Does not work for service-to-service calls or Integration Hub requests, which bypass the BFF. These paths would need a separate authorization mechanism, splitting the security model into "BFF-path" and "non-BFF-path" — exactly the inconsistency zero-trust avoids.
- *Bad:* N+1 mitigation (`PlanResources`, bulk `CheckResources`) cannot work at the BFF because the BFF does not have access to module databases or resource attributes. Modules would need to implement their own authorization for list views anyway, undermining the centralization argument.
- *Bad:* Fragmented deployments (no BFF) lose all authorization. A module deployed standalone has no protection.

### BFF for signature verification only + per-module zero-trust

- *Good:* Modules are self-contained security perimeters. Authorization works identically regardless of request entry point.
- *Good:* BFF compromise does not cascade. Defense in depth is structural, not aspirational.
- *Good:* N+1 mitigation (`PlanResources`, bulk `CheckResources`) works naturally with the co-located Cerbos sidecar.
- *Good:* The BFF stays simple and does not need to track module-specific authorization semantics.
- *Good:* Fragmented deployments without a BFF have full authorization coverage.
- *Good:* Aligns with NIST SP 800-207 zero-trust architecture principles: "no implicit trust is granted to assets or user accounts based solely on their physical or network location."
- *Bad:* Redundant token verification (BFF + module). Negligible performance cost but conceptually inelegant.
- *Bad:* Per-module Cerbos sidecars increase cluster resource consumption relative to a single central PDP.
- *Bad:* Policy distribution must reach every sidecar, not just one central point.

### No BFF — clients call modules directly

- *Good:* Eliminates the BFF as a component to build, operate, and secure. Simplest topology.
- *Good:* Modules already verify tokens and authorize independently — removing the BFF changes nothing about their security posture.
- *Bad:* The frontend must know the address of every module and route requests itself. This exposes internal service topology to the client, complicates deployment changes (module URL changes require frontend updates), and breaks response aggregation scenarios where the frontend needs data from multiple modules in one view.
- *Bad:* No early rejection of malformed/expired tokens. Every invalid request reaches a module and consumes module resources before being rejected. The BFF's signature check is a cheap, effective filter that protects modules from token-related noise.
- *Bad:* CORS, rate limiting, and request logging must be implemented per-module rather than at a single ingress point.
- *Bad:* Not viable for response aggregation use cases (e.g., a patient dashboard pulling data from OPD, Lab, Pharmacy, and Billing in a single frontend view).

## Links

- Related ADRs: [ADR-0003](./0003-authn-better-auth-identity-adapter.md), [ADR-0004](./0004-authz-cerbos-sidecar.md), [ADR-0005](./0005-policy-as-code-permission-data-as-config.md)
- Related HLD: [HLD 04 §7 — BFF role in authentication and authorization](../hld/04-authn-authz-flow.md#7-bff-role-in-authentication-and-authorization), [HLD 04 §5 — N+1 mitigation](../hld/04-authn-authz-flow.md#5-n1-mitigation), [HLD 01 §3.5 — Authorization as a cross-cutting policy layer](../hld/01-system-overview.md#35-authorization-as-a-cross-cutting-policy-layer)
- External sources:
  - NIST, "SP 800-207: Zero Trust Architecture", https://csrc.nist.gov/pubs/sp/800/207/final, accessed 2026-04-28
  - Sam Newman, "Building Microservices", 2nd Edition (O'Reilly, 2021), Chapter 10: "From Monitoring to Observability" and Chapter 11: "Security" — API gateway limitations and defense-in-depth patterns
