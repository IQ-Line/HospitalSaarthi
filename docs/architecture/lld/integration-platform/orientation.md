# Integration Platform — Module Orientation

**For the developer who just got assigned to Integration Hub.** 10-minute read; points you at the 4-5 files you'll actually touch.

---

## What this module does, in one paragraph

Integration Hub owns **transport** between the platform and external systems — currently ABDM, later HL7v2 lab analyzers, FHIR partners, and any other inbound/outbound connector. It exposes an integration registry, a durable workflow FSM for multi-step flows (M1 ABHA enrollment, scan-and-share, M2 care-context linking, M3 HIP and HIU, consent lifecycle), and the inbound/outbound message logs that the future centralized audit consumer projects from. It does **not** own clinical data (Record Foundation) or patient identity (EMPI) — it's the courier, not the librarian.

Lives in `modules/integration-hub/`, deployed in `services/integration-hub-svc/` (its own service from day one — always-deployed platform infrastructure per [ADR-0011](../../adr/0011-integration-hub-split.md)).

> **Active work (2026-05):** [Phase 1a — restructure + per-tenant credentials](../integration-hub/01-phase-1a-restructure-and-multi-tenant.md) ([issue #143](https://github.com/IQ-Line/HospitalSaarthi/issues/143)) ships the ABDM code move and `configurator.tenant_integration_profiles` first. The full 13-table control plane and FSM/timer worker below remain **deferred**.

---

## Where to start

1. **[HLD 05 — Integration and interop](../../hld/05-integration-and-interop.md)** — start here for the big picture and the cross-module ownership table.
2. **[ADR-0011](../../adr/0011-integration-hub-split.md)** — why Integration Hub is platform infrastructure, not a feature module.
3. **[ADR-0027](../../adr/0027-fsm-orchestration-for-integration-hub.md)** — why we built a custom FSM engine (rejected Temporal/Inngest/Camunda).
4. **[ADR-0026 — FSM-lite Phase 1 deferral](../../adr/0026-fsm-lite-phase-1.md)** — the Phase 1 implementation simplification. **Read this immediately after ADR-0027** — without it, you'll over-engineer.
5. **[01-schema-design.md](./01-schema-design.md)** — 13 tables: 7 generic (control plane + FSM engine), 6 ABDM-specific.
6. **[02-fsm-specifications.md](./02-fsm-specifications.md)** — the M1/M2/M3 state machines as Mermaid + reference JSON. **These are still authoritative as state-machine documentation** even though Phase 1 implements them as plain TypeScript (per ADR-0026).
7. **[03-scenarios.md](./03-scenarios.md)** — 7 sequence diagrams of end-to-end ABDM flows.
8. **[dev-guide.md](./dev-guide.md)** — your phased checklist.

Then the cheat-sheet: **[docs/architecture/dev-cheatsheet.md](../../dev-cheatsheet.md)**. Pin it.

---

## The 4-5 files you'll touch most

| Path (after scaffold) | What | When you edit |
|---|---|---|
| `modules/integration-hub/src/abdm/<flow>.ts` | One file per ABDM flow (e.g., `m1-aadhaar-otp.ts`, `scan-and-share.ts`). Plain TypeScript per ADR-0026 — `loadWorkflow`, `transitionTo`, `scheduleTimer`, `clearTimer` helpers from `@hims/ts-sdk-workflow`. | Every new ABDM flow. |
| `modules/integration-hub/src/inbound-gateway/handlers/` | Fastify handlers for ABDM callbacks (`/v3/profile/on-share`, `/v3/care-context/notify`, etc.). | Each callback route. |
| `modules/integration-hub/src/outbound/abdm-gateway-client.ts` | Outbound HTTP client to ABDM gateway. Handles session caching (`abdm_gateway_sessions`), Fidelius envelope encryption. | Wrap each gateway API. |
| `modules/integration-hub/src/data-access/drizzle-<entity>-repository.ts` | Repository classes for `integrations`, `integration_workflows`, etc. | Adding queries. |
| `modules/integration-hub/src/schema/<table>.ts` | Drizzle table defs. | Adding a table or column. |
| `specs/openapi/integration-hub.v1.yaml` | API contract for callers (`/api/v1/abdm/abha/enroll`, etc.). | Change endpoint shape. |

Less-frequently touched:

- `modules/integration-hub/src/inbound-gateway/middleware.ts` — message-log middleware; set-and-forget.
- `modules/integration-hub/src/timer-worker/main.ts` — polls `integration_workflow_timers`; the runtime, not your code.

---

## The mental model

> Integration Hub is a **dispatcher with durable state machines**. An inbound callback creates an `integration_inbound_messages` row (operational log) and finds the matching `integration_workflows` row by `external_correlation_id`. The flow's TypeScript handler transitions the workflow's state, schedules outbound calls or timers, and exits. The same handler runs again when the timer fires or another callback arrives. The database is the source of truth for every workflow's state, every message in or out, every state transition (audit-by-construction).

If you remember nothing else:
1. **The FSM definition is documentation; the TypeScript flow is the implementation** (per ADR-0026).
2. **`integration_workflow_transitions` is append-only — every state change writes a row, never a mutation.**
3. **No PHI in the inbound/outbound message rows** — bodies live at `payload_storage_ref`, the row carries metadata only.
4. **Secrets resolve via `@hims/ts-sdk-secrets` with `env:` scheme as Phase 0/1 default** — your `.env` works for ABDM sandbox.

---

## What to ignore in Phase 1

- **The generic FSM engine** — ADR-0026 defers it to Phase 1.5. Phase 1 implements the M1 / scan-and-share / M2 / M3-HIP / M3-HIU / consent-lifecycle flows as plain TypeScript using the FSM schema tables. **JSON-Logic guards, declarative side-effect catalog, definition validators, Mermaid generator — all deferred.**
- **`integration_audit_log`** — removed. The four substrates (workflow transitions, inbound/outbound message logs, rich domain events, structured request logs) are what the centralized audit consumer projects from. See [§4.4 of the schema design](./01-schema-design.md#44-audit-posture--no-per-module-audit-table).
- **Azure Key Vault / AWS Secrets Manager wiring** — `env:` scheme is enough. The pre-prod gate covers the migration.
- **`STRICT_SPEC_VALIDATION=true`** — nightly CI handles spec-drift; PR loop stays fast.

---

## Common pitfalls

| Trap | What to do instead |
|---|---|
| "Let me build the generic engine first." | Don't. Ship M1 as plain TS. Engine emerges from 2-3 concrete flows. See [ADR-0026](../../adr/0026-fsm-lite-phase-1.md). |
| "I'll skip writing a workflow transition row and just update `integration_workflows.state` directly." | Every state change writes both — UPDATE the workflow row + INSERT a transition row, atomically. Audit-by-construction depends on it. |
| "I'll log the ABDM callback payload inline in `integration_inbound_messages.payload`." | Payload lives at `payload_storage_ref`; the row carries metadata only. PHI rule. |
| "Let me use `azure-keyvault://` in `.env`." | `env:ABDM_CLIENT_SECRET` directly. The `azure-keyvault://` scheme is for a real vault, not as a URI in an env var. |
| "I'll add a `record_audit` side-effect to the FSM." | Removed. State transitions are already audited by `integration_workflow_transitions`. |
| "I'll create my own outbound HTTP client for each ABDM endpoint." | One `abdm-gateway-client.ts` with session caching + Fidelius helpers. Each endpoint method wraps it. |

---

## When you hit a decision the LLD doesn't cover

Look in **[dev-doubts/01.md](./dev-doubts/01.md)** — 12 implementation choices with recommendations. New ones get added there, then surfaced in architecture review.
