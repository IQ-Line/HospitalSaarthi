# ABDM M2 — Simple reference

Easy overview for **HIP linking**, **consent**, and **record fetch**.  
Technical detail stays in the other guides (linked below).

---

## Which document should I open?

| Document | Read when you want… |
|----------|-------------------|
| **[E2E + production](./abdm-adapter-e2e-and-production.md)** | **Default entry** — M1/M2/M3, env, production §10 |
| **This file** | M2-only map: env vars, link token, old LIMS vs adapter |
| [M1 runbook](./abdm-adapter-m1-runbook.md) | ABHA enrolment |
| [M2 hands-on](./abdm-adapter-m2-hands-on-walkthrough.md) | ngrok + Postman HIP link |
| [M2 runbook](./abdm-adapter-m2-runbook.md) | Dev checklist |
| [M3 developer](./abdm-adapter-m3-developer-and-e2e.md) | Mock loop + TC-01–34 |

See [E2E pick-your-task](./abdm-adapter-e2e-and-production.md#pick-your-task-avoid-confusion) when unsure.

---

## The three flows you care about

```text
1. HIP linking      Hospital links patient visits to ABHA
2. User consent     HIU / patient grants consent (HIP is notified)
3. Record fetch     HIU asks HIP to send health records
```

| Flow | Who calls your server | How you test in sandbox | Proof it worked |
|------|------------------------|-------------------------|-----------------|
| **HIP linking** | You (Swagger) + NHA (callbacks) | Postman token → Swagger `initiated-link/start` | ngrok `on_carecontext` + DB session `LINKED` |
| **User consent** | NHA → your ngrok | `scripts/simulate-consent-notify.sh` | DB `abdm_consent_artefacts` + HTTP 202 |
| **Record fetch** | NHA → your ngrok | curl HI request + webhook.site URL | DB session `BUNDLES_PUSHED` + webhook.site POST |

---

## Link token: what your manager asked vs what we do

### Rule (both old LIMS and new adapter)

**A valid link token must already be in the database before NHA `link/carecontext` is called.**

NHA sends the token on callback `on-generate-token`. Linking uses header `X-LINK-TOKEN` with that JWT.

### Old service (`abdi-lims-backed` — outside this monorepo)

| Step | What happens |
|------|----------------|
| 1 | UI calls **one API** `POST /generate-hip-link-token` with patient + `linkBody` (care contexts) |
| 2a | **If token already in Mongo `LinkToken`** → immediately calls `hipInitiatedLinkSingle` (link) |
| 2b | **If no token** → saves `linkBody` in `Session`, calls NHA generate-token, **waits for callback** |
| 3 | Callback **`addLinkToken`** saves token → **automatically** runs `hipInitiatedLinkSingle` with saved `linkBody` |
| Alt | Separate API `POST /hip-initiated-link-single` when token is already there |

So in LIMS: **token generation and linking are chained in one user action**, but link still only runs **after** the token is stored (callback or cache hit).

### New adapter (`abdm-adapter-svc` — Hospital Saarthi)

| Step | What happens |
|------|----------------|
| 1 | Token stored in Postgres `abdm_adapter.abdm_link_tokens` when NHA hits `POST /api/v3/hip/token/on-generate-token` |
| 2 | Staff / HIMS calls **one platform API** `POST /api/abdm/v1/m2/hip/initiated-link/start` |
| 3 | Adapter reads token via `linkTokenCache.getOrAcquire(...)` |
| 3a | **Cache hit** → uses saved token immediately |
| 3b | **Cache miss** → adapter calls NHA generate-token, waits for callback (up to ~8s), then links |
| 4 | Adapter calls NHA `link/carecontext` with `X-LINK-TOKEN` |
| 5 | NHA callback `POST /api/v3/link/on_carecontext` → session `LINKED` |

**Manager is correct:** we also require a saved token before `link/carecontext`.  
**Difference from LIMS:** token is **not** a visible “step” in the UI state machine; it lives in a **cache table**, not in the link session. Sandbox testing **splits** Postman (token) and Swagger (link) so you can see each hop — production can be **one button** (`initiated-link/start` only).

```text
Sandbox / production (recommended):
  POST /m2/link-token/acquire  →  202 TOKEN_REQUESTED
  GET  /m2/link-token/status   →  TOKEN_AVAILABLE when cache ready
  POST /m2/hip/initiated-link/start  →  cache hit, fast link

Fallback (adapter still works):
  initiated-link/start alone  →  getOrAcquire (may wait ~8s on cache miss)

Optional manual NHA step (debug only):
  Postman generate-token  →  same callback as adapter acquire
```

---

## What is static vs what changes

### Static in code (same URLs in sandbox and production)

| Item | Value |
|------|--------|
| Platform API prefix | `/api/abdm/v1` |
| Gateway callback prefix | `/api/v3` |
| Pre-mint link token | `POST /api/abdm/v1/m2/link-token/acquire` |
| Poll token status | `GET /api/abdm/v1/m2/link-token/status?sessionId=…` |
| HIP link start | `POST /api/abdm/v1/m2/hip/initiated-link/start` |
| Token callback path | `POST /api/v3/hip/token/on-generate-token` |
| Link result callback | `POST /api/v3/link/on_carecontext` |
| Consent inbound | `POST /api/v3/consent/request/hip/notify` |
| HI request inbound | `POST /api/v3/hip/health-information/request` |
| NHA outbound (adapter calls) | `…/token/generate-token`, `…/hip/v3/link/carecontext`, etc. |
| Dev tenant header (platform) | `x-tenant-id` |
| Sandbox CM id (typical) | `sbx` |

### Static only for your sandbox test (change per facility / prod)

| Item | Your sandbox example | Production |
|------|----------------------|------------|
| HIP ID | `IN3610001625` | HIP from **HFR** (per hospital) |
| Dev tenant UUID | `00000000-0000-4000-8000-0000000000aa` | Real `iq_tenant_id` per hospital |
| Test ABHA | `kamal_kamal060606@sbx` | Real patient `@sbx` / `@abdm` |
| ngrok URL | Changes every session | **Stable HTTPS** domain in HFR bridge URL |
| NHA gateway host | `https://dev.abdm.gov.in` | Production NHA URL |
| Client id / secret | Sandbox portal credentials | Production credentials (secrets manager) |

### Dev-only (never in production)

| Item | Purpose |
|------|---------|
| `ABDM_M2_MOCK_PLATFORM=true` | Fake EMPI + Record Foundation |
| `ABDM_DEV_INBOUND_SIMULATION=true` | curl consent/HI without NHA rejecting fake consent ids |
| ngrok | Receive callbacks on laptop |
| Postman generate-token (manual) | Debug only — prefer `link-token/acquire` |
| webhook.site | See HI push payload |
| `ABDM_FIDELIUS_USE_STUB=true` | Legacy base64 stub only — real crypto is default |
| `ABDM_ALLOW_INSECURE_CALLBACKS=true` | Skip JWS + consent signature verify |

---

## Environment variables (sandbox vs production)

Full template: [`services/abdm-adapter-svc/.env.example`](../../services/abdm-adapter-svc/.env.example)

### Sandbox (local E2E)

| Variable | Required? | Example / note |
|----------|-----------|----------------|
| `DATABASE_URL` | Yes | Postgres (`hims_dev`) |
| `ABDM_SANDBOX_CLIENT_ID` | Yes | NHA sandbox portal |
| `ABDM_SANDBOX_CLIENT_SECRET` | Yes | NHA sandbox portal |
| `ABDM_DEV_TENANT_ID` | Yes | Same as Swagger `x-tenant-id` |
| `ABDM_X_HIP_ID` | Yes | `IN3610001625` |
| `ABDM_X_CM_ID` | Yes | `sbx` |
| `ABDM_M2_MOCK_PLATFORM` | Yes (dev) | `true` |
| `ABDM_MOCK_ABHA_ADDRESS` | Yes (dev) | Match Postman / link patient |
| `ABDM_DEV_INBOUND_SIMULATION` | Optional | `true` when using consent/HI curl scripts |
| `ABDM_DEFAULT_SMS_PHONE` | Optional | `+91…` for SMS after link |
| `ABDM_HIP_DISPLAY_NAME` | Optional | Name in SMS text |
| `ENABLE_AUTH` | No (local) | `false` |
| `ABDM_TOKEN_ENCRYPTION_KEY` | Optional | Plaintext token storage if unset |

### Production / staging (must change)

| Variable | Sandbox | Production |
|----------|---------|------------|
| `NODE_ENV` | `development` | `production` or `staging` |
| `ABDM_GATEWAY_BASE_URL` | `dev.abdm.gov.in` | Production gateway |
| `ABDM_ABHA_API_BASE_URL` | `abhasbx…` | Production ABHA API |
| `ABDM_X_CM_ID` | `sbx` | **Not** `sbx` |
| `ABDM_X_HIP_ID` | Sandbox HIP | **HFR production HIP** |
| `ABDM_SANDBOX_CLIENT_*` | Sandbox | **Production client** in vault |
| `ABDM_M2_MOCK_PLATFORM` | `true` | **`false`** |
| `EMPI_BASE_URL` | Optional | **Required** |
| `RECORD_FOUNDATION_BASE_URL` | Optional | **Required** |
| `ENABLE_AUTH` | `false` | **`true`** + `JWKS_URL` |
| `ABDM_TOKEN_ENCRYPTION_KEY` | Optional | **Required** (`openssl rand -base64 32`) |
| `ABDM_DEV_INBOUND_SIMULATION` | `true` in dev | **Unset / false** |
| `ABDM_DEV_TENANT_ID` | Single UUID | `ABDM_HIP_TENANT_MAP` per HIP |
| `ABDM_CM_CONSENT_VERIFY_CERT_PEM` | Optional | **CM cert from NHA** |
| `ABDM_GATEWAY_JWKS_URL` | Dev default | Production JWKS |
| `ABDM_SMS_PROVIDER` | `logging` | `twilio` or `http` |
| `ABDM_ALLOW_INSECURE_CALLBACKS` | `true` in dev | **Unset** |
| `ABDM_FIDELIUS_USE_STUB` | Optional | **Unset** |
| Callback URL | ngrok | **Stable URL** in HFR |

**DB:** apply `migrations/0002_abdm_link_otps.sql` before multi-replica deploy (OTP persistence).

---

## Two “doors” for APIs (easy mental model)

| Door | Who | Examples |
|------|-----|----------|
| **Door 1 — Platform** | Your HIMS / Swagger | `/api/abdm/v1/m2/hip/initiated-link/start` |
| **Door 2 — Postman to NHA** | You testing gateway | Session API, generate-token, Update Bridge URL |
| **Door 3 — Callbacks** | NHA → ngrok → adapter | `on-generate-token`, `on_carecontext`, consent, HI request |

Swagger only shows **Door 1** (by design). M2 callbacks are **Door 3**.

---

## Helper scripts (sandbox)

| Script | Purpose |
|--------|---------|
| `services/abdm-adapter-svc/scripts/simulate-consent-notify.sh` | Fake consent notify → ngrok |
| `services/abdm-adapter-svc/scripts/m2-local-smoke.sh` | Local token callback + link (needs creds) |

---

## Quick verification SQL

```sql
-- Link token
SELECT abha_address, length(link_token) AS token_len
FROM abdm_adapter.abdm_link_tokens
WHERE abha_address = 'your-abha@sbx';

-- HIP link session
SELECT session_id, state FROM abdm_adapter.abdm_sessions
WHERE flow_kind = 'abdm.m2.hip-initiated-link.v1'
ORDER BY created_at DESC LIMIT 1;

-- Consent
SELECT consent_id, status FROM abdm_adapter.abdm_consent_artefacts
ORDER BY received_at DESC LIMIT 1;

-- Record fetch (M3)
SELECT session_id, state FROM abdm_adapter.abdm_sessions
WHERE flow_kind = 'abdm.m3.hip.v1'
ORDER BY created_at DESC LIMIT 1;
```

---

## Architecture (if you need depth)

- [05-m2-flows.md](../architecture/lld/abdm-adapter/05-m2-flows.md) — link token cache design (§2.1)
- [06-m2-dev-guide.md](../architecture/lld/abdm-adapter/06-m2-dev-guide.md) — implementation
