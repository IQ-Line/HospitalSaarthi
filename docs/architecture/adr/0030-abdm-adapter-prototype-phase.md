# ADR-0030: ABDM Adapter prototype phase — ship M1 against the sandbox before the Integration Platform engine lands

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Architect (this session) with EM/Tech-Lead alignment on the unblock strategy
- **Consulted:** Architect (FSM design is still settling per [ADR-0027](./0027-fsm-orchestration-for-integration-hub.md))
- **Informed:** ABDM developer (picks up M1 sprint), EMPI / Record Foundation / Integration Platform module owners (downstream)

## Context and problem statement

The platform must integrate with the ABDM gateway across three milestones (M1 ABHA identity, M2 HIP-side care-context link + consent, M3 HIU-side consent + data fetch + HIP-side data push). The target architecture for orchestrating these flows is the **Integration Platform** with a custom FSM engine ([ADR-0027](./0027-fsm-orchestration-for-integration-hub.md)) plus a Phase-1 FSM-lite refinement ([ADR-0026](./0026-fsm-lite-phase-1.md)).

The architect is still digesting the FSM design (no prior experience building a state-machine engine in production code). The ABDM developer, meanwhile, has clear scope and time and would otherwise sit blocked.

**Question:** how do we let the ABDM dev start M1 work *now*, against the ABDM sandbox, *without* committing to architectural choices we haven't finalised?

Two adjacent concerns sit nearby and must not be conflated:

- **The FSM engine itself.** State-machine definitions in YAML, generic transition runner, side-effect dispatcher, durable workflow context. *Designed in ADR-0027 / 0026, not yet built.*
- **The ABDM-specific protocol types + outbound calls.** OpenAPI-derived DTOs, gateway client, Fidelius envelope helper, per-flow orchestration. *Implementation work that doesn't depend on the FSM engine being final, as long as the resulting code can be ported into the engine cleanly.*

## Decision drivers

- **Unblock the dev today.** Spec-conformance work (Fidelius, callback timing, gateway quirks) is the long-pole risk for ABDM Facilitation Testing. Starting M1 against the sandbox surfaces those issues earlier than waiting on the FSM design.
- **Don't commit to choices we haven't finalised.** The FSM engine's `integration_workflows` table shape, transition spec format, and side-effect dispatcher contract are open. Pre-implementing against speculative shapes risks rework when the design lands.
- **Don't write throwaway code.** Whatever ships in Phase 0 must port into the FSM engine cleanly. The cost of a port that re-shapes business logic is the same as a rewrite — to be avoided.
- **Match the monorepo's existing conventions.** `modules/<name>/` for module shape, `services/<name>-svc/` for thin Fastify deployable, `packages/<name>/` for shared libraries. Per [CLAUDE.md](../../../CLAUDE.md) and [ADR-0008](./0008-module-shape-and-boundaries.md).
- **Reference impl available.** The production HIMS (`hims/abdi-lims-backed`) carries a working M1/M2/M3 implementation in Express + Mongo. Useful for *what state to persist* and *which gateway quirks to expect*; harmful to copy structurally (monolith Express service with a giant Mongo `Session` document).

## Considered options

1. **Option A — Build a Phase 0 `modules/abdm-adapter/` + `services/abdm-adapter-svc/` with discipline that makes it port cleanly to the FSM engine later.** Single PG table for state, pure-function use-cases, port-adapter pattern for outbound HTTP / Fidelius / secrets. M1 ships against the sandbox now; M2/M3 protocol DTOs are scaffolded but not implemented. When the FSM engine ships, use-cases become side-effect handlers verbatim and the `abdm_sessions` table rows port one-to-one into `integration_workflows`.
2. **Option B — Wait for the FSM engine before any ABDM code.** Architect finalises ADR-0027 + the engine implementation, then the ABDM dev builds against the final shape.
3. **Option C — Build ABDM as a "throwaway" prototype outside the module convention.** A scratch service under `packages/abdm-adapter-prototype/` or similar, with explicit "this will be replaced" framing.
4. **Option D — Embed ABDM directly in `services/bff` for now.** No new module; just a few handlers under the BFF that call the gateway directly. Move out when the FSM engine is ready.

