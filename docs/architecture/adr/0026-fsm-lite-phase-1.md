# ADR-0026: FSM-lite for Phase 1; defer the generic engine to Phase 1.5

- **Status:** Proposed
- **Date:** 2026-05-13
- **Deciders:** [Architect], [Engineering Manager], [Co-Tech-Lead]
- **Supersedes (partially):** none — refines the **implementation timing** of [ADR-0027](./0027-fsm-orchestration-for-integration-hub.md), which remains the target architecture.
- **Related:** [ADR-0011](./0011-integration-hub-split.md) (Integration Hub split) | [ADR-0017](./0017-in-process-event-bus-phase-0.md) (Phase 0 bus) | [ADR-0024](./0024-audit-deferred-to-pre-prod.md) (audit deferred) | [dev-env-simplifications](../dev-env-simplifications.md)

## Context and problem statement

[ADR-0027](./0027-fsm-orchestration-for-integration-hub.md) commits the Integration Hub to a **custom FSM engine** for orchestrating multi-step external integrations (M1 Aadhaar OTP enrollment, scan-and-share, M2 care-context linking, M3 HIP, M3 HIU, consent lifecycle). The engine interprets FSM **definitions** stored as JSON, evaluates transition guards using JSON-Logic, executes a bounded catalog of declarative side-effects, and runs a separate timer-worker process with `SELECT … FOR UPDATE SKIP LOCKED` polling and pg_advisory_lock leader election.

That design is sound for the long term. It is *also* a meaningful piece of substrate for a developer to internalise before they can ship a single ABDM M1 flow. With the team's POC timeline (existing-production functional parity in a small number of sprints) and the team's relative unfamiliarity with both ABDM and the platform's architecture, building the generic engine *first* is a velocity risk:

- The engine adds ~2 dev-weeks (per [dev-guide Phase 0b](../lld/integration-platform/dev-guide.md)) before the first ABDM flow can even start.
- The developer must understand: (a) JSON definitions, (b) JSON-Logic guards, (c) the side-effect catalog, (d) the atomic transition flow, (e) the timer-worker semantics — all before writing a line of ABDM code.
- Debugging takes two passes: "is the engine wrong, or is my definition wrong?".
- The shape of the engine should *emerge* from concrete flows, not be invented upfront. The team currently has *zero* concrete flows in TypeScript to abstract from.

The opposite extreme — abandoning durable workflow state machines entirely and using ad-hoc status fields like the production HIMS does — is rejected at the start by [ADR-0027](./0027-fsm-orchestration-for-integration-hub.md). The cost of that path is well-documented in `abdi-lims-backed`.

A middle option exists: **keep the FSM schema tables, defer the generic engine, write Phase 1's six ABDM flows as plain TypeScript code** using small helpers that read and write those tables. The schema tables (`integration_workflows`, `integration_workflow_transitions`, `integration_workflow_timers`) earn their keep regardless of whether the engine is generic or hand-coded — they are where durable state lives, where audit-by-construction comes from, and where the timer worker polls.

## Decision drivers

- **POC velocity.** ~2 dev-weeks shaved off Phase 0; ABDM M1 flow ships sooner.
- **Cognitive surface.** Phase 1 devs write plain TypeScript with patterns they already recognise (functions, switch statements, repository calls). No JSON-Logic, no definition interpreter.
- **Concrete-before-abstract.** Two to three Phase 1 flows in TypeScript will reveal what the engine *actually* needs to abstract — and what it does not. Today's engine design is hypothesis; concrete code is evidence.
- **Schema forward-compatibility.** The FSM schema tables are unchanged between Phase 1 (hand-coded TS) and Phase 1.5 (generic engine). Existing workflow rows from Phase 1 remain valid when the engine arrives.
- **State-machine documentation stays authoritative.** Mermaid + JSON in [02-fsm-specifications.md](../lld/integration-platform/02-fsm-specifications.md) continues to be the source of truth for *what each flow does*. Phase 1 implements those state machines; it does not redefine them.
- **Audit-by-construction is preserved.** Every transition writes a row in `integration_workflow_transitions` whether it goes through a generic engine or a plain TypeScript helper. The audit substrate is unchanged.
- **The team's mental model.** The tech-lead and EM understand "TypeScript that reads and writes Postgres" instinctively. They want time to internalise a generic engine before betting on one.
- **Right-sized abstraction.** "An engine that handles 6 flows" with the current understanding is over-engineering. "An engine that handles N flows" after building 6 is engineering. The path is the same; the timing is the change.

## Considered options

### Option A — Build the generic engine first, then write flows

Per the original [ADR-0027](./0027-fsm-orchestration-for-integration-hub.md) and [dev-guide Phase 0b](../lld/integration-platform/dev-guide.md). The engine is generic-and-declarative from day one; flows are JSON files; the engine interprets them.

