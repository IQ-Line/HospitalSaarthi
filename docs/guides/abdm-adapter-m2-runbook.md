# ABDM Adapter — M2 runbook (local dev + sandbox E2E)

Milestone 2 covers **HIP-initiated linking**, **user-initiated linking**, **consent notify**, and **M3 data transfer** (ack, push, notify). Gateway callbacks are served at **`/api/v3/…`** on `abdm-adapter-svc` (port **3007** by default). Platform staff APIs live under **`/api/abdm/v1/…`**.

> **Easy map (static values, link token vs old LIMS):** [abdm-adapter-m2-simple-reference.md](./abdm-adapter-m2-simple-reference.md)  
> **Full journey + production:** [abdm-adapter-e2e-and-production.md](./abdm-adapter-e2e-and-production.md)

**Architecture:** [`docs/architecture/lld/abdm-adapter/05-m2-flows.md`](../architecture/lld/abdm-adapter/05-m2-flows.md), [`06-m2-dev-guide.md`](../architecture/lld/abdm-adapter/06-m2-dev-guide.md).

**Wire reference:** [`milestone2.md`](../../milestone2.md), Postman `Milestone_2_16_02_2026_6e734af067 (1).postman_collection.json`.

---

## Implementation status (vs plan)

| Area | Status | Notes |
|------|--------|--------|
| Foundation (migration, ports, `/api/v3`, DTOs) | Done | `0000` + `0001` migrations |
| Phase 1 — HIP linking | Done | Link token cache, callbacks, `POST …/m2/hip/initiated-link/start` |
| Phase 2 — User-initiated linking | Done | discover / init / confirm; mock EMPI/RF when `ABDM_M2_MOCK_PLATFORM=true` |
| Phase 3a — Consent notify | Done | Persist artefact + outbound `on-notify` ack |
| Phase 3b — HI data transfer | Done (stub crypto) | Request → ack → push `dataPushUrl` → `health-information/notify` |
| Domain events | Done | `abdm.care-context.linked`, `abdm.consent.granted`, `abdm.care-context.published` |
| Add-contexts | Done | Event consumer + `POST /m2/add-contexts/publish` + `/api/v3/links/context/on-notify` |
| SMS deep link | Done | Auto after HIP `LINKED` if `phoneNo` or `ABDM_DEFAULT_SMS_PHONE`; `POST /m2/sms/notify` |
| M3 data transfer | Done (dev stub crypto) | HI request → ack → push → `health-information/notify` |
| Sandbox integration tests | Done | `RUN_ABDM_SANDBOX_TESTS=1 pnpm -F @hims/abdm-adapter test:sandbox` |

---

## Environment (copy from template)

[`services/abdm-adapter-svc/.env.example`](../../services/abdm-adapter-svc/.env.example):

| Variable | Example / purpose |
|----------|-------------------|
| `ABDM_SANDBOX_CLIENT_ID` / `SECRET` | NHA sandbox credentials |
| `ABDM_DEV_TENANT_ID` | `00000000-0000-4000-8000-0000000000aa` — maps all inbound callbacks |
| `ABDM_X_HIP_ID` | **`IN3610001625`** (your sandbox HIP) |
| `ABDM_X_CM_ID` | `sbx` |
| `ABDM_M2_MOCK_PLATFORM` | `true` — canned patient + care contexts for user-initiated flow without EMPI/RF |
| `ABDM_MOCK_ABHA_ADDRESS` | ABHA address used in Postman / PHR tests (default `test.user@sbx`) |
| `ABDM_DEFAULT_SMS_PHONE` | Your mobile **E.164** (`+91…`) — SMS after HIP link |
| `ABDM_HIP_DISPLAY_NAME` | Hospital name in SMS body |
| `DATABASE_URL` | Postgres (root `.env` or `ABDM_DATA_DATABASE_URL`) |

Inbound callbacks require **`ABDM_DEV_TENANT_ID`**. Platform routes use header **`x-tenant-id`** with the same UUID.

---

## Run locally

```bash
pnpm install
npx nx run abdm-adapter-svc:db-migrate
npx nx run abdm-adapter-svc:serve
```

- Health: `GET http://localhost:3007/healthz`
- Swagger: `http://localhost:3007/docs` (platform paths only; `/api/v3` callbacks are not in the public OpenAPI wrapper)

---

## Expose callbacks to NHA (real E2E)

1. Start the service on port **3007**.
2. Tunnel: `ngrok http 3007` (or Cloudflare tunnel).
3. In the **ABDM sandbox / HFR bridge**, set **callback URL** to the public origin only, e.g. `https://abc123.ngrok-free.app` (no path suffix).
4. NHA will POST to fixed paths under that host, e.g.:
   - `…/api/v3/hip/token/on-generate-token`
   - `…/api/v3/link/on_carecontext`
   - `…/api/v3/hip/patient/care-context/discover`
   - `…/api/v3/consent/request/hip/notify`
   - `…/api/v3/hip/health-information/request`

Set request headers on inbound calls (sandbox often omits strict JWS):

- `REQUEST-ID` — UUID (dedupe key)
- `TIMESTAMP` — ISO-8601
- `X-HIP-ID` — must match `ABDM_X_HIP_ID` when set (`IN3610001625`)
- `X-CM-ID` — `sbx` (optional in dev)

---

## E2E path A — HIP-initiated linking (Postman + sandbox)

Matches Postman folder **HIP Initiated Linking**.