## Decision outcome

Chosen option: **Option A — Phase 0 module with port-ready discipline.**

The Phase 0 module looks like every other module in the monorepo and is *named* like the eventual target (`abdm-adapter`, not `abdm-adapter-prototype`). What's "prototype" about it is the internal implementation, not the path: no FSM engine yet, one table instead of the `integration_platform` schema, explicit state transition calls instead of FSM dispatch. The README, dev-guide, and this ADR carry that status visibly; the file paths do not.

Discipline that makes the port clean:

1. **Use-cases are pure functions** of signature `(input, deps: AbdmAdapterDeps) => Promise<Result>`. No globals, no module-level state. The FSM engine consumes the same signature for side-effect handlers.
2. **Ports for every external dependency** — `AbdmSessionsPort`, `GatewayClient`, `FideliusEncryptor`, `SecretsClient`. Concretions live in `data-access/`; tests pass fakes.
3. **State transitions are named**, using the FSM state-name constants already in `@hims/ts-sdk-abha/constants/fsm-states`. Even though no FSM engine drives them in Phase 0, the names are FSM-engine-ready.
4. **State lives in one place** — a single `abdm_adapter.abdm_sessions` table with scalar lookup columns + `context JSONB` for the long tail. Maps one-to-one to `integration_workflows.context` at port time.
5. **Protocol types are derived from the spec**, not freehand. The dev sources `@hims/ts-sdk-abha/protocol/{m1,m2,m3}` from `docs/external/abdm/v3-m*.md` + `docs/external/abdm-wrapper/docs/wrapperV3.yaml` and reviews against both.

The scaffolding ships in the same PR as this ADR. M2/M3 protocol DTOs are present as empty stubs to lock the file layout; populating them is a follow-up that does not block M1 work.

### Consequences

**Positive:**

- **ABDM dev unblocks immediately.** M1 sprint starts the day this PR merges.
- **FSM design has time to settle.** The architect can finalise ADR-0027's transition spec, side-effect dispatcher, and `integration_workflows` shape without blocking other work.
- **Spec-conformance risk surfaces early.** Fidelius envelope quirks, sandbox-vs-production gateway differences, ABDM error code catalogue — all encountered during M1 work, weeks before they would be otherwise.
- **No name churn.** When the FSM engine lands, the module + service paths stay the same; only the internal implementation evolves.

**Negative / accepted trade-offs:**

- **Two state-machine vocabularies coexist briefly.** Phase 0 uses explicit `sessions.patch({ state: 'OTP_VERIFIED' })` calls; Phase 1.5 will replace those with FSM-engine dispatch. Mitigation: the state *names* are already FSM-aligned, so the migration is mechanical.
- **`abdm_sessions` table will be retired.** A one-time data-copy migration into `integration_workflows` is required before any production tenant goes live. The migration is small (one table, well-typed JSONB blob) but it's real work. Mitigation: ADR-0030 documents the column mapping explicitly; the migration script is a follow-up issue.
- **Protocol DTOs are work the dev does, not the architect.** Risk that types drift from the v3 spec. Mitigation: the dev-guide mandates dual-sourcing from the v3 markdown + wrapperV3.yaml + cross-check via review.
- **Phase 0 has no FSM-driven retry / replay.** If a gateway call fails mid-flow, the session row's `state` indicates where to resume but there's no automatic recovery. Acceptable for sandbox + early production; the FSM engine adds this later.
- **No tenant-onboarding UX yet.** ABDM gateway credentials live in env vars in Phase 0; per-tenant credential management lands with the tenant onboarding tool. Mitigation: dev-guide calls this out as a known gap.

**Follow-up actions:**