Rejected for Phase 1 only. The engine is the *target*; the *path* to it via concrete flows is faster.

### Option B — Abandon FSM entirely, use ad-hoc status fields

The production HIMS path. A `status` column on each protocol-specific table (`abdm_share_tokens.status`, `abdm_consent_artifacts.status`, etc.) with side-effects scattered across handler code.

Rejected at the start of analysis (see [ADR-0027 §considered options](./0027-fsm-orchestration-for-integration-hub.md#considered-options)). No durable retry, no timer enforcement, no audit-by-construction, no replay.

### Option C — FSM-lite: keep the schema tables, defer the generic engine

Phase 1's six ABDM flows are written as **plain TypeScript** that:

- Reads `integration_workflows.state` and `context` directly (via a typed repository).
- Calls outbound APIs in handler functions (`abdm.requestOtp`, `abdm.notifyOnShare`, etc.).
- Records each transition by INSERTing into `integration_workflow_transitions` *and* UPDATEing `integration_workflows.state` in the same DB transaction.
- Schedules timers by INSERTing rows into `integration_workflow_timers` directly.
- Uses a `switch (workflow.state)` to drive each ABDM gateway callback to the right handler.

A small helper package (`packages/ts-sdk-workflow/`) provides four functions used by every flow: `loadWorkflow`, `transitionTo(workflow_id, fromState, toState, contextPatch)`, `scheduleTimer`, `clearTimer`. **No JSON definitions, no JSON-Logic, no engine.**

The timer worker is a **singleton polling process** for Phase 1 — one instance, no leader election. Run as a separate process or as a registered Fastify lifecycle hook on a single service instance.

This is the chosen option.

## Decision outcome

Chosen option: **C — FSM-lite for Phase 1, generic engine deferred to Phase 1.5.**

### What changes in Phase 1

| Piece | ADR-0027 design | FSM-lite Phase 1 |
|---|---|---|
| State transitions | JSON definitions + JSON-Logic guards, interpreted by engine | TypeScript `switch (workflow.state)` + plain `if/else` guards |
| Side-effects | Declarative `side_effects[].kind` list; engine dispatches | Imperative TS calls in the per-flow handler |
| Timer scheduling | Engine reads `set_timer` side-effect | `scheduleTimer(workflow_id, kind, dueAt)` helper inserts row |
| Timer firing | Worker with leader election + JSON-Logic | Singleton polling worker, hardcoded handler dispatch |
| State persistence | `integration_workflows`, `integration_workflow_transitions`, `integration_workflow_timers` (unchanged) | Same three tables (unchanged) |
| Audit | Same — every transition is a row | Same — every transition is a row |
| Helper package | `packages/ts-sdk-workflow/` with `start`, `dispatch`, `cancel`, engine internals | `packages/ts-sdk-workflow/` with just `loadWorkflow`, `transitionTo`, `scheduleTimer`, `clearTimer` (~150 lines) |
| Code per ABDM flow | ~50 lines JSON | ~200-300 lines TS |
| Total engine code | ~1500 lines + JSON validator + Mermaid renderer | ~150 lines of helpers |

### What stays the same

- **[ADR-0027](./0027-fsm-orchestration-for-integration-hub.md) is still the target.** Phase 1.5 builds the generic engine on top of the FSM schema; existing Phase 1 flows are refactored into the engine then. The engine that emerges has 6 concrete flows worth of evidence behind it.
- **[02-fsm-specifications.md](../lld/integration-platform/02-fsm-specifications.md) remains authoritative as state-machine documentation.** The Mermaid state diagrams and JSON definition examples describe what each flow does, regardless of how it is implemented. Phase 1 implements those state machines in TypeScript; Phase 1.5 makes the JSON the runtime source.
- **The audit-by-construction property is preserved.** Every transition writes both an UPDATE on `integration_workflows` and an INSERT on `integration_workflow_transitions`, atomically. The centralized audit consumer projects from those rows regardless of which implementation wrote them.
- **The FSM schema tables are unchanged.** No migration is required to advance to Phase 1.5.
- **All four engine guarantees from ADR-0027 are preserved** — but enforced by per-flow code review in Phase 1 instead of engine code:
  - Atomic transition (single DB transaction).
  - Durable timers (rows in `integration_workflow_timers`).
  - Append-only audit (INSERT-only on `integration_workflow_transitions`).
  - Idempotent transitions (a transition that has already happened returns the existing row).

### Phase 1.5 trigger

The generic engine arrives when **at least one of** these conditions holds:

1. A second adapter (HL7v2 lab connector, FHIR partner integration, etc.) needs durable workflows. Adding a generic engine pays back across N adapters faster than copy-pasting helper-call patterns.
2. Workflow definition changes need a hot-reload path that does not require a code deploy. (Phase 1 changes the TypeScript and ships; Phase 2 may need faster cadence.)
3. The team has internalised the six Phase 1 flows and the patterns to abstract are visible.

When triggered: refactor the per-flow TypeScript into engine-readable JSON definitions, build the engine using the patterns observed across the six flows, and migrate flows one-at-a-time. The schema does not change; the workflow rows continue to be valid.

### Code sketch of a Phase 1 flow

To make the implementation pattern concrete:

```typescript
// modules/integration-hub/src/abdm/m1-aadhaar-otp.ts
import { loadWorkflow, transitionTo, scheduleTimer, clearTimer } from '@hims/ts-sdk-workflow';
import { abdmGateway } from '../outbound/abdm-gateway-client';
import { events } from '@hims/ts-sdk-events';

export async function startAadhaarOtp(ctx: TenantCtx, aadhaarNumber: string) {
  const workflow = await createWorkflow(ctx, {
    kind: 'abdm.m1.aadhaar-otp.v1',
    state: 'INIT',
    context: { aadhaarNumber },
  });
  const { txnId } = await abdmGateway.requestAadhaarOtp(aadhaarNumber);
  await transitionTo(workflow.id, 'INIT', 'OTP_REQUESTED', { txnId });
  await scheduleTimer(workflow.id, 'otp-expiry', minutesFromNow(5));
  return { workflowId: workflow.id };
}

export async function submitOtp(ctx: TenantCtx, workflowId: string, otp: string) {
  const wf = await loadWorkflow(ctx, workflowId);
  if (wf.state !== 'OTP_REQUESTED') throw new InvalidWorkflowState(wf.state);
  const result = await abdmGateway.verifyAadhaarOtp(wf.context.txnId, otp);
  await transitionTo(wf.id, 'OTP_REQUESTED', 'OTP_VERIFIED', { abhaProfile: result });
  await clearTimer(wf.id, 'otp-expiry');
  await events.publish('abdm.m1.otp-verified', { workflow_id: wf.id, abha: result, ... });
  // … rest of the M1 chain (create-address, link-to-patient) as further functions
}

export async function onOtpExpiryFired(ctx: TenantCtx, workflowId: string) {
  const wf = await loadWorkflow(ctx, workflowId);
  if (wf.state !== 'OTP_REQUESTED') return; // already moved on
  await transitionTo(wf.id, 'OTP_REQUESTED', 'EXPIRED', { reason: 'otp-timeout' });
  await events.publish('abdm.m1.otp-expired', { workflow_id: wf.id, ... });
}
```

The timer-worker dispatcher (Phase 1: singleton polling loop):

```typescript
// modules/integration-hub/src/timer-worker/dispatcher.ts
const HANDLERS = {
  'otp-expiry': (ctx, wfid) => abdmM1.onOtpExpiryFired(ctx, wfid),
  'consent-expiry': (ctx, wfid) => abdmConsent.onExpiryFired(ctx, wfid),
  // ...
};

async function tick() {
  const due = await db.selectFromWorkflowTimers()
    .where(/* fire_at <= now AND status = 'pending' */)
    .for('update').skipLocked()
    .limit(50);
  for (const timer of due) {
    const handler = HANDLERS[timer.kind];
    if (!handler) { /* mark error */ continue; }
    try {
      await handler(timerCtx(timer), timer.workflow_id);
      await markTimerFired(timer.id);
    } catch (e) { /* mark failed + retry */ }
  }
}
setInterval(tick, 5_000);
```

No leader election in Phase 1: one instance runs the worker. Locking is via `FOR UPDATE SKIP LOCKED` so even if a second instance came up, no timer would fire twice.

## Consequences

### Positive

- **Phase 0b shortened from ~3 weeks to ~3-4 days.** Phase 0b becomes "scaffold service + schema migrations + write the four helper functions + write the singleton timer worker," not "build the generic engine."
- **First ABDM flow ships in week 2-3 of Phase 1**, not week 5+.
- **Cognitive load on the Phase 1 dev is dramatically lower.** They write TS that calls TS — no engine, no JSON definitions, no JSON-Logic.
- **The state-machine docs (Mermaid + JSON) stay accurate as documentation** even though the runtime is TypeScript. The dev reads the diagram for *what to build*, writes the TypeScript for *how to build it*.
- **The engine that eventually emerges is informed by evidence.** Six concrete flows reveal what the engine actually needs.
- **EM / tech-lead approval risk drops.** "Plain TypeScript that reads and writes Postgres" is uncontroversial; "JSON-Logic-driven workflow engine with leader election" needs more selling.
- **Audit substrate is preserved.** The four-stream substrate ([ADR-0024](./0024-audit-deferred-to-pre-prod.md)) — workflow transitions, message logs, domain events, request logs — does not depend on whether the engine is generic or per-flow.

### Negative and mitigations

- **Code duplication across the six Phase 1 flows.** Each flow repeats ~50 lines of similar transition-and-timer code that a generic engine would have abstracted. Mitigation: the duplication is the *evidence* used to design the engine in Phase 1.5; it is recoverable, not lost.
- **Lose declarative auditability of the flow definitions.** "What transitions does flow X support?" becomes "read the TS file" instead of "read the JSON definition." Mitigation: the Mermaid state diagrams in [02-fsm-specifications.md](../lld/integration-platform/02-fsm-specifications.md) are the canonical answer; the TypeScript implements the diagram. Code review enforces correspondence.
- **Refactor cost in Phase 1.5 is real.** Extracting the engine from six concrete implementations is ~1-2 dev-weeks. **Net engine cost is similar to Option A**, but it is spent *later*, when the team has the context to do it well. Mitigation: this is intentional — concrete-before-abstract is the design discipline.
- **Per-flow code review is the enforcement mechanism for the four engine guarantees** (atomic transition, durable timers, append-only audit, idempotency). A careless flow could violate one. Mitigation: the helper functions in `@hims/ts-sdk-workflow` enforce most invariants (e.g., `transitionTo` writes both rows in one transaction); the PR review checklist asserts the rest.
- **Single-instance timer worker is a SPOF for Phase 1.** Mitigation: timer-fire latency tolerates a few minutes; if the worker is down the flow simply waits. `FOR UPDATE SKIP LOCKED` means no double-fire if multiple instances come up later. The leader-election work moves to Phase 1.5 alongside the generic engine.

### What this does not change

- [ADR-0027](./0027-fsm-orchestration-for-integration-hub.md) is **still the target architecture**. It is the spec the Phase 1.5 engine is built against.
- The FSM schema tables (`integration_workflows`, `integration_workflow_transitions`, `integration_workflow_timers`) are **unchanged**. No data migration on advancing to Phase 1.5.
- The state-machine specifications in [02-fsm-specifications.md](../lld/integration-platform/02-fsm-specifications.md) are **unchanged in content**. The Phase 1 TypeScript implements those state machines verbatim.
- The audit substrate is **unchanged**. ADR-0024's four-stream model applies identically.
- The five ABDM flows + consent supervisor that ADR-0027 enumerates are **all still built in Phase 1** — they're just built as TS, not as JSON definitions.

## Validation criteria

- A Phase 1 dev who joins the team can ship the M1 Aadhaar-OTP flow (start → OTP request → OTP verify → ABHA address create → link to EMPI patient) in **two sprints** end-to-end, including writing the use-cases, the inbound callback handlers, the outbound gateway client wraps, and the helper-package test suite.
- A workflow row written by Phase 1 TypeScript code is **structurally indistinguishable** from one that would be written by the Phase 1.5 generic engine (same columns, same transition log, same timer rows).
- The Mermaid state diagram in [02-fsm-specifications.md §3](../lld/integration-platform/02-fsm-specifications.md#3-abdmm1aadhaar-otpv1--abha-creation-via-aadhaar-otp) is **traceable** to the implementing TypeScript by state-name correspondence (every state in the diagram has a corresponding `'STATE'` literal in the TS; every transition in the diagram has a corresponding `transitionTo(..., 'FROM', 'TO', ...)` call).
- The PR review checklist for any FSM-lite flow asserts the four engine guarantees: atomic transition (single transaction), durable timers (row inserted, not in-memory `setTimeout`), append-only transitions (no UPDATE on `integration_workflow_transitions`), idempotency (replaying the same callback returns the existing row).

## References

- [ADR-0027 — FSM orchestration for Integration Hub](./0027-fsm-orchestration-for-integration-hub.md) (the target architecture; this ADR is the implementation-timing deferral, not a rejection)
- [ADR-0024 — Audit deferred to pre-prod](./0024-audit-deferred-to-pre-prod.md)
- [Integration Platform LLD §5 FSM engine](../lld/integration-platform/01-schema-design.md#5-fsm-engine-sections-51-54)
- [FSM specifications](../lld/integration-platform/02-fsm-specifications.md)
- [Integration Platform dev-guide Phase 0b](../lld/integration-platform/dev-guide.md)
- [dev-env-simplifications.md](../dev-env-simplifications.md)
- Pattern reference (concrete-before-abstract): Fowler, "Refactoring" (2018) §3 on extracting abstractions from concrete code rather than designing them upfront.
