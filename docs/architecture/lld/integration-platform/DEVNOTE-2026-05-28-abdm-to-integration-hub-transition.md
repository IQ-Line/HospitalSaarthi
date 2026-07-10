# DEVNOTE — ABDM adapter → Integration Hub transition analysis

**Date:** 2026-05-28
**Author:** (analysis session)
**Purpose:** Capture the full context of the transition from the Phase 0
`abdm-adapter` prototype to the Phase 1 `integration-hub` service, so this
knowledge doesn't live only in an LLM conversation.

---

## 1. Current state (abdm-adapter)

- **Location:** `modules/abdm-adapter/` + `services/abdm-adapter-svc/`
- **Per ADR-0030:** deliberate Phase 0 prototype, designed to be ported
- **Architecture:** standard onion — `ports.ts` → `use-cases/` → `data-access/`
  with `rest-handlers/` wrapping routes. Pure functions `(input, deps)`.
- **ABDM protocol surface:** M0 (gateway probe), M1 (ABHA identity — 26+
  endpoints), M2 (HIP linking — 17 callbacks + platform routes), M3 (HIU
  consent + data — 9 callbacks + platform routes)
- **Schema:** 8 tables in `abdm_adapter` schema (see §5)
- **State management:** single `abdm_sessions` table with JSONB context,
  ad-hoc `sessions.patch({ state })` calls in each use-case
- **Key dependencies:** `@hims/ts-sdk-abha`, `@hims/ts-sdk-db`,
  `@hims/ts-sdk-events`, `jose` (JWS verify), `@noble/curves` (Fidelius)
- **Event wiring:** consumes `care-context.registered` from record-foundation,
  emits `session.state-changed`, `consent.granted`, `health-record.received`
- **Key dev:** Kamal (kamaljeet.arya@iqline.co.in)

## 2. Target state (integration-hub)

- **Location:** `modules/integration-hub/` + `services/integration-hub-svc/`
  (NOT YET CREATED)
- **Chosen architecture:** HTTP-first with disciplined Postgres state
  (per `04-orchestration-phase-1-http-first.md`, 2026-05-18 decision)
- **No FSM engine.** No Temporal. No JSON definitions.
- **Schema:** 13 tables in `integration_hub` schema (see §5)
- **Design pattern:** Standard onion preserved for Phase 1. The
  `flows/` + `activities/` split from `04-orchestration` is a future
  refinement, not a Phase 1 requirement.
- **One new helper:** `lib/atomic-transition.ts` centralises state writes
  + audit INSERT + timer scheduling in a single transaction. Use-cases call
  this instead of `sessions.patch()` directly.

## 3. Key architectural decisions

| Decision | Where documented | What was decided |
|---|---|---|
| Phase 0 prototype | ADR-0030 | Build ABDM now without FSM engine; port later |
| Integration Hub split | ADR-0011 | Two services (Inbound + Outbound) sharing control plane |
| FSM engine target | ADR-0027 | Custom FSM on PostgreSQL — explored, deferred indefinitely |
| FSM-lite Phase 1 | ADR-0026 | Plain TypeScript flows on FSM tables — superseded by HTTP-first |
| **HTTP-first for Phase 1** | **04-orchestration-phase-1-http-first.md** | **CHOSEN.** Fastify HTTP server + disciplined Postgres. No engine. |
| No per-module audit | ADR-0024 | Audit is projected from transitions + messages + events + request logs |
| Record Foundation boundary | ADR-0028 | Integration Hub = transport only. RF = clinical records + bundles. |
| No activities/flows split (yet) | (this note) | Keep onion in Phase 1. Future refinement deferred. |

## 4. The HTTP-first pattern vs the current onion

### Current onion (abdm-adapter)

```
rest-handlers/  →  use-cases/  →  data-access/  (DB + HTTP)
                        ↕
                  sessions.patch()  ← ad-hoc state writes
```

The current use-case does everything in one function: load session → guard state → call external APIs → encrypt → patch session state → return. This works but mixes state management with pure work.

### HTTP-first onion (what we're building)

Same structure, one new discipline:

```
rest-handlers/  →  use-cases/  →  data-access/  (DB + HTTP)
                        ↕
                  atomicTransition()  ← ONE function that writes state + audit + timers atomically
```

The only change in use-cases is replacing `deps.sessions.patch({ state, ... })` with `atomicTransition(session, fromState, toState, contextPatch, timers?)`. Everything else — the function signature, the `deps` injection, the return type — stays identical.

### Future refinement (deferred)

The `04-orchestration` doc describes a `flows/` + `activities/` split:

