# Integration Platform — Target Orchestration: Durable Execution (Temporal)

**Status:** Future direction, explored and documented (2026-05-18). Not chosen for Phase 1. Re-evaluation triggers in §10.
**Related:** [04-orchestration-phase-1-http-first.md](./04-orchestration-phase-1-http-first.md) (current Phase 1 design), [02-fsm-specifications.md](./02-fsm-specifications.md), [ADR-0011](../../adr/0011-integration-hub-split.md).

> **Why this doc exists.** The architecture exploration in May 2026 considered durable execution engines (Temporal, Restate, DBOS Transact, Hatchet) as the orchestration substrate for multi-step external integrations. After evaluation, the team chose to ship Phase 1 with the HTTP-first design ([04](./04-orchestration-phase-1-http-first.md)) for time-to-market and mental-model fit, while preserving this design as the target architecture once trigger conditions are met. This doc records *what we'd do if we migrate*, what code shape that produces, and the explicit gates that should cause a re-evaluation.

---

## 1. The core idea

A multi-step external integration is a single logical operation that spans multiple HTTP requests separated by external delays (webhook arrivals, user think-time, partner system latency). In the HTTP-first design, that operation is spread across N handler functions that share state via a `*_sessions` table; coherence is maintained by code-review discipline.

**Durable execution flips this:** the operation is one async function, suspended across webhook arrivals, resumed by signals. The runtime handles persistence, retry, idempotency, audit, and timer scheduling. The function reads top to bottom like the protocol diagram.

```ts
// What the M2 user-initiated link looks like under durable execution
export async function m2UserInitiatedLink(ctx: WorkflowCtx, args: { discoveryPayload }) {
  const cfg = await acts.loadIntegrationConfig(args.tenantId);
  const patient = await acts.findPatientInEmpi(args.discoveryPayload.patient);
  if (!patient) {
    await acts.respondOnDiscoverNoMatch(args.discoveryPayload.transactionId);
    return { outcome: 'no-match' };
  }
  const contexts = await acts.listLinkableCareContexts(patient.id);
  await acts.respondOnDiscover(args.discoveryPayload.transactionId, contexts);

  // Wait for ABDM to call back with /init — could be hours or days
  let initPayload: LinkInitPayload | undefined;
  setHandler(linkInitSignal, p => { initPayload = p; });
  await Promise.race([condition(() => !!initPayload), sleep('7 days')]);
  if (!initPayload) throw new ApplicationFailure('link-expired');

  await acts.dispatchOtp(initPayload, patient);
  await acts.respondOnInit(initPayload.transactionId);

  // Wait for /confirm with verified OTP
  let confirmPayload: LinkConfirmPayload | undefined;
  setHandler(linkConfirmSignal, p => { confirmPayload = p; });
  await Promise.race([condition(() => !!confirmPayload), sleep('10 minutes')]);
  if (!confirmPayload) throw new ApplicationFailure('otp-timeout');

  await acts.verifyOtp(confirmPayload.otp);
  await acts.markCareContextsLinked(initPayload.careContextIds);
  await acts.updatePatientAbhaAddress(patient.id, confirmPayload.abhaAddress);
  await acts.respondOnConfirm(confirmPayload.transactionId, initPayload.careContextIds);

  return { outcome: 'linked', contextIds: initPayload.careContextIds };
}
```

One function. Three durable waits. Survives pod restarts, deploys, multi-day delays. Every Activity call is automatically retried per its policy, idempotent on replay, and recorded in Temporal's append-only Event History.

---

## 2. Why durable execution and why Temporal specifically

### Why durable execution

For an integration platform projected to host 5+ external integrations (ABDM, Razorpay, HL7v2 lab analyzers, SOAP/XML TPA, insurance adjudicators, future HIMS-to-HIMS interop), the HTTP-first model has compounding cost:

- Each new flow re-derives: idempotency mechanism, retry policy, audit-row discipline, timer scheduling, stuck-flow recovery tooling.
- Audit-by-construction depends on code review catching every state mutation.
- Stuck-flow recovery is a DB shell exercise; ops scripts pile up.
- PHI encryption is per-column hand-rolled; key rotation and audit are bespoke.
- Multi-day workflows that span code deploys have no built-in versioning story.

Durable execution moves these concerns from per-flow code review into runtime guarantees. The integration platform that ships 5 integrations on durable execution has roughly one-third the orchestration code of the equivalent HTTP-first platform, and a uniform observability + audit surface.

