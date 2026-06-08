# ADR-0032: Partner integration security and API key architecture

- **Status:** Accepted
- **Date:** 2026-06-05
- **Deciders:** Platform architecture
- **Supersedes:** Informal partner-auth notes in HLD-04 §9.4 (partial)

## Context and problem statement

HospitalSaarthi must expose a controlled inbound path for external partners (e.g. Smart Report) to call platform APIs (registration, EMPI) without conflating integration credentials with authorization data. Today human-user JWT + Cerbos works on core services, but partner identity, API keys, and Integration Hub orchestration lack a committed, enforceable contract.

The platform already separates **catalog** (Master Data), **runtime grants** (User Management), and **policy evaluation** (Cerbos). Partner integration must extend that model — not introduce parallel permission stores on API keys, JWTs, or Integration Hub config.

See [HLD 04 — AuthN/AuthZ](../../hld/04-authn-authz-flow.md), [HLD 05 — Integration & Interop](../../hld/05-integration-and-interop.md), and [ADR-0011](./0011-integration-hub-split.md).

## Decision drivers

- **Single authorization substrate** — Cerbos evaluates UM-enriched principals; no scopes on API keys or JWTs.
- **Clear ownership** — Master Data defines capabilities; User Management assigns them; Integration Hub orchestrates provisioning only.
- **Tenant safety** — Partner requests must bind to one tenant; header spoofing must not override JWT tenant.
- **Operational split** — Control plane (admin CRUD, keys) vs data plane (authenticate, route, proxy) with strict guardrails.
- **Spec-first** — OpenAPI `operationId` registry for partner-exposed operations; CI immutability.

## Considered options

1. **API keys carry OAuth-style scopes** — rejected (scopes become a second permission source).
2. **Integration Hub evaluates Cerbos on inbound traffic** — rejected (duplicates module PEP; violates data-plane guardrails).
3. **Capability catalog in Integration Hub `integrations.config`** — rejected after activation; config is orchestration UX only.
4. **Catalog in Master Data, grants in UM, IH orchestrates, Cerbos decides** — **chosen**.

## Decision outcome

Chosen option: **4**, implementing the source-of-truth hierarchy:

```
Master Data → capability catalog
User Management → principal capability assignments
Integration Hub → partner provisioning orchestration
API Keys → integration identity only
Partner JWT → partner principal identity only
Cerbos → authorization decisions
```

### Amendments (final consistency review)

| ID | Decision | Status |
|----|----------|--------|
| **A** | API keys authenticate only — no `scopes`, `permissions`, or `capabilities` columns | Accepted |
| **B** | Partner principals are non-loginable (`users.kind = 'partner'`; no better-auth row) | Accepted |
| **C** | Service JWT tenant strategy (omit `iq_tenant_id` on machine tokens) | **Deferred** — follow-up ADR before `kind: service` issuance |
| **D** | Partner ingress uses OpenAPI `operationId` allowlist (`{spec}.{operationId}`) for routing only | Accepted |
| **E** | Integration Hub control plane vs data plane split; data plane never calls Cerbos | Accepted |
| **F** | Master Data = capability catalog; UM = assignments; IH = orchestration; Cerbos = sole authz engine | Accepted |

### Partner request flow (no shortcuts)

```
Partner Request
  → API Key Authentication
  → Resolve Integration
  → Resolve Tenant
  → Resolve Partner Principal
  → Mint Partner JWT (identity claims only)
  → Module PEP
  → Principal Enrichment (User Management)
  → Cerbos
  → Decision
```

### API key schema (allowed fields only)

`id`, `prefix`/`key_prefix`, `hash`/`key_hash`, `status`, `expires_at`, `last_used_at`, plus audit/tenant/integration linkage. **No scopes column.**

### Partner JWT (allowed claims only)

`sub`, `iq_tenant_id`, `kind`, `jti`, `iss`, `aud`, `iat`, `exp`. **Forbidden:** `scopes`, `capabilities`, `permissions`, role mappings.

### Capability assignment at activation

Integration templates may expose `suggestedCapabilityKeys` as **UX defaults only**. On activate, Integration Hub calls User Management; UM validates against the catalog and writes `user_capabilities`. Post-activation, Integration Hub must not consult capability configuration for authorization.

### Operation allowlist

`allowedOperations` (e.g. `registration.listRegistrations`, `empi.getPatient`) controls **routing only**. Operation validation: OpenAPI `operationId` → registry → integration config. **Never** replaces Cerbos.

### Consequences

**Positive:**

- One Cerbos evaluation path for human and partner principals.
- API key compromise does not leak permission vocabulary.
- Clear module boundaries for security review and onboarding.

**Negative / accepted trade-offs:**

- Extra network hop (IH data plane → module service) for partner traffic.
- Manual MD → UM capability sync until event-driven catalog projection lands.
- Amendment C deferred — service principals cannot ship until tenant strategy is decided.

**Follow-up actions:**

- [ ] PR-1 — ADR, MD catalog, UM capability seed, Cerbos policies (this ADR)
- [ ] PR-2 — Partner principals in User Management
- [x] PR-3 — `tenantSource=jwt`, multi-issuer partner JWT verify
- [ ] PR-4 — Integration Hub control plane wiring + OpenAPI
- [ ] PR-5 — Inbound data plane MVP (Smart Report)

## Links

- [ADR-0004](./0004-authz-cerbos-sidecar.md) — Cerbos PEP
- [ADR-0011](./0011-integration-hub-split.md) — IH split
- [ADR-0031](./0031-um-role-template-snapshot-semantics.md) — snapshot grants
- [UM capability vocabulary](../lld/user-management/04-module-capability-vocabulary.md)
- [Unified service authentication](../lld/platform-security/01-unified-service-authentication.md)
