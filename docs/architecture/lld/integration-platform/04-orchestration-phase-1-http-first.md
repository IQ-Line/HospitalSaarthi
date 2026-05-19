# Integration Platform — Phase 1 Orchestration: HTTP-First with Disciplined State

**Status:** Chosen for Phase 1 implementation (2026-05-18, post-discussion with EM and tech-lead).
**Supersedes (in spirit):** [ADR-0026 FSM-lite Phase 1](../../adr/0026-fsm-lite-phase-1.md) — same shape, simpler framing without engine pretensions.
**Related:** [01-schema-design.md](./01-schema-design.md), [02-fsm-specifications.md](./02-fsm-specifications.md) (state diagrams remain authoritative documentation), [05-orchestration-target-durable-execution.md](./05-orchestration-target-durable-execution.md).

> **Why this doc exists.** After exploring FSM-as-engine (ADR-0027) and durable-execution alternatives (Temporal, Restate, DBOS), the team decided that **for Phase 1 of the AIIMS scope**, the orchestration layer will be a structured HTTP server with disciplined state in Postgres. This matches the team's existing mental model, ships in this sprint, and — critically — is structured so that a future migration to durable execution is a mechanical port, not a rewrite. The structure rules in §11 are the contract that preserves that property.

---

## 1. Decision summary

For Phase 1, the Integration Hub is a Fastify HTTP service plus a polling worker, both backed by the existing Citus cluster. Multi-step external integrations (ABDM M1/M2/M3, Razorpay, future HL7v2 / SOAP-XML TPA / piecemeal HIMS interop) are implemented as **sets of HTTP handlers sharing a per-flow session row** in Postgres. State transitions happen inside Postgres transactions. Timer-driven events (OTP expiry, consent expiry, retry-after) are durable rows in a timer table fired by a polling worker.

The chosen path is the disciplined version of `abdi-lims-backed`, not a parallel approach. What's new: explicit state column, atomic transition discipline, append-only audit row per transition, durable timers, structured idempotency. What's not: any engine, any DSL, any new infrastructure beyond Postgres.

---

## 2. The five components

| # | Component | What it is | Stateful? |
|---|---|---|---|
| 1 | **Integration Hub HTTP service** | Fastify app. Receives ABDM/Razorpay webhooks + internal API. Executes flow inline within request handler. State writes via Drizzle. | No |
| 2 | **Application Postgres (Citus)** | Existing tenant-distributed cluster. New schema `integration_hub` with sessions, timers, inbound messages, audit log. | Yes |
| 3 | **Timer/retry worker** | Node.js process. Polls `integration_hub.integration_timers` with `SELECT ... FOR UPDATE SKIP LOCKED`. Dispatches by `kind` to a registered handler. | No |
| 4 | **Optional: Redis** | Distributed locks, per-tenant rate limiting, idempotency-key cache. Postgres-only works for Phase 1; add Redis when webhook volume warrants. | Yes (ephemeral) |
| 5 | **Optional: stuck-flow admin UI** | Simple admin route or separate small app surfacing stuck/failed flows for ops. You build this. | No |

Mandatory: 3. Optional: 2. No new database to operate.

---

## 3. Local dev — single Node process + Citus

```
┌───────────────────────────────────────────────────────────────┐
│  Your laptop (WSL2)                                           │
│                                                               │
│  ┌─────────────────────────┐                                  │
│  │  Postgres (Docker)      │   docker compose up -d postgres  │
│  │  :5432                  │   schema: integration_hub        │
│  └─────────┬───────────────┘                                  │
│            │ SQL                                              │
│            ▼                                                  │
│  ┌─────────────────────────┐                                  │
│  │  Your Node process       │  pnpm dev                       │
│  │  (Fastify HTTP + timer   │  timer worker runs via Fastify  │
│  │   worker co-located)     │  lifecycle hook (setInterval).  │
│  │  :3005 HTTP              │                                 │
│  └─────────────────────────┘                                  │
│            ▲                                                  │
│            │ curl POST /v3/care-context/discover              │
└────────────┼──────────────────────────────────────────────────┘
             │
   ngrok / Postman simulating ABDM webhooks
```

Two processes. No Temporal binary. No new wire protocol. Familiar Fastify dev loop. WSL2-friendly (no aggressive file watching, no JVM, no native compilation).

---

## 4. Production — three mandatory components