### Why Temporal over Restate / DBOS / Hatchet

The May 2026 evaluation surfaced four credible options. The decision matrix:

| Concern | Temporal | Restate | DBOS Transact | Hatchet |
|---|---|---|---|---|
| Payload encryption at rest | PayloadCodec — public, stable API | "Contact us" — private preview | Hand-rolled serializer | Hand-rolled |
| Self-host complexity (May 2026) | Postgres + 1-2 containers | Single Rust binary + RocksDB | NPM library + Postgres schema | 2-3 containers + RabbitMQ optional |
| Battle-testing in regulated industries | Stripe, Coinbase, Snap, Datadog | Mid-size, no healthcare refs | Newer, no healthcare refs | Newer, no healthcare refs |
| License + vendor longevity | Apache 2.0, ~$350M raised | BSL with Apache change, $7M seed (2024) | MIT, $8.5M seed (2024) | MIT, ~$500k pre-seed |
| Citus compatibility | Adjacent (separate Postgres) | Adjacent (own RocksDB) | DBOS tables on Citus coordinator → contention | Same as DBOS |
| Worker Versioning / safe deploys mid-workflow | GA (March 2026) | Immutable deployments | Workflow patching (newer) | Newer |
| TypeScript SDK maturity | 1.17.x, 4+ years | 1.13.x, ~2 years | 4.x, ~2 years | Newer |

For *this* workload (healthcare, multi-tenant, Citus-resident, ABDM-bound, multi-week workflows, regulator-audited), Temporal wins on:
1. **PayloadCodec is a stable public encryption API.** Restate's encryption is private/preview; DBOS/Hatchet are hand-rolled. ABDM Facilitation Testing prefers documented framework APIs.
2. **Bus factor.** $350M+ raised + 8 years of OSS + Stripe-scale users vs $7-8M seed startups.
3. **Worker Versioning GA.** Multi-day ABDM consent flows are version-safe across deploys.
4. **Separate Postgres avoids Citus coordinator contention** that DBOS would create.
5. **Regulated-industry adoption playbook exists.** Stripe and Coinbase have done the regulatory work; we'd follow their path.

The cost: Temporal requires more operational discipline than DBOS (schema upgrades quarterly, capacity sizing, retention policy) and adds one Postgres + 2 containers to the stack. The May 2026 self-host story is materially lighter than the 2020 reputation suggests (no Cassandra, no Elasticsearch, single-container default).

### Why not the FSM engine (ADR-0027 target)

The custom FSM engine path was explored and deferred. Reasons documented in ADR-0026: ~1500 LOC of engine code to write + maintain, two-layered debugging ("JSON wrong or engine wrong?"), concrete-before-abstract discipline violated. The engine path is now superseded by the choice between HTTP-first (Phase 1) and durable execution (target) — both of which avoid building a workflow engine in-house.

---

## 3. The five components in the durable execution version

| # | Component | What it is | Stateful? |
|---|---|---|---|
| 1 | **Temporal Server** | Go cluster (frontend/history/matching/worker roles, runnable in one container at small scale). gRPC API. | Yes — via its Postgres |
| 2 | **Temporal Postgres** | Dedicated Postgres DB. Holds workflow history, task queues, visibility data. Separate from the Citus application DB. | Yes |
| 3 | **Temporal UI** | `temporalio/ui` container. Operator-facing web UI for inspecting workflows. | No |
| 4 | **Integration Hub HTTP service** | Fastify app. Receives ABDM/Razorpay webhooks + internal API. Starts/signals workflows via Temporal Client gRPC. Does NOT execute workflow code. | No |
| 5 | **Integration Hub Worker** | Node.js worker process. Executes workflow code (v8 sandbox) and activity code (regular Node). Polls Temporal via gRPC. | No |

Total: 5 components. One more component category (Temporal Server + Postgres + UI) than the HTTP-first design.

---

## 4. Local dev

```
┌─────────────────────────────────────────────────────────────────┐
│  Laptop                                                          │
│                                                                  │
│  ┌─────────────────────────┐                                     │
│  │  temporal server         │   Single Go binary.                 │
│  │  start-dev              │   Embedded SQLite for state.        │
│  │                         │   UI bundled.                       │
│  │  :7233 gRPC, :8233 UI   │◀──┐                                 │
│  └─────────────────────────┘   │                                 │
│                                │ gRPC                            │
│  ┌─────────────────────────┐   │                                 │
│  │  Node process            │───┤  pnpm dev                       │
│  │  (Fastify + Worker       │   │                                 │
│  │   co-located in dev)     │   │                                 │
│  │  :3005 HTTP              │                                     │
│  └─────────────────────────┘                                     │
└──────────────────────────────────────────────────────────────────┘
```

