# ABDM Adapter — LLD §01 Overview

> **Status:** Phase 0 scaffold. **First sprint target:** M1 (ABHA creation + login) end-to-end against the ABDM sandbox.
>
> See [ADR-0030 — ABDM Adapter prototype phase](../../adr/0030-abdm-adapter-prototype-phase.md) for the port-to-Integration-Platform commitment.

## Why this module exists

The platform must integrate with the ABDM gateway across three milestones: **M1** (ABHA identity), **M2** (HIP-side care-context link + consent), **M3** (HIU-side consent + data fetch + HIP-side data push). The reference production HIMS (`hims/abdi-lims-backed`) implements all three but as a monolithic Express service with a giant Mongo `Session` document.

The target architecture is the **Integration Platform** with a custom FSM engine (per [ADR-0027](../../adr/0027-fsm-orchestration-for-integration-hub.md)) where each ABDM flow is a state machine and use-case functions are side-effect handlers. That design is still settling.

This module is the **Phase 0 vessel** that lets the ABDM dev start M1 against the sandbox now, with a discipline that makes the port to the FSM engine a refactor rather than a rewrite.

## What ships in Phase 0

- A normal Fastify HTTP service (`services/abdm-adapter-svc`).
- A single PG table (`abdm_adapter.abdm_sessions`) for per-flow state.
- Pure-function use-cases under `modules/abdm-adapter/src/use-cases/` taking `(input, deps)` — no globals, no direct DB writes, no direct outbound HTTP.
- Protocol DTOs sourced from the v3 spec, exposed under `@hims/ts-sdk-abha/protocol/{m1,m2,m3,common}`.

## What does NOT ship in Phase 0

- No FSM engine — state transitions are explicit calls to `sessions.patch({ state: 'OTP_VERIFIED' })`.
- No Integration Platform schema (`integration_workflows`, `abdm_consent_artifacts`, etc.) — that's owned by the future Integration Platform module.
- No HIP-side bulk data orchestration — M3 HIP push is wired but its bundle-assembly side will defer to `record-foundation` once that lands.

## State surface

One table covers every milestone for Phase 0. Scalar columns are the indexed lookup keys; `context JSONB` absorbs everything else (identifiers snapshot, careContexts, consent artefact, key material, HIU request metadata).

| Column        | Type        | Purpose                                                                           |
|---------------|-------------|-----------------------------------------------------------------------------------|
| `iq_tenant_id`| `uuid`      | Tenant sharding key (Citus distribution target before any tenant goes live).      |
| `session_id`  | `uuid`      | Platform-issued handle returned to the client; threads request → callback.        |
| `flow_kind`   | `text`      | `abdm.m1.aadhaar-otp.v1`, `abdm.m2.user-link.v1`, etc. — see `domain/session.ts`. |
| `state`       | `text`      | FSM state name from `@hims/ts-sdk-abha/constants/fsm-states`.                     |
| `txn_id`      | `text`      | Gateway transaction id (chained across OTP request → verify).                     |
| `request_id`  | `text`      | Most recent REQUEST-ID we sent / received (for support tickets).                  |
| `x_token`     | `text`      | Gateway-issued ABHA bearer; required for profile, card, address calls.            |
| `t_token`     | `text`      | Transaction token (M2 / M3 sub-flows).                                            |
| `context`     | `jsonb`     | Everything else (identifiers, careContexts, consent artefact, key material …).    |
| `created_at`  | `timestamptz` | Audit only.                                                                     |
| `updated_at`  | `timestamptz` | Refreshed on every `patch`.                                                     |

**Migration path to FSM engine** (when ADR-0027 lands):
- `session_id` → `workflow_id`
- `flow_kind`, `state`, `context` map identically.
- Scalar tokens fold into `context.tokens.x_token` etc.
- One-time data-copy migration — no application rewrite required.

## Module shape (matches the rest of the monorepo)

```
modules/abdm-adapter/
  src/
    ports.ts              → AbdmSessionsPort, GatewayClient, FideliusEncryptor, SecretsClient
    domain/
      session.ts          → AbdmSession entity + AbdmFlowKind union
      abdm-adapter.types.ts
    use-cases/
      m1/                 → one file per M1 endpoint
      m2/                 → (Phase 1.5)
      m3/                 → (Phase 1.5)
    data-access/
      abdm-sessions.repo.ts
      gateway-client.http.ts
      fidelius.ts
    rest-handlers/
      m1/                 → Fastify route registrations per endpoint
    schema/
      tables.ts           → Drizzle definition of abdm_sessions
    lib/
      abdm-adapter-constants.ts
    router.ts
    fastify.d.ts
    index.ts
  migrations/
    0000_abdm_adapter_schema.sql
  drizzle.config.ts
  package.json / project.json / tsconfig.json / vitest.config.ts
```

Service entry (`services/abdm-adapter-svc/src/main.ts`) constructs the concretions and threads them through `createRouter({ sessions, gateway, fidelius, secrets })`.

## Cross-module touchpoints

- **EMPI** — M2 discovery matches inbound patient details against EMPI; M1 ABHA creation pushes a `patient.abha-linked` event consumed by EMPI to back-fill the patients row. Communication is event-driven per [ADR-0009](../../adr/0009-event-driven-inter-module-communication.md).
- **Record Foundation** ([ADR-0028](../../adr/0028-record-foundation-fifth-core-module.md)) — M3 HIP data push consumes its `care_contexts.encounter_id` linkage. Phase 0 leaves a TODO marker; real wiring lands when record-foundation has bundle-assembly capability.
- **Registration** ([ADR-0029](../../adr/0029-registration-as-encounter-intake-owner.md)) — M2 add-contexts publish is triggered by `registration.created` events with non-null `visit_id`.
- **Integration Platform / FSM engine** ([ADR-0027](../../adr/0027-fsm-orchestration-for-integration-hub.md)) — future owner. Phase 0 is the explicit anteroom.

## Next docs in this folder

- [`02-m1-flows.md`](./02-m1-flows.md) — endpoint surface for the first sprint.
- [`03-phase-a-implementation-matrix.md`](./03-phase-a-implementation-matrix.md) — Postman ↔ NHA ↔ platform routes (Phase A vs later).
- [`dev-guide.md`](./dev-guide.md) — step-by-step for the dev who's filling the stubs.