| Step | Who | Action |
|------|-----|--------|
| 0 | You | Postman **Registration and Auth** → gateway session (same as M1 M0) |
| 1 | HIMS → adapter | **Pre-mint** `POST /api/abdm/v1/m2/link-token/acquire` (adapter calls NHA generate-token) |
| 2 | NHA → your ngrok | `POST /api/v3/hip/token/on-generate-token` — adapter UPSERTs `abdm_link_tokens`; poll `GET /m2/link-token/status` |
| 3 | Platform | `POST /api/abdm/v1/m2/hip/initiated-link/start` with `x-tenant-id: <ABDM_DEV_TENANT_ID>` and body `{ abhaAddress, careContexts[], hiType, count }` |
| 4 | Adapter → NHA | `POST …/hip/v3/link/carecontext` with `X-LINK-TOKEN` from cache |
| 5 | NHA → your ngrok | `POST /api/v3/link/on_carecontext` — session → `LINKED`, event `abdm.care-context.linked` |

**Staff start API example:**

```bash
curl -sS -X POST "http://localhost:3007/api/abdm/v1/m2/hip/initiated-link/start" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 00000000-0000-4000-8000-0000000000aa" \
  -d '{
    "abhaAddress": "test.user@sbx",
    "careContexts": [
      { "referenceNumber": "VISIT-001", "display": "OP visit" }
    ],
    "hiType": "OPConsultation",
    "count": 1
  }'
```

Step 3 fails with **link token not ready** until step 2 has run (generate-token + callback).

---

## E2E path B — User-initiated linking (PHR / Postman)

Matches Postman folder **User Initiated Linking**. Requires **`ABDM_M2_MOCK_PLATFORM=true`** (or real `EMPI_BASE_URL` + `RECORD_FOUNDATION_BASE_URL`).

| Step | Inbound to HIP (`/api/v3`) | Adapter outbound |
|------|----------------------------|------------------|
| 1 | `POST …/hip/patient/care-context/discover` | `on-discover` (200 on inbound) |
| 2 | `POST …/hip/link/care-context/init` | `on-init` |
| 3 | `POST …/hip/link/care-context/confirm` (`X-HIU-ID`) | `on-confirm` (202 on inbound) |

Use `transactionId` consistently across discover → init → confirm. Discovery body should reference an ABHA address that mock EMPI resolves (default `test.user@sbx`).

---

## E2E path C — Consent + HI request (Data Transfer)

| Step | Inbound | Result |
|------|---------|--------|
| Consent | `POST /api/v3/consent/request/hip/notify` | Row in `abdm_consent_artefacts`, ack to `…/consent/v3/request/hip/on-notify`, event `abdm.consent.granted` |
| HI request | `POST /api/v3/hip/health-information/request` | Session `abdm.m3.hip.v1`, ack to `…/data-flow/v3/health-information/hip/on-request` |

**M3 push** uses `FideliusEncryptor` (BC Weierstrass curve25519). Do not set `ABDM_FIDELIUS_USE_STUB` in staging/production. HIU `dataPushUrl` must be reachable from the adapter host.

---

## Local smoke (no ngrok)

Simulate the link-token callback after you would have called generate-token in Postman:

```bash
export BASE=http://localhost:3007
export TENANT=00000000-0000-4000-8000-0000000000aa
export HIP=IN3610001625
export REQ=$(uuidgen)

curl -sS -X POST "$BASE/api/v3/hip/token/on-generate-token" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQ" \
  -H "TIMESTAMP: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  -H "X-HIP-ID: $HIP" \
  -H "X-CM-ID: sbx" \
  -d "{
    \"abhaAddress\": \"test.user@sbx\",
    \"linkToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.mock\",
    \"response\": { \"requestId\": \"$REQ\" }
  }"
```

Then call **initiated-link/start** (curl above). Check DB:

```sql
SELECT * FROM abdm_adapter.abdm_link_tokens WHERE abha_address = 'test.user@sbx';
SELECT session_id, flow_kind, state FROM abdm_adapter.abdm_sessions ORDER BY created_at DESC LIMIT 5;
```

---

## Verification checklist

- [ ] `npx nx run abdm-adapter:test` passes
- [ ] Migrations applied (`abdm_inbound_messages`, `abdm_link_tokens`, `abdm_consent_artefacts`)
- [ ] `.env` has sandbox client id/secret, `ABDM_X_HIP_ID=IN3610001625`, `ABDM_DEV_TENANT_ID`
- [ ] ngrok URL registered in sandbox bridge
- [ ] Postman generate-token → see row in `abdm_link_tokens`
- [ ] Platform start → NHA link → `on_carecontext` → session `LINKED`
- [ ] (Optional) discover/init/confirm with mock platform
- [ ] (Optional) consent notify → `abdm_consent_artefacts` + outbound ack

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `401` on outbound NHA calls | Missing/invalid `ABDM_SANDBOX_*` or expired gateway session |
| Callback ignored / 409 duplicate | Same `REQUEST-ID` replayed — use new UUID |
| HIP header mismatch | `X-HIP-ID` on callback ≠ `ABDM_X_HIP_ID` |
| Link start fails “token” | Generate-token not run or `on-generate-token` not received |
| Discover returns empty patient | `ABDM_M2_MOCK_PLATFORM=false` and no EMPI, or ABHA address not in mock |
| DB connection error | `DATABASE_URL` / Citus not reachable; Azure needs `?sslmode=require` |

Unit tests: `npx nx run abdm-adapter:test`. Do not run `tsc` on WSL2 (repo rule).