`temporal server start-dev` is a 50MB Go binary. No Postgres needed for dev (embedded SQLite). Starts in 2 seconds. Reset with Ctrl-C. WSL2-friendly (pure Go, no native dependencies). UI at `localhost:8233`.

For unit tests: `TestWorkflowEnvironment.createLocal()` runs Temporal in-process inside Vitest. Time can be advanced programmatically (`testEnv.sleep('11 minutes')` fires the 10-min timer instantly).

---

## 5. Production

```
┌────────────────────────────────────────────────────────────────────────┐
│  Cluster                                                                │
│                                                                        │
│  ┌─────────────────┐   ┌─────────────────┐    ┌──────────────────┐     │
│  │ integration-hub  │   │ integration-hub │    │ temporal-ui      │     │
│  │ -http (Fastify)  │   │ -http           │    │ operators only   │     │
│  │ replicas: 2+     │   │                 │    │                  │     │
│  └────────┬─────────┘   └────────┬────────┘    └─────────┬────────┘     │
│           │                      │                       │ HTTP :8233   │
│           │ gRPC :7233           │                       ▼              │
│           ▼                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Temporal Server (temporalio/server:1.31)            │  │
│  │              roles run in-process at small scale                 │  │
│  │              replicas: 2 for HA                                  │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
│                                   │ SQL                                 │
│                                   ▼                                     │
│                  ┌─────────────────────────────────┐                    │
│                  │ Temporal Postgres                │                    │
│                  │ separate from Citus              │                    │
│                  └─────────────────────────────────┘                    │
│                                                                        │
│           ┌──────────────────────────────────────────────┐             │
│           ▼                                              ▼             │
│  ┌─────────────────┐                          ┌─────────────────┐      │
│  │ integration-hub  │  long-poll gRPC          │ integration-hub │      │
│  │ -worker (Node)   │◀────────────────────────▶│ -worker         │      │
│  │ task queue:      │                          │                 │      │
│  │ "integration-    │                          │                 │      │
│  │  hub"            │                          │                 │      │
│  │ replicas: 2+     │                          │                 │      │
│  └──────┬──────────┘                          └──────┬──────────┘      │
│         │ HTTP outbound                              │                  │
└─────────┼─────────────────────────────────────────────┼──────────────────┘
          ▼                                             ▼
   External world                                External world
```

Counts: 2 HTTP service pods + 2 Worker pods + 1-2 Temporal Server + 1 UI + 1 Temporal Postgres + your existing Citus.

HTTP service and Worker are separate processes for production (different scaling profiles, different security zones, different restart semantics). In dev they can co-locate.

---

## 6. Single webhook flow

```
   ABDM Gateway
        │ POST /v3/care-context/discover
        ▼
┌─────────────────┐
│ HTTP service    │
│ - verify sig    │
│ - dedupe        │
│ - find tenant   │
│ temporalClient   │
│  .workflow      │
│  .start(...)    │
└────────┬────────┘
         │ gRPC
         ▼
┌──────────────────┐
│ Temporal Server  │ records workflow start
│                  │ enqueues task
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Worker process   │
│ Workflow runs:   │
│  - patient lookup│  ──▶ activity (HTTP) ──▶ result in history ──┐
│  - list contexts │  ──▶ activity (HTTP) ──▶ result in history ──┤
│  - respond to    │  ──▶ activity (HTTP) ──▶ result in history ──┤
│    ABDM          │                                              │
│  - await signal  │  ⏸  suspends — worker frees up               │
└──────────────────┘                                              │
                                                                  │
... hours/days later ...                                          │
                                                                  │
   ABDM Gateway                                                   │
        │ POST /v3/care-context/init                              │
        ▼                                                         │
┌─────────────────┐                                               │
│ HTTP service    │ temporalClient.workflow                       │
│                 │   .getHandle(workflowId)                      │
│                 │   .signal(linkInitSignal, payload)            │
└────────┬────────┘                                               │
         ▼                                                        │
┌──────────────────┐                                              │
│ Temporal Server  │ delivers signal                              │
└────────┬─────────┘                                              │
         ▼                                                        │
┌──────────────────┐                                              │
│ Worker (any pod) │ workflow RESUMES from await ◀────────────────┘
│                  │ executes next phase
└──────────────────┘
```

