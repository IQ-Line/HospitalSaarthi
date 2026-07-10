# ABDM Adapter — M3 Developer and E2E Guide

> Paths/schema realigned with the integration-hub layout, 2026-07-10.

Companion to the LLD pack (`docs/architecture/lld/abdm-adapter/08-m3-flows.md` through `11-m3-doc-vetting-notes.md`). Use this guide for day-to-day implementation and the **34-scenario** test catalogue (TC-01–TC-34).

> **Sandbox live E2E (M2 link → M3 consent → data fetch), env vars, and a fresh-run checklist:**  
> **[abdm-adapter-e2e-and-production.md](./abdm-adapter-e2e-and-production.md)** — §0.1.1 (env), §6A (Path A), §12 (new entry), §10.1 (production).

## Reading order

1. [08-m3-flows.md](../architecture/lld/abdm-adapter/08-m3-flows.md) — flow catalogue and pitfalls
2. [09-m3-dev-guide.md](../architecture/lld/abdm-adapter/09-m3-dev-guide.md) — implementation checklist
3. [10-m3-mock-harness-guide.md](../architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md) — local 5-minute loop
4. [11-m3-doc-vetting-notes.md](../architecture/lld/abdm-adapter/11-m3-doc-vetting-notes.md) — production bugs to avoid
5. [v3-m3 external spec](../external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md) — NHA body shapes

## Implementation phases (checklist)

| Phase | Deliverable | Exit criteria |
|-------|-------------|---------------|
| 0 | Doc lock | Postman 13 requests mapped to flows; `abdm_m3_*` tables created by `modules/integration-hub/migrations/0000_init.sql` |
| 1 | `@hims/ts-sdk-abha/protocol/m3/*` | DTOs + M3 error codes |
| 2 | Schema + repos | `abdm_m3_*` tables; `M3HiuContext` in `session.ts` |
| 3 | Gateway + push client | `M3_GATEWAY_PATHS`; `ABDM_M3_*` env; allowlist + loopback |
| 4 | HIU use-cases | `use-cases/m3/hiu/*` |
| 5 | REST + router | `/api/v3/hiu/*` callbacks; `/api/abdm/v1/m3/*` platform |
| 6 | Tests + mock loop | `full-loop.sh` exit 0; unit + roundtrip tests green |
| 7 | Sandbox + M1/M2 regression | `RUN_ABDM_SANDBOX_TESTS=1`; M1/M2 suite unchanged |

## Local mock harness (5 minutes)

```bash
npx nx run integration-hub-svc:db-migrate   # creates abdm_m3_* tables (0000_init.sql)

export ABDM_M3_MOCK_GATEWAY=true
export ABDM_M3_LOOPBACK_HIU=true
export ABDM_X_HIU_ID=SBX_TEST_HIU_001
npx nx run integration-hub-svc:serve

bash modules/integration-hub/scripts/m3/full-loop.sh
```

Scripts: [modules/integration-hub/scripts/m3/README.md](../../modules/integration-hub/scripts/m3/README.md)  
Fixtures: [modules/integration-hub/test-fixtures/m3/README.md](../../modules/integration-hub/test-fixtures/m3/README.md)

## Test catalogue (TC-01–TC-34)

Run **after Phase 6**. Mark Pass/Fail in PR or test log.

### HIU consent-request (TC-01–TC-12)

| ID | Scenario | Type | Driver |
|----|----------|------|--------|
| TC-01 | Start consent → `CONSENT_INIT_REQUESTED` | + | `POST /api/abdm/v1/m3/hiu/consent/request` |
| TC-02 | `on-init` success → `AWAITING_PATIENT_APPROVAL` | + | `inject-on-init.sh` |
| TC-03 | `on-init` with error → `EXPIRED` | − | `hiu/on-init-error.json` |
| TC-04 | `notify` GRANTED → fetch fan-out | + | `inject-notify-granted.sh` |
| TC-05 | `notify` GRANTED two artefacts | + | Custom notify fixture |
| TC-06 | `notify` DENIED | − | `inject-notify-denied.sh` |
| TC-07 | `on-fetch` valid artefact → `CONSENT_GRANTED` | + | `inject-on-fetch.sh` |
| TC-08 | `on-fetch` invalid signature | − | Tampered fixture (staging strict) |
| TC-09 | Duplicate `REQUEST-ID` on `on-init` | − | Repeat POST |
| TC-10 | Duplicate `REQUEST-ID` on `notify` | − | Repeat POST |
| TC-11 | Poll session GET monotonic states | + | `GET .../consent/request/{sessionId}` |
| TC-12 | `dataEraseAt` in past → 400 | − | Bad start body |

### HIU data-fetch (TC-13–TC-22)

