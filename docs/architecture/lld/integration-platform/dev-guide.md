# Integration Platform -- Phased Implementation Guide

> Mirror of the GitHub issue body. Posted as a separate issue to track the implementation.

**Phase 0/1 dev simplifications apply.** See [dev-env-simplifications.md](../../dev-env-simplifications.md) for the `HIMS_CITUS_ENABLED`, `PERMISSIVE_MODE`, `STRICT_SPEC_VALIDATION` knobs, the `env:` secrets default, and the [REQUIRED FOR DEMO] / [DEFER IF TIME-CONSTRAINED] / [POST-DEMO] tag legend. Steps below tagged accordingly; untagged = [REQUIRED FOR DEMO] by default.

The Integration Hub is platform infrastructure -- always deployed alongside the five core modules. Its v1 covers the **control plane + FSM-lite helpers** (Phase 0) and the **ABDM Adapter** (Phase 1). The generic FSM engine described in [ADR-0027](../../adr/0027-fsm-orchestration-for-integration-hub.md) is **deferred to Phase 1.5** per [ADR-0026](../../adr/0026-fsm-lite-phase-1.md); Phase 1 implements the six ABDM flows as plain TypeScript using the same FSM schema tables.

### What's already designed

- **HLD:** [05-integration-and-interop.md](../../hld/05-integration-and-interop.md) (sections 1-4, 7).
- **LLD schema:** [01-schema-design.md](./01-schema-design.md) and [`schema-reference.json`](./schema-reference.json) (13 tables; the `integration_audit_log` table from earlier drafts was removed per [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md)).
- **FSM specs:** [02-fsm-specifications.md](./02-fsm-specifications.md) (M1, scan-and-share, M2, M3-HIP, M3-HIU, consent supervisor).
- **Scenarios:** [03-scenarios.md](./03-scenarios.md) (7 sequence-driven walkthroughs).
- **OpenAPI spec:** [`specs/openapi/integration-hub.v1.yaml`](../../../../specs/openapi/integration-hub.v1.yaml) (28 paths).
- **ERDs (per phase, cumulative):** [`integration-platform.phase-0.erd.json`](./integration-platform.phase-0.erd.json) (7 tables — control plane + FSM engine), [`integration-platform.phase-1.erd.json`](./integration-platform.phase-1.erd.json) (13 — adds the six ABDM adapter tables).
- **ADRs:** [0011](../../adr/0011-integration-hub-split.md) (Integration Hub split), [0020](../../adr/0027-fsm-orchestration-for-integration-hub.md) (FSM engine target architecture), [0021](../../adr/0028-record-foundation-fifth-core-module.md), [0022](../../adr/0022-immutable-fhir-document-storage.md), [0023](../../adr/0023-distributed-fhir-assembly.md), [0024](../../adr/0024-audit-deferred-to-pre-prod.md) (audit deferred), **[0026](../../adr/0026-fsm-lite-phase-1.md) (FSM-lite Phase 1 implementation — read this before starting Phase 0b)**.

---

## Phase 0a -- Control Plane scaffold (1-2 dev-weeks)

**Goal:** Integration Hub service runs and exposes the integration registry. No adapters yet.