Workflows are stateless on the wire. When suspended, the worker holds no memory. Any worker in the cluster can resume. Pod restarts are free.

Multi-tenant workflow ID convention: `{integration_kind}.{flow}.{external_correlation_id}.{tenant_id}`. Example: `abdm.m2-user-link.txn-abc-123.tenant-uuid-456`. Webhook handlers construct the ID and signal via `client.workflow.getHandle(id).signal(...)`.

---

## 7. Tenant integration registration (engine-agnostic — identical to Phase 1)

The `integration_hub.integrations` and `integration_hub.integration_credentials` tables work identically. Configurator UI registers an integration; HTTP service reads the registry on each webhook to find the active integration + credentials.

The workflow's first Activity is `loadIntegrationConfig({ tenantId, integrationId })` which returns the resolved config + credentials. From there the config flows through Activity inputs.

This part of the design does NOT change between Phase 1 and durable execution. Migration is zero-cost here.

---

## 8. PHI encryption — PayloadCodec

A `PayloadCodec` is registered on both Worker and Client. It runs **outside** the workflow sandbox (so it may call KMS, HSM, etc.). Every workflow input, signal payload, activity input/output, and workflow result is encrypted before it reaches Temporal's datastore. Codecs are chainable (compress → encrypt). The optional Codec Server lets the Temporal UI decrypt for authorized operators while data stays encrypted at rest.

```ts
// lib/temporal-codec.ts (sketch)
import { PayloadCodec, Payload } from '@temporalio/common';
import { secretsClient } from '@hims/ts-sdk-secrets';

export const himsCodec: PayloadCodec = {
  async encode(payloads) {
    return Promise.all(payloads.map(async p => ({
      metadata: { ...p.metadata, encoding: Buffer.from('himskms/v1') },
      data: await secretsClient.encrypt(p.data),
    })));
  },
  async decode(payloads) {
    return Promise.all(payloads.map(async p => ({
      metadata: p.metadata,
      data: await secretsClient.decrypt(p.data),
    })));
  },
};
```

Workflow IDs, search attributes, and timer durations are NOT encrypted (Temporal needs them for indexing) — so do not put PHI in them.

---

## 9. File layout

```
services/integration-hub-svc/
  src/
    http-main.ts                ← Fastify boot. Imports temporalClient.
    worker-main.ts              ← Temporal Worker boot. Imports activities + workflows.

    routes/                      ← THIN — verify, dedupe, start/signal workflow
      abdm-webhooks.ts
      razorpay-webhooks.ts
      integrations-crud.ts

    workflows/                   ← Workflow functions (run in v8 sandbox)
      m1-aadhaar-otp.ts
      m2-user-initiated-link.ts
      m3-hip.ts
      m3-hiu.ts
      consent-lifecycle.ts
      razorpay-payment.ts
      signals.ts                 ← Signal definitions

    activities/                  ← UNCHANGED from Phase 1 — pure work fns
      abdm.ts
      razorpay.ts
      empi.ts
      record-foundation.ts

    lib/
      temporal-codec.ts          ← PayloadCodec wrapping KMS
      temporal-client.ts          ← Singleton client construction
```

**Compared to Phase 1, the structural change is:** `flows/` → `workflows/`. The `activities/` directory and `lib/` (pure helpers) move verbatim. The `workers/timer-worker.ts` directory goes away (Temporal handles timers). The `lib/atomic-transition.ts`, `lib/sessions-repo.ts`, `lib/audit-writer.ts` go away (Temporal handles state, audit, persistence).

This is why the Portability Rules in [04 §11](./04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical) matter — they ensure the boundary between `activities/` (unchanged) and `flows/` → `workflows/` (rewritten) is clean.

---

## 10. Trigger conditions for migration

The HTTP-first design ([04](./04-orchestration-phase-1-http-first.md)) ships Phase 1. This design is the target. Migration should be evaluated when *any* of these hold:

1. **N ≥ 5 active integrations** (currently 1 — ABDM only). At this count, per-integration boilerplate has compounded into measurable per-flow cost; durable execution amortises.
2. **A second engineer can run `temporal server start-dev` locally and articulate the workflow/activity split without prompting.** Cultural readiness gates the migration.
3. **Stuck-flow recovery becomes ops pain.** Trigger: the team writes a 4th ad-hoc SQL script to manually unstick a session, or ops Slacks dev > 3× in a month for stuck flows.
4. **Audit discipline slips in code review.** Trigger: one production stuck-flow root cause traces to a missing audit row, OR compliance officer requests stronger audit story.
5. **Multi-week workflow + deploy frequency conflict.** Trigger: a code deploy mid-workflow causes a "session state field interpretation drifted" incident.
6. **Worker volume warrants HA / multi-region.** Trigger: ABDM Facilitation Testing pre-prod sign-off requires demonstrable HA / multi-region failover story.