```
┌────────────────────────────────────────────────────────────────────────┐
│  Cluster (K8s / ECS / whatever the platform standardises on)            │
│                                                                        │
│  ┌─────────────────┐   ┌─────────────────┐                             │
│  │ integration-hub  │   │ integration-hub │   replicas: 2+              │
│  │ -http (Fastify)  │   │ -http           │   public ingress             │
│  └────────┬─────────┘   └────────┬────────┘                             │
│           │                      │                                      │
│           └──────────┬───────────┘                                      │
│                      │ SQL                                              │
│                      ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Application Postgres (Citus cluster)                 │  │
│  │              schema: integration_hub                              │  │
│  │              tenant-distributed by iq_tenant_id                   │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │ SQL                                     │
│                               ▼                                         │
│  ┌─────────────────┐                                                    │
│  │ integration-hub  │   replicas: 1-2                                   │
│  │ -worker (Node)   │   private subnet, no ingress                      │
│  │ - polls timers   │                                                   │
│  │ - polls retries  │                                                   │
│  └─────────┬────────┘                                                   │
│            │ HTTP outbound                                              │
└────────────┼─────────────────────────────────────────────────────────────┘
             │
             ▼
   External world (ABDM, Razorpay, partners, internal EMPI/Record Foundation)
```

Same Docker image, two entrypoints (`http-main.js`, `worker-main.js`). For Phase 1 they can run as one process if needed; splitting is a configuration change.

---

## 5. The flow of a single webhook (M2 user-initiated link, discover step)

```
   ABDM Gateway
        │ POST /v3/care-context/discover
        │ body: { transactionId: "abc-123", patient: {...} }
        │ headers: { X-HIP-ID, X-CM-ID, signature }
        ▼
┌────────────────────────────────────────────────────┐
│ HTTP handler — POST /v3/care-context/discover      │
│                                                    │
│ STEP 1 — Authenticate + dedupe                     │
│   - verifyAbdmSignature(headers, body)             │
│   - INSERT INTO integration_inbound_messages       │
│       (external_message_id, tenant, payload_ref)   │
│     ON CONFLICT DO NOTHING                         │
│   - if duplicate → return 200 OK                   │
│                                                    │
│ STEP 2 — Tenant + integration lookup               │
│   - resolveTenantFromHfrFacilityId(headers)        │
│   - cfg = loadIntegrationConfig(tenant, 'abdm.v3') │
│   - creds = secretsClient.resolve(cfg.creds)       │
│                                                    │
│ STEP 3 — Begin flow (atomic)                       │
│   tx { INSERT abdm_sessions (state='DISCOVERY_     │
│        RECEIVED', txnId, tenant, context) }        │
│                                                    │
│ STEP 4 — Patient lookup                            │
│   - patient = await empi.findByDemographics(...)   │
│   - if !patient → no-match branch                  │
│                                                    │
│ STEP 5 — List unlinked care contexts               │
│   - contexts = await recordFoundation.list(...)    │
│                                                    │
│ STEP 6 — Reshape + respond to ABDM                 │
│   - shaped = toAbdmCareContextShape(contexts)      │
│   - await abdm.respondOnDiscover(cfg, txnId,       │
│       shaped, patient.referenceId)                 │
│                                                    │
│ STEP 7 — Advance state (atomic transition)         │
│   tx {                                             │
│     UPDATE abdm_sessions                           │
│       SET state='AWAITING_INIT',                   │
│           context = context || $patient_data;      │
│     INSERT integration_workflow_transitions        │
│       (audit row);                                 │
│     INSERT integration_timers                      │
│       (kind='link-giveup', fire_at=now()+7days);   │
│   }                                                │
│                                                    │
│ STEP 8 — return 200 OK                             │
└────────────────────────────────────────────────────┘
```

Pattern: **dedupe → load session → guard state → call pure work-functions → atomic update + audit + timer → respond.** Every multi-step flow handler follows this shape. The atomic step (UPDATE session + INSERT audit + INSERT/UPDATE timers in one transaction) is the discipline that gives equivalent of audit-by-construction.

---

## 6. The timer worker (durable setTimeout)

