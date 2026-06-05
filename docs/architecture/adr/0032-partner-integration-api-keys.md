# ADR-0032: Partner integration API keys and JWT ingress

- **Status:** Accepted
- **Date:** 2026-06-05
- **Deciders:** Platform architecture

## Context and problem statement

External services (Smart Report and future partners) must call HospitalSaarthi APIs securely. Human better-auth JWTs are not appropriate for machine partners. The platform needs API key authentication at the Integration Hub boundary, short-lived partner JWTs for module PEP, and a single authorization source (User Management role capabilities evaluated by Cerbos).

Cross-references: [HLD 04 — AuthN/AuthZ](../hld/04-authn-authz-flow.md), [HLD 05 — Integration](../hld/05-integration-and-interop.md).

## Decision drivers

- User Management role capabilities are the sole permission source.
- Integration Hub is the system of record for integrations and API keys.
- Modules must never see API keys.
- Partner principals are non-loginable (`kind=partner`).
- OperationIds in OpenAPI are partner-facing stable contracts.

## Decision outcome

**Partner ingress:** API key → Integration Hub verifies → mints partner JWT (`sub` = UM `users.id`) → modules verify JWT + Cerbos PEP.

### Amendments (locked)

| ID | Decision |
|----|----------|
| A | No API key scopes; keys authenticate integration identity only |
| B | Partner principals: `kind=partner`, no auth_user_id/email/username/phone, not in better-auth |
| C | Service JWT tenant strategy — **OPEN** until Phase D (ADR-0032-C) |
| D | Allowlist uses `{spec}.{operationId}` from OpenAPI registry |
| E | Control plane vs data plane split in `integration-hub` module folders |
| F | Partner JWT `sub` = UM principal id (`users.id` UUID) |
| G | 1:1 Integration ↔ Partner principal (unique `integration_id` on partner user) |
| H | `operationId` changes are breaking; hard CI immutability check |

## Consequences

**Positive:** Single authz substrate; partner and human capabilities share vocabulary; incremental 4-PR delivery.

**Negative / accepted:** Partner capability changes propagate within JWT TTL (60s); IH availability required for partner ingress.

**Follow-up actions:**

- [x] PR-1: Security foundation (this ADR, tenantSource=jwt, partner principal model)
- [ ] PR-2: Integration control plane
- [ ] PR-3: Smart Report inbound MVP
- [ ] PR-4: Outbound, S2S tokens, UI

## Links

- [Platform security LLD](../lld/platform-security/01-unified-service-authentication.md)