- [ ] ABDM developer fills M1 protocol DTOs + use-cases + REST handlers per [dev-guide.md](../lld/abdm-adapter/dev-guide.md).
- [ ] First M1 sandbox-conformance run logged as an issue with output captured (informs the M2 / M3 sprint scoping).
- [ ] When ADR-0027 (FSM engine) is finalised: add a `migrations/0001_port_to_integration_workflows.sql` script copying `abdm_sessions` rows into the new schema; this ADR is superseded by that PR (mark Status: "Superseded by ADR-NNNN" at that time).
- [ ] Tenant credential provisioning: replace env-var-only model with the future `tenant.abdm_credentials` table owned by the Configurator module (open follow-up issue).
- [ ] Telemetry: when the platform-wide metrics client lands, replace `// TODO(metrics)` markers in M1 use-cases with real counter calls.
- [ ] Citus distribution: run `SELECT create_distributed_table('abdm_adapter.abdm_sessions', 'iq_tenant_id')` before any tenant onboards to production. The Phase 0 migration leaves a TODO comment marking the call site.

## Pros and cons of the options

### Option A — Phase 0 module with port-ready discipline (chosen)

- *Good:* Unblocks the dev now; FSM design has time to settle.
- *Good:* Matches existing monorepo conventions — no special-case structure.
- *Good:* Discipline ports use-cases verbatim into the FSM engine; only the orchestrating shell changes.
- *Good:* M1 sandbox-conformance risk surfaces weeks early.
- *Bad:* One-time data-copy migration required before production.
- *Bad:* Brief vocabulary mismatch (`sessions.patch` vs FSM dispatch) until the engine lands.

### Option B — Wait for the FSM engine

- *Good:* No port work later; the dev builds against the final shape.
- *Bad:* ABDM dev is blocked for weeks while the architect finalises the FSM design.
- *Bad:* Spec-conformance risk discovered late — closer to Facilitation Testing window.
- *Bad:* Productivity loss on a developer with a clear scope and reference implementation available.

### Option C — Throwaway prototype path (`packages/abdm-adapter-prototype/`)

- *Good:* Explicit "this will be replaced" framing eliminates ambiguity.
- *Bad:* Module path change at port time creates a noisy rename PR + breaks any in-flight references.
- *Bad:* `packages/` is the libraries convention; a deployable Fastify service there is structurally wrong.
- *Bad:* Encourages "throwaway" mindset — code quality may slip because "we'll rewrite anyway."

### Option D — Embed in BFF

- *Good:* Smallest surface (no new module + service).
- *Bad:* Violates [ADR-0015](./0015-bff-role-zero-trust.md) — BFF is a thin proxy, not a place for external-system orchestration.
- *Bad:* M2/M3 callbacks would muddy BFF responsibilities further.
- *Bad:* No clear extraction path when the FSM engine lands.

## Links

- Related ADRs:
  - [ADR-0008 — Module shape and boundaries](./0008-module-shape-and-boundaries.md) (this module follows the standard shape)
  - [ADR-0009 — Event-driven inter-module communication](./0009-event-driven-inter-module-communication.md) (M1 emits `abdm.session.state-changed`; EMPI projects `patient.abha-linked`)
  - [ADR-0012 — Multi-tenancy isolation strategy](./0012-multi-tenancy-isolation-strategy.md) (composite PK `(iq_tenant_id, session_id)`; Citus distribution before production)
  - [ADR-0019 — Fastify v5 / Node 24 LTS](./0019-fastify-node24-lts.md) (service runtime)
  - [ADR-0024 — Audit deferred to pre-prod](./0024-audit-deferred-to-pre-prod.md) (no per-module audit table)
  - [ADR-0026 — FSM-lite for Phase 1](./0026-fsm-lite-phase-1.md) (this ADR is the "lite" — see §"Decision outcome")
  - [ADR-0027 — FSM orchestration for Integration Hub](./0027-fsm-orchestration-for-integration-hub.md) (the eventual target this module ports to)
  - [ADR-0028 — Record Foundation as fifth core module](./0028-record-foundation-fifth-core-module.md) (M3 HIP push consumes its `care_contexts`)
- Related LLD: [docs/architecture/lld/abdm-adapter/](../lld/abdm-adapter/) (01-overview, 02-m1-flows, dev-guide)
- Reference implementation: `hims/abdi-lims-backed/` (production HIMS — read, do not copy structurally)
- External spec: `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md` + `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