```ts
// services/integration-hub-svc/src/workers/timer-worker.ts
import { db } from '../db';

const HANDLERS: Record<string, (timer: TimerRow) => Promise<void>> = {
  'otp-expiry':       (timer) => m1.onOtpExpiryFired(timer),
  'consent-expired':  (timer) => consentSup.onExpiredFired(timer),
  'link-giveup':      (timer) => m2.onLinkGiveupFired(timer),
  'payment-stalled':  (timer) => payments.onStalledFired(timer),
  'retry-outbound':   (timer) => retry.onRetryDue(timer),
};

async function tick() {
  const due = await db.query(`
    WITH due AS (
      SELECT id, iq_tenant_id, workflow_id, kind, payload
      FROM integration_hub.integration_timers
      WHERE status='pending' AND fire_at <= now()
      ORDER BY fire_at LIMIT 50
      FOR UPDATE SKIP LOCKED
    )
    UPDATE integration_hub.integration_timers
       SET status='fired', fired_at=now()
     WHERE id IN (SELECT id FROM due)
     RETURNING *;
  `);

  for (const timer of due.rows) {
    const handler = HANDLERS[timer.kind];
    if (!handler) { await markTimerFailed(timer.id, 'unknown-kind'); continue; }
    try {
      await handler(timer);
    } catch (e) {
      await markTimerFailed(timer.id, e.message);
      // Optional: schedule retry timer with exponential backoff
    }
  }
}

setInterval(tick, 5_000);
```

~100 LOC + one handler per timer kind (~30-50 LOC each). `FOR UPDATE SKIP LOCKED` makes it safe to run multiple worker pods without coordination — each claims a disjoint batch.

---

## 7. Tenant integration registration (engine-agnostic)

`integration_hub.integrations` and `integration_hub.integration_credentials` tables work identically to the existing LLD §4.1-4.2. A tenant enables an integration via Configurator UI → POST `/api/v1/integrations` → validate config → store credential references (NOT bytes) → mark enabled → emit `integration.enabled` event.

Webhook handlers read these tables on every request (with a short TTL cache) to find:
1. Which tenant the webhook belongs to (lookup by HFR / facility ID / Razorpay key ID / etc.)
2. Which integration row to use
3. Which credentials to resolve via `@hims/ts-sdk-secrets`

This part of the design is engine-agnostic — identical between this approach and the durable-execution target ([05-orchestration-target-durable-execution.md](./05-orchestration-target-durable-execution.md)).

---

## 8. Deployment shape and file layout

```
namespace: hims-integration

deployments:
  integration-hub-http        (2+ replicas, public ingress)
    command: node services/integration-hub-svc/dist/http-main.js

  integration-hub-worker      (1-2 replicas, private subnet)
    command: node services/integration-hub-svc/dist/worker-main.js

stateful:
  citus (your existing cluster — no new DB)
```

```
services/integration-hub-svc/
  src/
    http-main.ts                ← Fastify boot
    worker-main.ts              ← Timer worker boot

    routes/                      ← THIN handlers — see Portability Rule 1
      abdm-webhooks.ts
      razorpay-webhooks.ts
      integrations-crud.ts

    flows/                       ← One file per flow, N handler functions inside
      m1-aadhaar-otp.ts          ← startOtp, submitOtp, ... (3 handlers)
      m2-user-initiated.ts       ← onDiscover, onInit, onConfirm (3 handlers)
      m3-hip.ts
      m3-hiu.ts
      razorpay-payment.ts

    activities/                  ← PURE work functions — see Portability Rule 2
      abdm.ts                    ← requestOtp, verifyOtp, enrolByAadhaar, ...
      razorpay.ts                ← createOrder, capturePayment, refundPayment, ...
      empi.ts                    ← findPatient, addIdentifier, ...
      record-foundation.ts       ← listCareContexts, markLinked, ...

    workers/
      timer-worker.ts            ← Polling loop
      timer-handlers/            ← One per timer kind
        otp-expiry.ts
        consent-expired.ts
        link-giveup.ts
        payment-stalled.ts

    lib/                         ← Pure helpers — survive any orchestration choice
      sessions-repo.ts            ← Drizzle session table access
      idempotency.ts              ← INSERT ON CONFLICT pattern
      atomic-transition.ts        ← UPDATE session + INSERT audit + INSERT timer
      retry-policy.ts             ← Retry / backoff helpers
      audit-writer.ts             ← Writes to integration_workflow_transitions
      payload-encryptor.ts        ← KMS-envelope encryption for PII fields
```

The directory split — `routes/` vs `flows/` vs `activities/` vs `lib/` — is **the structural promise of this design**. See §11 for the rules that make this directory split load-bearing.