Each trigger should be logged as a public follow-up note. When two of these fire concurrently, write the migration ADR.

---

## 11. Migration path from HTTP-first

The Portability Rules in [04 §11](./04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical) are designed so this migration is per-flow mechanical, not a rewrite. The plan:

### Phase M0 — Infra (1 sprint, parallel to flow work)
- Deploy Temporal Server + Temporal Postgres + UI in cluster
- Land `lib/temporal-codec.ts` PayloadCodec wired to `@hims/ts-sdk-secrets`
- Land `lib/temporal-client.ts` and `worker-main.ts` entrypoint
- Add `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE` to service config
- Verify hello-world workflow round-trips with codec encryption

### Phase M1 — First flow migration (1 sprint per flow)
For each flow (M1, M2, M3-HIP, M3-HIU, consent supervisor, Razorpay payment):
1. **Rewrite the per-flow file** from `flows/<flow>.ts` (N handler functions sharing a session) into `workflows/<flow>.ts` (one workflow function + N signals).
2. **Activities unchanged.** They import from the same `activities/*` files.
3. **Routes shrink.** Webhook handlers become "construct workflow ID + start or signal."
4. **Migration cutover** per flow: at a chosen instant, route new webhook traffic to the workflow path; in-flight sessions complete on the HTTP-first path. Dual-running for a day.
5. **Delete the corresponding `flows/<flow>.ts` and `abdm_sessions` rows for that flow type** once all in-flight have completed.

Estimate: ~1 sprint per flow. M0 is one-time. Six flows = 7 sprints + buffer.

### Phase M2 — Decommission Phase-1 substrate
After all flows migrated:
- Drop `lib/sessions-repo.ts`, `lib/atomic-transition.ts`, `lib/audit-writer.ts`
- Drop `abdm_sessions`, `integration_workflow_transitions`, `integration_timers` tables from `integration_hub` schema
- Drop the `workers/timer-worker.ts` process

The `integrations` and `integration_credentials` tables remain — engine-agnostic.

---

## 12. Open questions / things deferred

- **Namespace strategy.** Single `default` namespace with per-tenant search attributes vs one namespace per environment vs one per tenant. Recommendation: single namespace, search attribute `iqTenantId` for isolation. Revisit if a tenant demands physical isolation contractually.
- **Retention policy.** How long does Temporal keep completed workflow history? Default 30 days. ABDM Facilitation Testing audit window might require longer. Recommendation: 1 year for terminal-state workflows, 90 days otherwise; archive completed-and-aged to S3 via Temporal Archiver.
- **Cluster sizing.** History shard count is fixed at namespace creation; oversize upfront. Recommendation: 4 shards for first deployment, raise on next namespace if scale demands.
- **Worker fleet topology.** One TS Worker process per Activity kind (separate workers for ABDM vs Razorpay) vs one mega-worker that registers all Activities. Recommendation: one mega-worker for Phase M1; split when Activity contention shows.
- **Disaster recovery.** Temporal Postgres backup cadence, PITR, cross-region failover. Tracked separately on the prod-cutover checklist alongside [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md)'s audit gate.

---

## 13. References

- [04-orchestration-phase-1-http-first.md](./04-orchestration-phase-1-http-first.md) — Current Phase 1 design
- [02-fsm-specifications.md](./02-fsm-specifications.md) — State machine specifications (authoritative for both phases)
- [ADR-0011](../../adr/0011-integration-hub-split.md) — Integration Hub split
- [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md) — Audit substrate
- Temporal: [Worker Versioning GA blog](https://temporal.io/blog/ga-worker-versioning-public-preview-upgrade-on-continue-as-new), [Postgres-only Visibility docs](https://docs.temporal.io/self-hosted-guide/visibility), [PayloadCodec docs](https://docs.temporal.io/production-deployment/data-encryption)
- Alternative evaluations (May 2026): Restate, DBOS Transact, Hatchet — see project memory `project_orchestration_decision_phase_1.md` and the research reports retained in conversation history.
