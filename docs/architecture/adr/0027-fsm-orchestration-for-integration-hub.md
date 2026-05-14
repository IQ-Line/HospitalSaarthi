# ADR-0027: Custom FSM engine for Integration Hub multi-step workflows

- **Status:** Proposed — target architecture. **Phase 1 implementation deferred per [ADR-0026](./0026-fsm-lite-phase-1.md).**
- **Date:** 2026-05-08 (revised 2026-05-13 to point at ADR-0026)
- **Deciders:** [Architect], [Engineering Manager], [Co-Tech-Lead]

> **Phase 1 implementation note.** This ADR remains the target architecture: a generic FSM engine that interprets JSON workflow definitions. [ADR-0026](./0026-fsm-lite-phase-1.md) defers building the engine itself to Phase 1.5 and prescribes hand-coded TypeScript per ABDM flow for Phase 1, using the same FSM schema tables (`integration_workflows`, `integration_workflow_transitions`, `integration_workflow_timers`). The audit-by-construction property and the schema are preserved; only the engine's *interpretation* of declarative definitions is deferred. The state-machine specifications in [02-fsm-specifications.md](../lld/integration-platform/02-fsm-specifications.md) remain authoritative as documentation for both phases.

## Context and problem statement

[ADR-0011](./0011-integration-hub-split.md) established the Inbound Gateway + Outbound Connector split with a shared control plane and explicitly deferred the choice of orchestration mechanism for multi-turn integration flows: *"Evaluate workflow engines (Temporal, Inngest, custom FSM) for ABDM and other multi-turn integration flows -- likely an LLD-phase decision for the Integration Hub."*

This is that LLD-phase decision. ABDM's three milestones produce flows that span hours to days, alternate between platform-initiated and gateway-initiated steps, and have explicit timeouts and compensating actions:

- **M1 (ABHA enrollment):** generate-OTP -> verify-OTP -> create-ABHA -> create-address -> link-token. Each step is a separate ABDM gateway round-trip with its own `txnId`. State must persist across the human delay between steps (the patient receives an OTP on their phone and types it in, possibly minutes later).
- **M2 (care-context linking):** discovery -> patient-match -> link-init -> OTP-verify -> link-confirm. Discovery is gateway-initiated; the rest is platform-initiated. Tokens (`linkToken`) returned mid-flow must be persisted and replayed on subsequent steps.
- **M3 (consent + data exchange, HIP side):** consent-notification (inbound) -> consent-grant -> data-request -> bundle-assembly -> encrypt-and-push -> acknowledgment. Lasts hours-to-days. Consent expiry triggers automatic state transitions. Data must be erased after `dataEraseAt`.
- **M3 HIU side:** consent-init -> patient-approval (inbound async) -> data-fetch -> bundle-receive -> store -> notify-doctor.