---

## 9. Citus interaction

All `integration_hub` schema tables distributed by `iq_tenant_id`:
- `integrations`, `integration_credentials`, `inbound_messages`, `outbound_messages`
- `abdm_sessions` (and any future `<integration>_sessions` tables)
- `integration_workflow_transitions` (audit, append-only)

One cross-tenant scan: the timer worker queries `integration_timers` globally with a `(status, fire_at)` non-tenant-leading index. This is acceptable at expected volume (thousands of timers/day across all tenants).

No second database. No engine state to operate. Citus operational expertise compounds.

---

## 10. PHI encryption posture

Column-level envelope encryption via `@hims/ts-sdk-secrets`. The columns that carry tokens or PII:
- `abdm_sessions.x_token`, `t_token` — encrypted via KMS, decrypted at use
- `abdm_sessions.context` JSONB — sensitive fields encrypted inline (`{ aadhaarMasked: "********1234", aadhaarRef: "kms-blob://..." }`)
- `integration_inbound_messages.payload_ref` — payload stored at vault URL, not inline
- `integration_credentials.vault_ref` — already references-not-bytes

The application-level `payload-encryptor.ts` helper centralises this. The discipline must be enforced by code review: any new column carrying PII must be routed through the helper.

---

## 11. Portability Rules — the structure that makes future DE migration mechanical

**These rules are the non-negotiable contract of this design.** They ensure that when the platform later adopts durable execution (Temporal — see [05](./05-orchestration-target-durable-execution.md)), the migration is a mechanical refactor, not a rewrite.

### Rule 1 — Routes are thin. They dedupe, authenticate, and delegate.

`routes/*` files contain Fastify route definitions that:
- Verify request signature / authentication
- Run idempotency dedupe (`INSERT ON CONFLICT DO NOTHING`)
- Resolve tenant + integration config
- Call a single function from `flows/*`
- Return HTTP response

**Routes must not contain business logic.** A route handler should be readable in 30 seconds; if it grows past ~50 LOC, the extra logic belongs in `flows/`.

When DE migration happens, routes become even thinner: they call `temporalClient.workflow.start(...)` or `.signal(...)`. The dedupe + auth + tenant lookup remain identical.

### Rule 2 — `activities/*` are pure work functions, no state access.

Files in `activities/` contain functions like `requestAadhaarOtp(cfg, encrypted)`, `verifyAadhaarOtp(cfg, txnId, otpEnc)`, `findPatientInEmpi(tenantId, demographics)`. They:
- Take typed input + integration config
- Make HTTP calls / DB reads to remote services
- Return typed output
- **Do NOT access `abdm_sessions` table or any flow-state table**
- **Do NOT call other `activities/*` functions** (composition lives in `flows/`)
- Are independently testable with a mocked HTTP client

This is the contract that makes activities reusable verbatim when DE arrives — Temporal Activities have exactly this shape. The body of `activities/abdm.ts:requestAadhaarOtp` will move file location but not source code.

### Rule 3 — `flows/*` is where orchestration lives.

Files in `flows/` contain the per-flow handler functions (one function per webhook / API entry point). Each handler:
1. Calls `sessions-repo.load(...)` or `sessions-repo.create(...)`
2. Guards on `session.state` — throws `InvalidWorkflowState` if mismatched
3. Calls one or more `activities/*` functions (composes them)
4. Calls `lib/atomic-transition.ts:transitionTo(session, fromState, toState, contextPatch)` — this is the ONE function that mutates state, audits, and schedules timers atomically
5. Returns

**The orchestration logic — what state to enter, which activities to call, which timers to schedule — is the part that rewrites when DE arrives.** It becomes a Temporal Workflow function that imports the same Activities. The body is half the size because Temporal handles dedupe, retry, idempotency, and state implicitly.

### Rule 4 — One transition per handler.

A webhook handler advances the workflow through *at most one* state transition. If a flow needs to advance multiple states in response to one webhook, that's two handlers — the first transitions to an intermediate state and immediately calls the second.

**Anti-pattern:** chains of `transitionTo(a, b)`, `transitionTo(b, c)`, `transitionTo(c, d)` within one handler. This makes the state diagram opaque and creates intermediate states that exist only inside one handler's call stack. The state machine should be readable from `flows/*` + `02-fsm-specifications.md` alone.

### Rule 5 — State table writes go through `atomic-transition.ts`. No direct UPDATE.