- **activities/** — pure work functions, no session state access (HTTP calls, encryption). Individually testable.
- **flows/** — orchestration: load session, guard state, compose activities, call atomicTransition.

This is a zero-risk extraction from the current use-cases. The use-case eventually becomes a flow that calls extracted activity functions. Deferred until there's enough repetition across integrations to justify it.

## 5. Table mapping

### 1:1 move (schema rename only)

| Current (`abdm_adapter`) | Target (`integration_hub`) | Columns |
|---|---|---|
| `abdm_sessions` | `abdm_sessions` | iq_tenant_id, session_id, flow_kind, state, txn_id, request_id, x_token (encrypted), t_token (encrypted), context JSONB, created_at, updated_at |
| `abdm_link_tokens` | `abdm_link_tokens` | iq_tenant_id, abha_address, link_token, expires_at, obtained_at, pending_request_id, pending_expires_at |

### 1:1 move with column additions

| Current | Target | Additional columns |
|---|---|---|
| `abdm_inbound_messages` | `integration_inbound_messages` | +integration_id (FK ref), +endpoint, +headers, +payload_storage_ref, +payload_size_bytes, +payload_hash, +workflow_id, +outcome, +error |
| `abdm_consent_artefacts` (HIP) | `abdm_consent_artifacts` | +integration_id, +abha_address, +role='hip', +purpose_code, +hi_types[], +permissions JSONB, +care_context_refs JSONB, +consent_artifact_storage_ref, +revoked_at, +updated_at |

### Merged (3 tables → 2 target tables)

`abdm_m3_consent_requests` + `abdm_m3_consent_artefacts_hiu` + `abdm_consent_artefacts`
→ **`abdm_consent_artifacts`** (unified with `role` column = 'hip' | 'hiu')

`abdm_m3_data_transfers`
→ **`abdm_data_exchange_sessions`** (key material → vault ref, bundle → bundle_count)

### Folded (table removed)

`abdm_link_otps` → `abdm_sessions.context` (otp_hash, attempts) + `integration_timers` (expiry)

### New tables (no current equivalent)

| Target table | Purpose | Key columns |
|---|---|---|
| `integrations` | Registry per (tenant, integration kind) | id, iq_tenant_id, name, kind, direction, protocol, auth_method, status, rate_limit_rpm, config JSONB, ... |
| `integration_credentials` | Vault references (never the bytes) | id, iq_tenant_id, integration_id, credential_kind, vault_ref, rotation_policy, expires_at |
| `integration_outbound_messages` | Log of every outbound HTTP call | id, integration_id, idempotency_key, endpoint, method, payload_storage_ref, attempt_count, outcome, response_status, next_retry_at |
| `integration_workflow_transitions` | Append-only audit: every state change | id (BIGINT seq), iq_tenant_id, workflow_id, from_state, to_state, trigger_kind ('event'\|'timer'\|'manual'), trigger_payload JSONB, occurred_at, actor |
| `integration_timers` | Durable timer rows for the worker | id, iq_tenant_id, workflow_id, kind, fire_at, payload, status ('pending'\|'fired'\|'cancelled') |
| `abdm_gateway_sessions` | Cached ABDM gateway access tokens | id, integration_id, environment, access_token_storage_ref, expires_at |
| `abdm_share_tokens` | Scan-and-share daily token counter | id, integration_id, facility_id_ref, issue_date, next_token_number |
| `abdm_share_token_issuances` | Each issued scan-and-share token | id, integration_id, facility_id_ref, token_number, patient_id, abha_address, profile_storage_ref, redeemed_at |

## 6. Migration effort summary

| Component | Effort | Nature |
|---|---|---|
| `lib/atomic-transition.ts` | 1 day | NEW, ~60 lines |
| `lib/idempotency-middleware.ts` | 1 day | NEW, ~80 lines |
| Timer worker (extract from janitor) | 1 day | NEW, ~150 lines |
| Schema: 5 generic tables (Drizzle defs) | 1 day | NEW, ~200 lines |
| Schema: ABDM table migration script | 2 days | 1:1 moves + consent merge |
| Integration registry CRUD handlers | 2 days | NEW REST handlers |
| Service scaffold (port 3005) | 1 day | Copy existing Fastify pattern |
| Move ABDM code to `integrations/abdm/` | 1 day | Relocate files, update imports |
| Swap `sessions.patch` → `atomicTransition` | 1 day | ~30 files, mechanical |
| Idempotency wrapper on callbacks | 1 day | Add middleware to existing routes |
| Integration credentials in use-cases | 1 day | Route secret refs through deps |
| **Total** | **~3-4 weeks** | Single dev, no interruptions |

## 7. File layout (target)

```
services/integration-hub-svc/
  src/
    main.ts                  Fastify bootstrap (port 3005)
    resolve-database-url.ts
    load-env.ts
  project.json
  package.json
  tsup.config.ts
  tsconfig.json

modules/integration-hub/
  src/
    router.ts                Mounts ABDM + integrations CRUD routes
    ports.ts                 (moved from abdm-adapter)
    lib/
      atomic-transition.ts   UPDATE session + INSERT audit + INSERT timers
      idempotency.ts         INSERT ON CONFLICT DO NOTHING helper
      secrets.ts             env:/azure-keyvault: resolver wrapper
      audit-writer.ts        Writes to integration_workflow_transitions
    schema/
      integrations.ts        Drizzle table defs (generic + ABDM)
      integration_timers.ts
      integration_workflow_transitions.ts
      integration_inbound_messages.ts
      integration_outbound_messages.ts
      abdm_sessions.ts       (moved from abdm-adapter)
      abdm_consent_artifacts.ts   (unified)
      abdm_data_exchange_sessions.ts
      abdm_link_tokens.ts
      abdm_gateway_sessions.ts
      abdm_share_tokens.ts
      abdm_share_token_issuances.ts
    workers/
      timer-worker.ts        Polls integration_timers with FOR UPDATE SKIP LOCKED
    rest-handlers/
      integrations.ts        CRUD for integrations + integration_credentials
    integrations/
      abdm/
        use-cases/           (moved from abdm-adapter, sessions.patch → atomicTransition)
        rest-handlers/       (moved from abdm-adapter + idempotency wrapper)
        data-access/         (moved from abdm-adapter)
        domain/              (moved from abdm-adapter)
        events/              (moved from abdm-adapter)
        lib/                 (abdm-specific: fidelius, signature verify, etc.)

specs/openapi/
  integration-hub.v1.yaml    (new, or rename abdm-adapter.v1.yaml)
```

## 8. Docs reviewed

- `docs/architecture/hld/05-integration-and-interop.md`
- `docs/architecture/lld/integration-platform/01-schema-design.md`
- `docs/architecture/lld/integration-platform/02-fsm-specifications.md`
- `docs/architecture/lld/integration-platform/03-scenarios.md`
- `docs/architecture/lld/integration-platform/04-orchestration-phase-1-http-first.md`
- `docs/architecture/lld/integration-platform/05-orchestration-target-durable-execution.md`
- `docs/architecture/lld/integration-platform/orientation.md`
- `docs/architecture/lld/integration-platform/dev-guide.md`
- `docs/architecture/lld/integration-platform/schema-reference.json`
- `docs/architecture/lld/abdm-adapter/01-overview.md`
- `docs/architecture/adr/0030-abdm-adapter-prototype-phase.md`
- `docs/architecture/adr/0026-fsm-lite-phase-1.md`
- `docs/architecture/adr/0027-fsm-orchestration-for-integration-hub.md`
- `docs/architecture/adr/0011-integration-hub-split.md`
- `docs/architecture/adr/0028-record-foundation-fifth-core-module.md`
- `docs/architecture/adr/0024-audit-deferred-to-pre-prod.md`
- `modules/abdm-adapter/src/schema/tables.ts`
- `modules/abdm-adapter/src/ports.ts`
- `modules/abdm-adapter/src/domain/session.ts`
- `modules/abdm-adapter/src/use-cases/m1/enrol-aadhaar-otp-request.ts`
- `modules/abdm-adapter/src/use-cases/m1/enrol-aadhaar-verify-request.ts`
- `modules/abdm-adapter/src/rest-handlers/m1/m1-routes.ts`
- `services/abdm-adapter-svc/src/main.ts`

## 9. Key people

- **Kamal** (kamaljeet.arya@iqline.co.in) — ABDM adapter primary dev. Transition executor.
- **Ayush Wardhan** (ayush.wardhan@iqline.co.in) — Architecture / docs author. Record Foundation ownership.
- **Tech lead** — Wants onion preserved, integration-hub as umbrella, ABDM as sub-module.

## 10. Open questions

1. Should `integration-hub-svc` run on an existing port or the planned port 3005?
2. Should the existing `abdm-adapter-svc` continue to serve until `integration-hub-svc` is feature-complete, or cut over in one release?
3. `@hims/ts-sdk-secrets` package — Phase 1 default is `env:` scheme. Do we build the full package now or inline the resolver?
4. Does the existing ABDM OpenAPI spec rename to `integration-hub.v1.yaml` or stay separate?
5. Nx project naming — `integration-hub` for module, `integration-hub-svc` for service? What about the nx tag mapping?
