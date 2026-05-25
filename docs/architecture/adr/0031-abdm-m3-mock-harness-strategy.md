# ADR-0031: ABDM Adapter M3 mock harness — ship a curl-injectable CM + loopback HIU inside the adapter

- **Status:** Accepted
- **Date:** 2026-05-21
- **Deciders:** Architect (this session) with the ABDM developer (consumer)
- **Consulted:** None — pattern extends ADR-0030 + M2's mock-platform-clients work in PR #86
- **Informed:** Record Foundation owner (interplay with the eventual real `RecordFoundationClient`), EMPI owner

## Context and problem statement

[ADR-0030](./0030-abdm-adapter-prototype-phase.md) ships the ABDM Adapter in Phase 0. M1 and M2 are merged on `dev`. M3 — patient-data exchange under consent — adds two new structural concerns:

- **More inbound-callback choreography.** A single HIU-side consent-request flow has five inbound CM callbacks (`on-init`, `notify`, `on-status`, `on-fetch`, plus the data-flow `on-request`). The HIP-side data-response flow adds one more inbound (`/hip/health-information/request`) plus the HIU push receiver. Each callback's arrival is order-sensitive and changes session state.
- **Envelope-encrypted data movement.** M3 is the milestone where Fidelius (BC Weierstrass curve25519 + AES-256-GCM, built in M2 PR #86) actually moves PHI between HIP and HIU. Crypto bugs in this code are not safe-to-deploy.

The developer needs to drive these flows locally during implementation. Three constraints are real:

- **A real PHR app cannot be in the loop for every test.** Patient consent grants on Eka.Care / NDHM are interactive and slow; no developer can drive 30 test iterations per day this way.
- **Real Record Foundation does not exist yet.** Bundle assembly is a downstream module. The M2 pattern (mock `RecordFoundationClient` returning a placeholder `HealthDocumentRecord`) covers HIP-side payload generation, but HIU-side decryption needs an actual encrypted payload to decrypt — which means a working HIP somewhere.
- **ABDM sandbox availability has been spotty.** During the M2 sprint, the sandbox went down for hours at a time, blocking the developer.

We need a way to drive M3 flows locally that doesn't depend on a real PHR app, real Record Foundation, or sandbox availability — without doubling the surface we maintain.

## Decision drivers

- **Match the M2 mock pattern.** PR #86 introduced `MockEmpiClient`, `MockRecordFoundationClient`, and a `MockGatewayClient` via env-gated dependency injection. M3 mock plumbing should look the same — same env-flag style, same DI seam, same "use-case code is identical regardless of mock vs real" rule.
- **End-to-end testing without external services.** The developer should be able to drive `consent request → notify → fetch → data request → encrypted push → decrypt → store` in a single service on a single laptop, without ngrok, without sandbox, without a separate HIU instance.
- **Don't double the maintenance surface.** Mock fixtures and curl scripts must live in the same repo as the code they exercise, so they evolve together. Adversarial review during this PR catches drift.
- **Verify the real code path, not the mock path.** The mock must exercise the same encryption, signature verification, state-machine, idempotency, and persistence code paths as real. Only the I/O at the edges is mocked.
- **Easy to remove.** When real Record Foundation + a separate HIU service exist, flipping two env flags should restore production-shaped behaviour with no code deletion.

## Considered options

1. **Option A — Mock CM via curl-injectable callbacks + loopback HIU inside the adapter.** Two env flags (`ABDM_M3_MOCK_GATEWAY=true`, `ABDM_M3_LOOPBACK_HIU=true`). Outbound gateway HTTP becomes no-ops with structured logging; the developer fires synthetic callbacks at the adapter via bash scripts + JSON fixtures. The HIP-side data push, when in loopback mode, POSTs to the same service's HIU receiver endpoint instead of the external `dataPushUrl` from the request. One service plays both roles.
2. **Option B — Separate mock-CM service in another repo / process.** A standalone Node or Python service that mimics the ABDM CM: holds consent requests in memory, fires `on-*` callbacks on a timer, accepts our `cm/request` posts. Developer runs adapter + mock-CM as two processes.
3. **Option C — Fixtures + integration tests only.** No interactive mock. Provide JSON fixtures of every callback shape; Vitest integration tests drive the flows in-process. The developer cannot drive flows manually outside the test runner.
4. **Option D — Real sandbox only, no mocks.** Developer uses ngrok + ABDM sandbox like M2. Mock work deferred entirely.

## Decision outcome

Chosen option: **Option A — curl-injectable CM callbacks + loopback HIU inside the adapter.**

Concretely:

- Two env flags wire the mocks: `ABDM_M3_MOCK_GATEWAY` and `ABDM_M3_LOOPBACK_HIU`. Both default `true` in dev, `false` in prod.
- `ABDM_M3_MOCK_GATEWAY=true` makes the gateway HTTP client a no-op-with-log. Outbound posts are recorded but not sent; the developer drives the next state transition by firing the would-have-been-callback themselves via curl.
- `ABDM_M3_LOOPBACK_HIU=true` makes the HIP-side push step substitute the request's external `dataPushUrl` with `http://localhost:${PORT}/api/v3/hiu/health-information/transfer/${transferId}`. The same service receives, decrypts, and stores — closing the loop without a separate HIU instance.
- Curl injection scripts and JSON fixtures ship under `modules/abdm-adapter/scripts/m3/` and `modules/abdm-adapter/test-fixtures/m3/`. A `full-loop.sh` script drives the eight-step end-to-end smoke test in under five minutes.
- Wiring is via dependency injection — same pattern as M2's `MockEmpiClient` / `MockRecordFoundationClient`. Use-case code is identical regardless of mock or real. Only `services/abdm-adapter-svc/src/main.ts` chooses concretions at construction time.

The mock targets the I/O edges (gateway HTTP, external HIU URL). Everything inside the adapter — state machine, signature verification, ECDH key derivation, AES-GCM encrypt/decrypt, persistence, idempotency, event emission — runs the real code path during mock-mode flows.

### Consequences

**Positive:**

- **Developer unblocks from sandbox availability.** A full M3 flow runs in five minutes on a laptop with no external dependencies.
- **Crypto round-trip is genuinely exercised.** The HIP encrypts, the HIU decrypts, both halves use `fidelius-curve25519-bc.ts` from PR #86. Decryption failures surface in dev, not in production.
- **Mock plumbing matches M2's pattern.** The developer already knows the DI seam from M2; no new mental model.
- **Removal is two env flag flips.** When the real HIU service and real Record Foundation arrive, set the flags to `false`, the production code path takes over. Curl scripts become integration-test inputs; fixtures stay useful for unit tests.
- **Fixtures travel with the code that consumes them.** Spec drift between fixture bodies and adapter handler expectations gets caught in PR review, not at runtime.

**Negative / accepted trade-offs:**

- **Mock fixtures must be kept aligned with spec.** If ABDM publishes a v3.1 with a new field in `on-fetch`, the fixture and the adapter DTO must update together. Mitigation: vetting-notes doc + per-fixture spec § citation.
- **Loopback mode means HIP and HIU sides share a process.** Transfer-id uniqueness across both roles is required (UUID v4, no role prefix). State pollution across roles within one tenant is avoided by separate session tables per flow kind.
- **Signature verification is no-op in mock mode.** The fixture's `signature` field is a placeholder; the verifier accepts it because `ABDM_M3_MOCK_GATEWAY=true` flips the verifier to permissive. Production must verify against the real CM JWKS endpoint — flagged as an open question in `09-m3-dev-guide.md §11`.
- **No simulated CM state.** A real CM holds consent requests, schedules notify-after-grant, supports status polling. The mock-via-curl model has the developer simulate the CM's memory by re-firing fixtures with edited bodies. Acceptable for early M3 work; full state simulation belongs in Option B if it ever becomes a bottleneck.
- **The mock surface area is real maintenance.** Six injection scripts, nine fixtures, env-flag plumbing, and the loopback URL rewrite. Mitigation: scope is bounded (M3 only); when removed, the scripts/fixtures stay as integration-test inputs and have ongoing value.

**Follow-up actions:**

- [ ] Adversarial review of the harness PR — confirm fixtures match spec body shapes and curl scripts run end-to-end.
- [ ] When real Record Foundation lands, replace `MockRecordFoundationClient.fetchBundlesForConsent` with the HTTP-backed implementation; flag in the M3 dev guide's "open questions" §11.
- [ ] When a separate HIU service exists, flip `ABDM_M3_LOOPBACK_HIU=false` and set `ABDM_M3_DATA_PUSH_URL_ALLOWLIST` to known HIU base URLs. The HIP push then goes to a real external URL.
- [ ] Once production JWS verification of CM callbacks is implemented (open question in M2 + M3 dev guides), `ABDM_M3_MOCK_GATEWAY=false` and the real verifier engages. The mock signature in fixtures becomes a test-only stub.

## Pros and cons of the options

### Option A — Curl-injectable CM + loopback HIU inside the adapter (chosen)

- *Good:* Single-process, single-laptop, five-minute end-to-end loop with no external dependencies.
- *Good:* Reuses M2's DI pattern — no new mental model.
- *Good:* Exercises the real crypto, state machine, idempotency, and persistence code paths.
- *Good:* Removal is two env-flag flips; no code deletion needed.
- *Bad:* Mock fixtures need spec alignment vigilance.
- *Bad:* Signature verification is permissive in mock mode (real verifier is a known follow-up regardless).
- *Bad:* Six scripts + nine fixtures = real maintenance surface in this PR.

### Option B — Separate mock-CM service

- *Good:* More realistic CM behaviour — holds consent requests in memory, can simulate timer-based notify, supports status polling without re-firing fixtures.
- *Good:* Cleaner architectural separation; mock CM doesn't pollute adapter code.
- *Bad:* Doubles the dev setup — adapter + mock-CM as two processes; pkg installs, port allocation, network config.
- *Bad:* Two repos to keep aligned with spec; drift detection harder.
- *Bad:* Doesn't solve the dataPushUrl loopback problem on its own — still need a way to receive the HIP push without an external HIU.
- *Bad:* Setup time eats most of the speed advantage over Option A for short test cycles.

### Option C — Fixtures + integration tests only

- *Good:* Smallest scope; no scripts, no env flags, no loopback wiring.
- *Good:* All flow exercise happens in a deterministic test environment.
- *Bad:* Developer cannot drive flows manually for exploratory debugging — every change requires editing a test file and re-running.
- *Bad:* No way to inspect intermediate state via curl GET during a flow.
- *Bad:* Doesn't help with "the adapter is up and behaving — does it accept this synthetic body?" type questions during real-sandbox debugging.

### Option D — Real sandbox only

- *Good:* Highest fidelity — no mock drift possible.
- *Good:* Zero new code to write.
- *Bad:* Blocks the developer whenever sandbox is down (recurring issue in M2 sprint).
- *Bad:* Requires a real PHR-app patient consent grant per test iteration — fundamentally slow.
- *Bad:* Forces ngrok + sandbox console reconfiguration for every endpoint added.
- *Bad:* No way to test the HIU side without a separate HIU service registered with the CM.

## Revisit trigger

Drop the mock harness and switch to real services when **all three** of:

1. Record Foundation provides a real `fetchBundlesForConsent` HTTP endpoint returning patient FHIR bundles.
2. A separate HIU service exists in the platform (registered with CM, owns its `dataPushUrl`).
3. The CM JWKS-based JWS signature verifier is wired in production.

At that point, set both env flags to `false` and rely on integration tests against the real sandbox + the curl scripts as test-time input fixtures.

## Links

- Related ADRs:
  - [ADR-0030 — ABDM Adapter prototype phase](./0030-abdm-adapter-prototype-phase.md) (Phase 0 module shape this harness lives in)
  - [ADR-0028 — Record Foundation as fifth core module](./0028-record-foundation-fifth-core-module.md) (eventual real `RecordFoundationClient` consumer)
  - [ADR-0027 — FSM orchestration for Integration Hub](./0027-fsm-orchestration-for-integration-hub.md) (future port target; mock harness must not couple to current state-handling)
  - [ADR-0017 — InProcessEventBus for Phase 0](./0017-inprocess-event-bus.md) (`abdm.health-record.received` event emitted on STORED is consumed in-process for now)
- Related LLD: [docs/architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md](../lld/abdm-adapter/10-m3-mock-harness-guide.md) (the runtime playbook for this ADR's decisions)
- M2 reference: PR #86 (`MockEmpiClient`, `MockRecordFoundationClient`, mock platform clients pattern); `modules/abdm-adapter/src/lib/dev-inbound-simulation.ts` (M1/M2 inbound simulation precedent)