The `lib/atomic-transition.ts` helper is the ONE place that writes to `abdm_sessions.state` (and the audit + timer tables). All other code paths read but don't write `state`. This is the equivalent of `transitionTo(fromState, toState)` in FSM-lite — and the equivalent of what Temporal does implicitly when a workflow function returns from one step and moves to the next.

When DE arrives, this helper disappears — Temporal owns state. But its existence today ensures that exactly the same set of writes (state, audit, timer) happens for every transition. No drift across handlers.

### Rule 6 — Timer scheduling goes through `sessions-repo.scheduleTimer(kind, fireAt, payload)`.

Same shape, same contract. When DE arrives, `setTimer` side-effects in workflow code replace this — but the timer kinds (`otp-expiry`, `consent-expired`, `link-giveup`) and their semantics are preserved.

### Rule 7 — `lib/payload-encryptor.ts` handles all PHI encryption.

Direct `abdm_sessions.x_token = plaintext` is a code-review reject. Tokens, OTP-related strings, Aadhaar-derived values flow through the encryptor. When DE arrives, this helper is replaced by Temporal's PayloadCodec — but again, the discipline is preserved: PHI never sits in workflow context unencrypted.

### Rule 8 — Activities and Flows reference types from `packages/ts-sdk-*`.

Protocol-layer types (NHA request/response shapes, FHIR types, FSM state constants) live in `packages/ts-sdk-abha`, `packages/ts-sdk-fhir`, etc. Activities and Flows import from there, never the other way around. When DE arrives, only Activities + Flows are touched; the SDK packages are untouched.

### Rule 9 — Each flow has its own typed `context` and `state`. The session row is generic over `flowKind`.

The session row (`abdm_sessions`, `integration_sessions`, etc.) lives in one table with a polymorphic `context jsonb` and a string `state` — but the TypeScript layer **must** see it as a discriminated, typed shape. Concretely:

```ts
// in modules/<integration>/src/domain/session.ts
export interface FlowContextMap {
  'abdm.m1.aadhaar-otp.v1':            M1AadhaarOtpContext;
  'abdm.m2.user-initiated-link.v1':    M2UserLinkContext;
  'abdm.m2.hip-initiated-link.v1':     M2HipLinkContext;
  // ...one entry per flow
}
export interface FlowStateMap {
  'abdm.m1.aadhaar-otp.v1':            M1AadhaarOtpState;
  'abdm.m2.user-initiated-link.v1':    M2UserLinkState;
  // ...one entry per flow
}
export interface AbdmSession<F extends AbdmFlowKind = AbdmFlowKind> {
  flowKind: F;
  state: FlowStateMap[F];
  context: FlowContextMap[F];
  // ...rest unchanged
}
```

The `context` type lives next to the flow's use-cases (`use-cases/<flow-name>/context.ts`). Repos cast (`findById<F>()`) plus a one-line runtime `assertFlowKind(session, expectedFlow)` guard at the entry to each handler.

**Why this is a portability rule, not a style preference:**

- Without it, every use-case takes a session with `context: Record<string, unknown>` and silently re-reads/re-asserts the fields it expects. That `Record` decays into a god-bag as flows multiply, and the eventual DE port has to figure out the *real* context type by reading every use-case. With it, each flow's context type *is* the documentation.
- When the DE migration arrives, a Temporal workflow function has signature `(args: TArgs) → Promise<TResult>` with internal `state: TState` and `context: TContext`. **These three types are exactly `FlowContextMap[F]` + `FlowStateMap[F]` + the flow's args type.** The use-case body becomes the workflow body with the types already in place — no translation pass.