Production reality (verified against `hims-production`'s `abdi-lims-backed` service): each milestone is implemented as a `Session` MongoDB document tracking `txnId`, `xToken`, `tToken`, `linkToken`, an array of `careContext`s, and a `status` field. State transitions happen across separate HTTP handler invocations responding to ABDM gateway callbacks. Without an explicit FSM abstraction, this state-tracking logic is scattered across handlers as ad-hoc `if (session.status === 'X' && payload.foo) update to 'Y'` branches -- correct, but unmaintainable as integrations multiply.

The pattern is not unique to ABDM ([ADR-0011, "Durable workflow state machines for multi-turn external integrations"](./0011-integration-hub-split.md#durable-workflow-state-machines-for-multi-turn-external-integrations)). Insurance claim adjudication, lab order lifecycles, and any future webhook-driven integration will exhibit the same shape.

## Decision drivers

- **Durability across process restarts.** A workflow instance must survive Fastify pod restarts, deployments, and node failures. State lives in PostgreSQL, not in process memory.
- **Timeouts trigger state transitions.** ABDM consent has `dataEraseAt`. M1 OTPs expire in 10 minutes. The orchestration engine must fire a transition automatically at a wall-clock deadline, not require an external scheduler to poll.
- **Auditability per transition.** Every state change must be logged with the trigger (callback / timeout / admin action), the prior state, the new state, the correlation ID, and the `iq_tenant_id`. This is regulatory: ABDM Facilitation Testing requires evidence that each milestone's protocol contract was honoured.
- **Polyglot future.** [ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md) commits to a polyglot monorepo; some integrations may be implemented in Python or Go. The state-machine engine should not lock the platform into a Node-only runtime.
- **Operational maturity available to the team.** Adding a new long-running stateful service (Temporal, Camunda) introduces an operational burden. The team is small (~7 devs, 2 leads) and is already adopting Cerbos, Citus, better-auth, Fastify -- adding another stateful infrastructure component has a cost.
- **PostgreSQL is already in the stack.** [ADR-0013](./0013-single-database-engine-postgresql.md) made PostgreSQL the single database engine. PostgreSQL with `LISTEN/NOTIFY` and `pg_cron` (or an in-process timer with a `SELECT ... FOR UPDATE SKIP LOCKED` polling pattern) is sufficient for the workflow rates the platform will see (workflow concurrency in low thousands, not millions).
- **No remote orchestrator dependency.** The Integration Hub must continue functioning during transient gateway/network issues. A self-contained FSM keeps the failure domain inside the platform.

## Considered options

1. **Temporal** (managed or self-hosted) -- a durable workflow engine with first-class Saga, retry, and timer primitives. SDK in Go/Java/TypeScript/Python.
2. **Inngest** (managed) -- an event-driven serverless workflow platform with TypeScript-native SDK and durable execution.
3. **Camunda (BPMN) / Zeebe** -- BPMN 2.0 workflow engine with a visual designer.
4. **Custom FSM engine inside Integration Hub**, backed by PostgreSQL tables (`integration_workflows`, `integration_workflow_transitions`, `integration_workflow_timers`), with state definitions registered as configuration per integration.
5. **Ad-hoc state tracking** -- no formal FSM; each handler updates a `status` field on a session row, as in `abdi-lims-backed` today.

## Decision outcome

Chosen option: **Custom FSM engine inside Integration Hub backed by PostgreSQL**, because the workflow rates and complexity are well within what a small relational-backed FSM handles, the team avoids operating a separate stateful workflow service, the polyglot story is preserved (any language can read/write the workflow tables and call the FSM HTTP API), and the engine reuses the platform's existing PostgreSQL + Citus infrastructure.

The engine is generic. ABDM is the *first* integration to register its FSM definitions (M1, M2, M3-HIP, M3-HIU), but the engine itself has no ABDM knowledge -- the same engine will run insurance claim FSMs, lab analyzer FSMs, and any future multi-turn integration.

This decision is deliberately reversible. If workflow volume grows beyond what the relational FSM can handle, or if BPMN visualization becomes a stakeholder requirement, the Integration Hub can swap the engine implementation behind its `WorkflowEngine` port. State definitions are configuration; switching engines does not invalidate them.

### Consequences

**Positive:**

- No new operational dependency. PostgreSQL is already in the stack with HA and backup discipline.
- The FSM engine is part of the Integration Hub schema, so all workflow state, audit, and timer rows live in `integration_hub.*`. A single `pg_dump` captures the integration state for a tenant.
- Polyglot-friendly. A future Python adapter writes to `integration_hub.integration_workflows` directly via the database, or calls the engine's HTTP API. No Temporal SDK required per language.
- Custom transitions are trivial to express. ABDM's "consent expired -> auto-revoke -> mark all care contexts un-shareable" is a row update plus a transition event; in Temporal/Camunda the same rule requires SDK familiarity.
- Audit-by-construction. Every transition writes a row to `integration_workflow_transitions`. Compliance evidence is a `SELECT ... ORDER BY occurred_at`.
- Zero cost. No license, no SaaS bill, no separate cluster.

**Negative / accepted trade-offs:**

- The team owns the engine code. Bugs in retry, timer firing, or transition idempotency are on the team to fix, not on Temporal's engineers.
- Visual workflow modelling is unavailable without extra work. Mitigation: the FSM definitions are JSON; a lightweight Mermaid renderer (built-in to the docs site) shows them visually for each integration. This is sufficient for current stakeholders. BPMN-style designers are not on the roadmap.
- Distributed-saga rollback is harder to express than in Temporal. Mitigation: ABDM's compensating actions (e.g., "the patient denied consent -> mark request denied + audit") are simple state transitions, not distributed transactions across multiple services. The platform does not currently host workflows that span more than one external system per workflow.
- Engineers unfamiliar with FSM design need a spec. Mitigation: the LLD (`integration-platform/02-fsm-specifications.md`) defines the FSM contract, transition rules, and the test pattern (one Vitest file per FSM definition).

**Follow-up actions:**

- [ ] Define the `integration_workflows`, `integration_workflow_transitions`, `integration_workflow_timers` table schemas in [Integration Platform LLD](../lld/integration-platform/01-schema-design.md).
- [ ] Implement the engine as a TS package `@hims/ts-sdk-workflow` so non-Integration-Hub services (e.g., a future scheduling module) can reuse it.
- [ ] Define the timer-firing strategy: `pg_cron` extension vs in-process worker vs external scheduler. Decision deferred to LLD.
- [ ] Document the FSM definition format (state names, transition events, guard conditions, side-effects, timeouts) and provide JSON Schema validation in CI.
- [ ] Provide a Mermaid renderer that consumes a definition file and emits a state-diagram for each registered integration.

### How this differs from "ad-hoc state tracking"

It might appear that updating a `status` field per handler -- as `abdi-lims-backed` does today -- is equivalent to a custom FSM. The difference is enforcement and audit:

| Concern | Ad-hoc status field | Custom FSM engine |
|---|---|---|
| Invalid transitions (e.g., `LINKED` -> `OTP_REQUESTED`) | Caught only by reading code | Rejected by engine; impossible to express |
| Timeout-driven transitions | Requires a separate cron job per integration | First-class: every transition can declare a `timeout_at` |
| Retry on transient failure | Bespoke per handler | Single retry policy per transition |
| Audit trail of state changes | Implicit in row updates; requires `updated_at` archaeology | Explicit `integration_workflow_transitions` row per change |
| Cross-integration consistency | Each integration invents its own status vocabulary | Shared engine vocabulary (created/transitioned/timed-out/cancelled/failed/completed) |
| Replayability for tests | Hard | Test fixture is a sequence of transition events |

The ad-hoc approach worked for `abdi-lims-backed` because it had one integration (ABDM). The new platform will host many; an engine is the only way to keep them coherent.

## Pros and cons of the options

### Temporal

- *Good:* Industry-leading durable workflow engine, used by Snap, Coinbase, Datadog. First-class Saga, retry, child-workflow, and signal primitives.
- *Good:* Per-language SDKs with type-safe activity definitions.
- *Good:* Built-in visualization (Temporal UI).
- *Bad:* Adds a new stateful service to operate (history service, frontend service, matching service, plus a database). Requires a separately managed Cassandra/PostgreSQL/MySQL cluster. Operational complexity is real ([Temporal Self-Hosted Production Deployments Guide](https://docs.temporal.io/cloud/get-started)).
- *Bad:* Couples the platform to Temporal's worker model. Workflows are SDK code, not declarative definitions. A Python integration adapter would need the Temporal Python SDK, increasing per-language complexity.
- *Bad:* Workflow volume is well below where Temporal's strengths matter. The platform's expected workflow concurrency is in the low thousands across all tenants; Temporal targets millions.
- *Bad:* SaaS Temporal Cloud incurs a recurring cost; self-hosted requires a dedicated cluster.

### Inngest

- *Good:* TypeScript-native SDK with elegant `step.run()` primitives.
- *Good:* Managed-only (no cluster to operate).
- *Bad:* Vendor lock-in. Inngest is a SaaS-only product; self-hosting is not the supported path. The platform's data residency requirements (Indian healthcare data, DPDP Act) make a foreign SaaS dependency a hard sell ([Digital Personal Data Protection Act, 2023](https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf)).
- *Bad:* TypeScript-only SDK. Polyglot story breaks.
- *Bad:* Egress of workflow payloads to a third-party SaaS contradicts the security posture for ABDM/ABHA data.

### Camunda (BPMN) / Zeebe

- *Good:* BPMN 2.0 standard. Visual designer (Camunda Modeler). Workflow definitions are XML files versioned in Git.
- *Good:* Strong audit and compliance story; common in regulated enterprises.
- *Bad:* BPMN is heavy for the patterns the platform actually needs. ABDM's M1 FSM has 6 states; expressing it in BPMN is over-engineering.
- *Bad:* Camunda Platform 8 is SaaS or self-hosted Kubernetes-native. Camunda 7 is being deprecated. Either path adds substantial operational scope.
- *Bad:* Java-centric. Polyglot story is poor.

### Custom FSM engine on PostgreSQL

- *Good:* Zero new infrastructure. Reuses Citus distribution by `iq_tenant_id`; per-tenant workflows are colocated with tenant data.
- *Good:* JSON-defined FSMs are language-agnostic. A definition file is consumed identically by TS and Python.
- *Good:* Full ownership of behaviour. No vendor SDK dance for unusual transitions.
- *Good:* Trivially testable. The engine is a pure function `(currentState, event) -> nextState`; replay tests are list-of-events.
- *Bad:* Team must build and maintain the engine. Estimated: ~2 dev-weeks for v1 (definition format, transition executor, timer worker, audit logger, JSON Schema validator, Mermaid renderer).
- *Bad:* No visual designer. JSON + Mermaid is the substitute.
- *Bad:* If the platform later needs cross-service distributed sagas with compensating transactions across multiple Drizzle databases, the FSM engine will need extension or replacement.

### Ad-hoc state tracking

- *Good:* No engine to write. Faster initial coding.
- *Bad:* Every concern from the comparison table above is unsolved. Will not survive a second integration cleanly. Already failed once in `abdi-lims-backed` (the team has had to debug "stuck" sessions in production).

## Links

- Related ADRs:
  - [ADR-0011 -- Integration Hub split](./0011-integration-hub-split.md) -- this ADR fulfils ADR-0011's deferred follow-up on workflow engine selection
  - [ADR-0008 -- Module Shape and Boundaries](./0008-module-shape-and-boundaries.md) -- workflow engine lives in `@hims/ts-sdk-workflow`, used by Integration Hub
  - [ADR-0013 -- Single database engine PostgreSQL](./0013-single-database-engine-postgresql.md) -- justifies reusing PostgreSQL for workflow state
  - [ADR-0016 -- Polyglot Nx monorepo, spec-first](./0016-polyglot-nx-monorepo-spec-first-contracts.md) -- the polyglot constraint that ruled out TS-only engines
- Related HLD: [HLD 05 -- Integration and Interop, sections 1.1, 4, 7](../hld/05-integration-and-interop.md#11-the-blurred-boundary--abdm-flows)
- Related LLD: [Integration Platform LLD -- FSM specifications](../lld/integration-platform/02-fsm-specifications.md) (target document)
- External sources:
  - Hector Garcia-Molina, Kenneth Salem, "Sagas", *Proceedings of the 1987 ACM SIGMOD International Conference on Management of Data* (the original Saga paper), https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf -- the conceptual basis for long-running, compensable workflows
  - Chris Richardson, *Microservices Patterns* (Manning, 2018), Chapter 4 ("Saga pattern") and Chapter 8 -- modern application of the Saga pattern to multi-service workflows
  - Gregor Hohpe and Bobby Woolf, *Enterprise Integration Patterns* (Addison-Wesley, 2003), "Process Manager" pattern (pp. 312-321) -- the canonical pattern for stateful coordination across multiple steps
  - Temporal Technologies, "Temporal Documentation -- Workflow Execution", https://docs.temporal.io/workflows, accessed 2026-05-08 -- reference for what a managed durable-workflow engine provides; not chosen for the reasons above
  - Camunda, "BPMN 2.0 Reference", https://docs.camunda.io/docs/components/modeler/bpmn/, accessed 2026-05-08 -- reference for BPMN-based orchestration; not chosen
  - PostgreSQL Global Development Group, "PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED`", https://www.postgresql.org/docs/16/sql-select.html#SQL-FOR-UPDATE-SHARE -- the primitive used by the timer worker to safely poll due workflow timers
  - National Health Authority, "ABDM Wrapper -- Reference Implementation", https://github.com/NHA-ABDM/ABDM-wrapper -- treated as protocol reference; the wrapper implements ABDM milestones with implicit state tracking, demonstrating the operational need for explicit FSMs in any multi-integration platform