| ID | Scenario | Type | Driver |
|----|----------|------|--------|
| TC-13 | Start data-request → `DATA_REQUESTED` | + | `POST .../m3/hiu/data-request` |
| TC-14 | Data-request consent not GRANTED | − | Wrong `consentId` |
| TC-15 | `on-request` → `AWAITING_PUSH` | + | `inject-on-data-request.sh` |
| TC-16 | Loopback push → decrypt → ingest | + | `trigger-hip-data-flow.sh` |
| TC-17 | Duplicate push same `transferId` | − | Repeat POST push |
| TC-18 | Fidelius round-trip unit | + | `m3-fidelius-roundtrip.test.ts` |
| TC-19 | Wrong HIP key → decrypt fail | − | Tampered push |
| TC-20 | HIU notify CM `RECEIVED` | + | Assert gateway notify (sandbox) |
| TC-21 | `AWAITING_PUSH` timeout | − | Short `ABDM_M3_AWAITING_PUSH_HOURS` |
| TC-22 | GET transfer bundle when `ACKNOWLEDGED` | + | `GET .../transfers/{transferId}` |

### HIP data-response (TC-23–TC-28)

| ID | Scenario | Type | Driver |
|----|----------|------|--------|
| TC-23 | HIP `health-information/request` | + | `trigger-hip-data-flow.sh` |
| TC-24 | Mock RF bundle → push 2xx | + | `ABDM_M2_MOCK_PLATFORM=true` |
| TC-25 | RF failure → FAILED notify | − | Mock RF error |
| TC-26 | Invalid HIU public key (32-byte) | − | Bad key in request |
| TC-27 | `dataPushUrl` 5xx retries | − | Mock push failure |
| TC-28 | Allowlist blocks external URL | − | `ABDM_M3_DATA_PUSH_URL_ALLOWLIST` set |

### End-to-end harness (TC-29–TC-34)

| ID | Scenario | Type | Driver |
|----|----------|------|--------|
| TC-29 | `full-loop.sh` 8 steps | + | All inject scripts |
| TC-30 | Loopback off + allowlist | − | Env |
| TC-31 | Sandbox HIU consent leg | + | `RUN_ABDM_SANDBOX_TESTS=1` |
| TC-32 | Sandbox HIU data-fetch | + | Gated integration test |
| TC-33 | Sandbox HIP data-response | + | Postman / sandbox |
| TC-34 | Postman M3 collection (13 requests) | + | Manual log |

## Production cutover (M3) — minimum code change

Same binaries as sandbox; change **environment and infra** only (see [abdm-adapter-e2e-and-production.md](./abdm-adapter-e2e-and-production.md)).

| Variable | Sandbox / dev | Production |
|----------|---------------|------------|
| `ABDM_M3_MOCK_GATEWAY` | `true` | **unset / `false`** |
| `ABDM_M3_LOOPBACK_HIU` | `true` | **unset / `false`** |
| `ABDM_M3_DATA_PUSH_URL_ALLOWLIST` | empty (any host) | **enumerated HIU hosts** |
| `ABDM_X_HIU_ID` | `SBX_TEST_HIU_001` | Production HIU from HFR |
| `ABDM_CM_CONSENT_VERIFY_CERT_PEM` | optional | **required** |
| `ABDM_GATEWAY_JWKS_URL` | dev JWKS | production JWKS |
| `ABDM_ALLOW_INSECURE_CALLBACKS` | `true` in dev | **unset** |
| `ABDM_DEV_INBOUND_SIMULATION` | **`false`** for live sandbox | **unset** |
| `ABDM_ADAPTER_PUBLIC_BASE_URL` | ngrok HTTPS origin | Stable production ingress |

URLs unchanged: `/api/v3/hiu/*`, `/api/v3/hip/*`, `/api/abdm/v1/m3/*`.

### Sandbox live E2E (operator)

1. Configure env per [e2e guide §0.1.1](./abdm-adapter-e2e-and-production.md#011-sandbox-live-m3-e2e-real-nha-gateway--ngrok).
2. Follow [§6A Path A](./abdm-adapter-e2e-and-production.md#6a-phase-m3--hiu-consent--data-fetch-sandbox-path-a-live-gateway).
3. Repeat with [§12 fresh checklist](./abdm-adapter-e2e-and-production.md#12-fresh-e2e-run-new-patient--new-visit).

## Phase 7 — M1 + M2 regression

After M3 Phase 6 passes, run M1/M2 positive and negative smokes from [abdm-adapter-e2e-and-production.md](./abdm-adapter-e2e-and-production.md). Any change to shared code (`m2-inbound-helper`, Fidelius, `ports.ts`) requires the full `integration-hub` test target.