This rule supersedes the M1-era pattern (`context: Record<string, unknown>` everywhere). M1 use-cases keep working via the default type parameter; M2 onwards must declare per-flow types. See [`abdm-adapter/06-m2-dev-guide.md §3`](../abdm-adapter/06-m2-dev-guide.md#3-per-flow-typed-context--the-portable-shape) for the concrete example.

---

## 12. Anti-patterns — things that would break portability

- **State checks scattered across activities.** If `activities/abdm.ts:enrolByAadhaar` reads `session.state` to decide what to do, the function is no longer pure and won't transplant to Temporal Activity. Pass needed state in via parameters.
- **Composing activities inside other activities.** Activities call only HTTP clients + helpers. Composition lives in flows.
- **Inline retry loops inside flow handlers.** Retries belong in `lib/retry-policy.ts` (called by activities or scheduled as `retry-outbound` timers). When DE arrives, retries are activity-config; the policy decision survives.
- **`setTimeout` for timer-driven actions.** Always durable timer rows. Process restarts must not drop work.
- **Reading `session.state` outside `flows/` or `lib/atomic-transition.ts`.** The state column has one writer and few readers. If a Razorpay webhook needs to know "is this payment in progress?" it asks the sessions repo by a *semantic* method (`isPaymentInProgress(sessionId)`), not by reading the raw state literal.
- **Writing different state-machine vocabularies per integration.** All flows share state-machine documentation in [02-fsm-specifications.md](./02-fsm-specifications.md). The state name in `abdm_sessions.state` must appear in the spec.

---

## 13. PR #59 review triage (post-decision)

| Item | Status | Reasoning |
|---|---|---|
| IST timestamp helper bug (UTC+5:30 fixed offset) | Execute | Protocol-layer bug. Lives in `activities/` after restructure. |
| FSM state rename (drop `OTP_VERIFIED`, etc.) | Execute, in `packages/ts-sdk-abha/src/constants/fsm-states.ts` | These state constants are the authoritative state vocabulary for both this design and the future DE design. |
| AJV completion on Aadhaar handlers | Execute | HTTP-layer concern, applies to thin routes. |
| Fold `iqTenantId` into input | Execute, with signature `(input, deps)` not `(input, deps, iqTenantId)` | New Activity signature shape — `iqTenantId` lives inside input. |
| Dedupe `maskAadhaar` into `lib/m1-aadhaar-mask.ts` | Execute | Pure helper. |
| Converge on `DATABASE_URL` standard | Execute | Phase 1 uses Citus directly. |
| Token encryption at rest (follow-up) | Execute via `lib/payload-encryptor.ts` | Tokens are PHI-adjacent. Don't defer. |
| OTP rate limiting (follow-up) | Execute | HTTP-layer concern. |
| Mobile-verify tests (follow-up) | Defer to after flow restructuring | Test against the restructured `flows/m1-aadhaar-otp.ts`. |

---

## 14. When to revisit / migrate to durable execution

This design is intentionally provisional. The migration trigger conditions documented in [05-orchestration-target-durable-execution.md §10](./05-orchestration-target-durable-execution.md):

1. **N ≥ 5 active integrations.** When the platform hosts ABDM + Razorpay + HL7v2 + SOAP-XML TPA + insurance, the per-integration boilerplate cost compounds. DE pays back.
2. **Stuck-flow recovery becomes ops pain.** When the team writes a 4th custom "fix this session manually" SQL script, the runtime needs better tooling.
3. **Audit-by-construction discipline slips.** When a code review catches a handler that updated state without writing an audit row (or worse, ops finds one in prod), the discipline-based approach has reached its limit.
4. **A second engineer can run `temporal server start-dev` locally and feel productive.** Cultural readiness gates the migration.
5. **Compliance officer asks for the durable execution story explicitly.** When ABDM Facilitation Testing or DPDP audit requests evidence that goes beyond "we wrote an audit table," upgrade.

The migration is a known shape (see [05 §11](./05-orchestration-target-durable-execution.md#11-migration-path-from-http-first)). Following the Portability Rules in §11 above means the migration is per-flow mechanical refactor (~1 sprint per integration), not a rewrite.

---

## 15. References

- [ADR-0011](../../adr/0011-integration-hub-split.md) — Inbound Gateway / Outbound Connector split
- [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md) — Audit substrate
- [ADR-0026](../../adr/0026-fsm-lite-phase-1.md) — Superseded in shape; this doc is the current Phase 1 design
- [ADR-0027](../../adr/0027-fsm-orchestration-for-integration-hub.md) — Custom FSM engine — explored, deferred indefinitely
- [01-schema-design.md](./01-schema-design.md) — Schema (still valid; the three FSM tables become `integration_workflows` → `abdm_sessions` rename for Phase 1)
- [02-fsm-specifications.md](./02-fsm-specifications.md) — State machine specs (still the authoritative "what each flow does")
- [05-orchestration-target-durable-execution.md](./05-orchestration-target-durable-execution.md) — Future direction
- Hohpe & Woolf, *Enterprise Integration Patterns* (2003), Chapter 8 — Process Manager pattern (this design implements it manually)