- [ ] Scaffold `services/integration-hub-svc/` (port 3005, Fastify v5 per [ADR-0019](../../adr/0019-fastify-node24-lts.md)).
- [ ] Scaffold `modules/integration-hub/` mirroring the Module Shape Template ([HLD 03](../../hld/03-module-shape-template.md)).
- [ ] Generate Drizzle migrations for the 7 control-plane + FSM-engine tables in [schema-reference.json](./schema-reference.json): `integrations`, `integration_credentials`, `integration_workflows`, `integration_workflow_transitions`, `integration_workflow_timers`, `integration_inbound_messages`, `integration_outbound_messages`. (No per-module audit table — see [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md) and [§4.4 of the schema design](./01-schema-design.md#44-audit-posture--no-per-module-audit-table).)
- [ ] Implement REST handlers for the **Integrations** tag in [integration-hub.v1.yaml](../../../../specs/openapi/integration-hub.v1.yaml): list/get/create/update integrations, add credentials.
- [ ] Wire identity adapter (`@hims/ts-sdk-identity`), tenant context (`@hims/ts-sdk-tenant`), event publisher (`@hims/ts-sdk-events`), DB helpers (`@hims/ts-sdk-db`).
- [ ] Cerbos policies for Integration Hub admin actions. **[DEFER IF TIME-CONSTRAINED]** — `PERMISSIVE_MODE=true` is acceptable locally; staging requires real policies before cutover.
- [ ] Smoke test: register an integration, list it, update its status.

## Phase 0b -- FSM-lite helpers + singleton timer worker (3-4 dev-days)

**Goal (per [ADR-0026](../../adr/0026-fsm-lite-phase-1.md)):** the four helper functions and the timer-worker dispatcher are in place so Phase 1 ABDM flows can be written as plain TypeScript on top of the FSM schema tables. The generic engine is **not** built in Phase 1 — it is deferred to Phase 1.5 per ADR-0026.

- [ ] Create `packages/ts-sdk-workflow/` with **just these four exports** (the entire package is ~150 lines):
  - `loadWorkflow(ctx, workflow_id)` → returns the row with `state` and `context` typed.
  - `transitionTo(workflow_id, fromState, toState, contextPatch)` → INSERTs a transition row and UPDATEs the workflow row in one DB transaction; rejects the call if `workflow.state !== fromState` (idempotency + concurrency safety).
  - `scheduleTimer(workflow_id, kind, dueAt)` → INSERTs into `integration_workflow_timers`.
  - `clearTimer(workflow_id, kind)` → marks pending timers of this kind as cancelled.
- [ ] Implement the singleton timer-worker dispatcher: every 5 seconds, `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 50` of due timers; dispatch each to the hardcoded `HANDLERS[timer.kind]` map; mark fired/failed.
- [ ] **No generic engine, no JSON-Logic, no definition validator, no Mermaid build-time renderer in Phase 1.** Those land with the engine in Phase 1.5.
- [ ] PR review checklist asserting the four engine guarantees per ADR-0026 (atomic transition, durable timer, append-only transition log, idempotent transitions). Each Phase 1 flow's PR is reviewed against this checklist.
- [ ] Acceptance: a trivial test flow (e.g., a fake `test.flow.v1` with states INIT → ACTIVE → DONE, one timer firing at +30s) runs end-to-end. Verify the workflow row UPDATEs, three transition rows INSERT (audit by construction), the timer row fires once and only once even with multiple worker instances running.

## Phase 0c -- Secrets SDK + message logs (3-4 dev-days)

- [ ] Scaffold `packages/ts-sdk-secrets/` with a scheme-dispatching resolver. **Phase 0/1 default scheme is `env:`** (reads `process.env.<NAME>`); the same SDK supports `azure-keyvault://`, `aws-sm://`, `vault://`, `file://` resolvers added later when an ops vault is provisioned. Migration is a config edit, not code.
- [ ] Wire a `.env.example` checked into the repo listing the variable names a developer needs (`ABDM_SANDBOX_CLIENT_ID`, `ABDM_SANDBOX_CLIENT_SECRET`, etc.) — no actual secret values committed.
- [ ] Implement the inbound and outbound message logging middlewares. These are *operational* logs (idempotency, retry, observability), not audit. PHI rule: message bodies live at `payload_storage_ref`; the row itself carries metadata only.
- [ ] Acceptance: an inbound test request creates a row in `integration_inbound_messages`; an outbound side-effect creates a row in `integration_outbound_messages`; both correlate to a workflow via `workflow_id`. The `@hims/ts-sdk-secrets` test suite verifies an `env:`-prefixed ref resolves correctly.

## Phase 1a -- ABDM Adapter foundation (2 dev-weeks)

**Goal:** ABDM gateway connectivity, session caching, scan-and-share end-to-end.

- [ ] Generate Drizzle migrations for tables 9-14 (ABDM tables: abdm_gateway_sessions, abdm_share_tokens, abdm_share_token_issuances, abdm_consent_artifacts, abdm_link_tokens, abdm_data_exchange_sessions).
- [ ] Implement gateway client: session create + cache (`abdm_gateway_sessions`), Fidelius helper for envelope encryption (factor into `packages/ts-sdk-abdm-protocol/` if duplication emerges).
- [ ] Register the `kind=abdm` adapter in the dispatcher.
- [ ] Implement the FSM definition `abdm.scan-and-share.v1` per [02-fsm-specifications.md §4](./02-fsm-specifications.md#4-abdmscan-and-sharev1--the-kiosk-qr-flow). Inbound `/v3/profile/on-share` callback handler. Atomic token allocation per [§4 SQL pattern](./02-fsm-specifications.md#4-abdmscan-and-sharev1--the-kiosk-qr-flow).
- [ ] Implement the reg-desk lookup endpoint `GET /api/v1/abdm/scan-and-share/issuances?token_number=N&date=...`.
- [ ] Acceptance: a scan-and-share end-to-end test against ABDM sandbox issues a token, registers a patient via EMPI, surfaces the token at the lookup endpoint.

## Phase 1b -- M1 ABHA enrollment (2 dev-weeks)

**Goal:** A patient walks in, doesn't have ABHA, kiosk creates one via Aadhaar OTP, EMPI is updated.

- [ ] Implement the FSM definition `abdm.m1.aadhaar-otp.v1` per [02-fsm-specifications.md §3](./02-fsm-specifications.md#3-abdmm1aadhaar-otpv1--abha-creation-via-aadhaar-otp).
- [ ] Implement the ABDM ABHA endpoints in OpenAPI: `POST /api/v1/abdm/abha/enroll`, `POST /api/v1/abdm/abha/{workflow_id}/verify-otp`, `POST /api/v1/abdm/abha/{workflow_id}/create-address`.
- [ ] Wire the EMPI `POST /patients/:id/identifiers` calls for `abha_number` and `abha_address` at the `LINKED` transition.
- [ ] (Phase 1b extension) Implement `abdm.m1.find-by-mobile.v1` for ABHA recovery flows.
- [ ] Acceptance: end-to-end against ABDM sandbox -- create a test ABHA, see two `patient_identifiers` rows in EMPI, see `abdm.m1.completed` event fire.

## Phase 1c -- M2 care-context linking (2 dev-weeks)

- [ ] Implement `abdm.m2.user-initiated-link.v1` per [02-fsm-specifications.md §5](./02-fsm-specifications.md#5-abdmm2user-initiated-linkv1--patient-links-from-phr-app).
- [ ] Implement `abdm.m2.hip-initiated-link.v1`.
- [ ] Inbound callbacks for `/v3/care-context/discover`, `/v3/care-context/init`, `/v3/care-context/confirm`.
- [ ] Wire the Record Foundation calls (`GET /api/v1/care-contexts/discoverable?patient_id=X`, `POST /api/v1/care-contexts/bulk-update-linkage`).
- [ ] Acceptance: a patient links their existing OPD records to ABHA; care_contexts.abha_linkage_status flips to `linked` and `abdm_reference_number` populates.

## Phase 1d -- M3 HIP and consent (2-3 dev-weeks)

- [ ] Implement `abdm.m3.hip.v1` per [02-fsm-specifications.md §6](./02-fsm-specifications.md#6-abdmm3hipv1--hip-serves-records-under-consent). Inbound `/v3/consents/hip/notify` and `/v3/health-information/hip/request`.
- [ ] Implement `abdm.consent.lifecycle.v1` supervisor per [02-fsm-specifications.md §8](./02-fsm-specifications.md#8-abdmconsentlifecyclev1--the-long-lived-supervisor).
- [ ] Wire Record Foundation `POST /api/v1/disclosures` and `GET /api/v1/bundles/:id`.
- [ ] Fidelius envelope encryption against the HIU's `transferPublicKey`.
- [ ] Outbound push to HIU's `dataPushUrl`.
- [ ] Outbound notify to gateway `/v3/health-information/notify` with `transferred` status.
- [ ] Acceptance: end-to-end Facilitation Testing scenario -- external HIU requests a record under consent; bundle disclosure observed at HIU. Disclosure is verifiable from `integration_outbound_messages` (the encrypted bundle leaving the platform) + `integration_workflow_transitions` (the state changes under `consent_id`), per [§4.4 audit posture](./01-schema-design.md#44-audit-posture--no-per-module-audit-table).

## Phase 1e -- M3 HIU (2 dev-weeks)

- [ ] Implement `abdm.m3.hiu.v1` per [02-fsm-specifications.md §7](./02-fsm-specifications.md#7-abdmm3hiuv1--platform-fetches-external-records).
- [ ] Outbound consent init (`/v3/consents/hiu/request`); inbound consent notify (`/v3/consents/hiu/notify`); outbound data request; inbound data push.
- [ ] Fidelius decryption of received bundles.
- [ ] Emit `abdm.health-record.received` for Record Foundation ingestion.
- [ ] Acceptance: doctor requests external records, patient approves, bundles arrive, Record Foundation timeline shows the external record with the `External: <HIP>` label.

## Cross-cutting

- [ ] **Production Vault wiring** (Phase 1, parallel) -- swap dev in-process secrets for Azure Key Vault adapter.
- [ ] **Stuck-workflow alerting** -- Grafana panel + Prometheus rule on workflows where `last_transition_at < now() - interval '30 min' AND status='running'`.
- [ ] **NHA Facilitation Testing rehearsal** -- run the test catalogue from [docs/external/abdm/test-cases.md](../../../external/abdm/test-cases.md). Target a green pass before Phase 1 closes.

## Definition of done (Phase 1)

- All five FSM definitions deployed and exercised against ABDM sandbox.
- A patient at a real facility can: scan QR -> register -> create ABHA -> have OPD records linked -> have records served to an external HIU under consent -> fetch records from another HIP via the HIU role.
- Integration Hub control plane handles the operational signals (stuck workflows, retry exhaustion, circuit-breaker openings, audit volume).
- DPDP / ABDM erasure obligations honoured via Record Foundation's scheduler (which Integration Hub triggers via consent.expired/revoked events).
