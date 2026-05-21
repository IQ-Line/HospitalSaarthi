# M2 hands-on walkthrough — ngrok, Postman, Swagger (beginner)

Use this doc when you want **every click and curl** for sandbox M2.

> **Easy overview first:** [abdm-adapter-m2-simple-reference.md](./abdm-adapter-m2-simple-reference.md)  
> **Production env matrix:** [abdm-adapter-e2e-and-production.md](./abdm-adapter-e2e-and-production.md) §10

---

## Part A — Understand three “doors” (fixes Swagger confusion)

Your adapter is **one server** on port **3007**, but M2 uses **three different callers**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  DOOR 1 — YOUR APP / SWAGGER (platform APIs)                            │
│  You → http://localhost:3007/api/abdm/v1/...                            │
│  Listed in Swagger (/docs) — only ~3 M2 routes                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  DOOR 2 — POSTMAN → NHA GOVERNMENT (outbound gateway)                   │
│  You → https://dev.abdm.gov.in/api/hiecm/...                            │
│  NOT in Swagger — session, generate-token, bridge URL, etc.             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  DOOR 3 — NHA → YOUR NGROK (inbound callbacks)                           │
│  NHA → https://YOUR-ID.ngrok-free.app/api/v3/...                        │
│  NOT in Swagger — discover, consent, on_carecontext, HI request, …      │
│  ngrok forwards to localhost:3007                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

| What you want to test | Door | Tool |
|----------------------|------|------|
| Staff “link this patient” | 1 | Swagger or curl → `/m2/hip/initiated-link/start` |
| Get link token from NHA | 2 | Postman → `generate-token` |
| NHA tells you “token ready” | 3 | Automatic → `/api/v3/hip/token/on-generate-token` |
| NHA tells you “link done” | 3 | Automatic → `/api/v3/link/on_carecontext` |
| Patient consent granted | 3 | NHA → `/api/v3/consent/request/hip/notify` (or simulate curl) |
| HIU asks for records | 3 | NHA → `/api/v3/hip/health-information/request` (or simulate curl) |
| Publish new visit | 1 | Swagger → `/m2/add-contexts/publish` |
| SMS to patient | 1 | Swagger → `/m2/sms/notify` |

---

## Part B — One-time setup

### B.1 Service running

```bash
# Terminal 1 — from repo root
npx nx run abdm-adapter-svc:db-migrate   # once
npx nx run abdm-adapter-svc:serve
```

Check:

```bash
curl -sS http://localhost:3007/healthz
# {"status":"ok"}
```

### B.2 Environment (`services/abdm-adapter-svc/.env`)

| Variable | Your sandbox example |
|----------|----------------------|
| `ABDM_DEV_TENANT_ID` | `00000000-0000-4000-8000-0000000000aa` |
| `ABDM_X_HIP_ID` | `IN3610001625` |
| `ABDM_X_CM_ID` | `sbx` |
| `ABDM_MOCK_ABHA_ADDRESS` | **Same ABHA as M1** (not a random placeholder) |
| `ABDM_DEFAULT_SMS_PHONE` | Your `+91XXXXXXXXXX` (optional) |

Use the **same** `x-tenant-id` header on all Door 1 calls.

### B.3 Install ngrok (free)

1. Create account: https://ngrok.com  
2. Download ngrok for Linux, or: `sudo snap install ngrok`  
3. Copy your authtoken from ngrok dashboard → **Your Authtoken**  
4. Run once:

```bash
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

### B.4 Start ngrok tunnel

```bash
# Terminal 2 — keep running
ngrok http 3007
```

You will see something like:

```text
Forwarding   https://a1b2c3d4.ngrok-free.app -> http://localhost:3007
```

**Copy only the HTTPS host**, e.g. `https://a1b2c3d4.ngrok-free.app`  
Do **not** add `/api/v3` when registering the bridge URL.

**Free tier notes:**

- URL changes every time you restart ngrok (update bridge URL again).
- First browser hit may show ngrok warning page — NHA server-to-server calls are usually fine.
- Keep **both** Terminal 1 (serve) and Terminal 2 (ngrok) running.

### B.5 Register bridge URL in NHA (Postman)

Import collection: `Milestone_2_16_02_2026_6e734af067 (1).postman_collection.json`

Create a **Postman Environment** with:

| Variable | Value |
|----------|--------|
| `clientId` | Same as `ABDM_SANDBOX_CLIENT_ID` in `.env` |
| `clientSecret` | Same as `ABDM_SANDBOX_CLIENT_SECRET` in `.env` |
| `X-HIP-ID` | `IN3610001625` |
| `X-CM-ID` | `sbx` |
| `ABHA Address` | Your sandbox ABHA (from M1), e.g. `yourname@sbx` |
| `name` | Patient name |
| `gender` | `M` or `F` |
| `year` | Birth year, e.g. `1990` |
| `Bridge_URL` or URL field | `https://a1b2c3d4.ngrok-free.app` (your ngrok HTTPS origin) |

**Step B.5.1 — Gateway session (Door 2)**

Folder: **Registration and Auth** → **Session API**

- URL: `POST https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions`
- Body: `clientId`, `clientSecret`, `grantType: client_credentials`
- Test script saves `accessToken` — run this first every time.

**Alternative (Door 1):**

```bash
curl -sS http://localhost:3007/api/abdm/v1/m0/gateway/session \
  -H "x-tenant-id: 00000000-0000-4000-8000-0000000000aa"
```

**Step B.5.2 — Update bridge URL (Door 2)** — **critical**

Folder: **Registration and Auth** → **Update Bridge URL**

- Method: `PATCH https://dev.abdm.gov.in/api/hiecm/gateway/v3/bridge/url`
- Auth: Bearer `{{accessToken}}`
- Headers: `REQUEST-ID`, `TIMESTAMP`, `X-CM-ID: sbx`
- Body:

```json
{
  "url": "https://a1b2c3d4.ngrok-free.app"
}
```

Use **your** ngrok URL. After success, NHA will send all callbacks to `https://a1b2c3d4.ngrok-free.app/api/v3/...`.

Watch ngrok Terminal 2 — you should see requests when callbacks arrive.

---

## Part C — M1 first (ABHA for linking)

You need a real **sandbox ABHA address** before M2.

**Door 1 only** — Swagger `http://localhost:3007/docs` or curl:

| Step | Swagger / curl |
|------|----------------|
| 1 | `POST /m1/enrol/aadhaar/otp` — body: 12-digit sandbox Aadhaar |
| 2 | `POST /m1/enrol/aadhaar/verify` — OTP from sandbox SMS |
| 3 | `POST /m1/abha-address` — pick address |
| 4 | `GET /m1/profile?sessionId=...` — confirm ABHA |

Copy **`abhaAddress`** (e.g. `kamalxxx@sbx`).

Update `.env`:

```env
ABDM_MOCK_ABHA_ADDRESS=kamalxxx@sbx
```

Restart `abdm-adapter-svc:serve`.

Postman variable **`ABHA Address`** = same value.

---

## Part D — M2 HIP linking (main flow)

### D.1 Flow diagram

```text
[Postman] Session API
[Postman] Update Bridge URL  → ngrok registered
[Postman] Link Token Generation  → NHA
     ↓ (async)
[NHA] POST https://NGROK/api/v3/hip/token/on-generate-token  → your adapter
[You]   POST localhost/api/abdm/v1/m2/hip/initiated-link/start  → Swagger/curl
     ↓
[Adapter] POST NHA link/carecontext
     ↓ (async)
[NHA] POST https://NGROK/api/v3/link/on_carecontext  → LINKED
[Adapter] optional SMS via NHA
```

### D.2 Step 1 — Pre-mint link token (adapter platform API)

**Preferred:** call the adapter (not Postman directly). The adapter calls NHA `generate-token` and waits for `on-generate-token` in the background.

```bash
curl -sS -X POST "http://localhost:3007/api/abdm/v1/m2/link-token/acquire" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 00000000-0000-4000-8000-0000000000aa" \
  -d '{
    "abhaAddress": "your-abha@sbx",
    "demographics": { "name": "Test Patient", "gender": "M", "yearOfBirth": 1990 }
  }'
```

Expected: **202** with `{ "sessionId": "…", "state": "TOKEN_REQUESTED", "tokenReady": false }`.

Poll until ready:

```bash
curl -sS "http://localhost:3007/api/abdm/v1/m2/link-token/status?sessionId=PASTE_SESSION_ID" \
  -H "x-tenant-id: 00000000-0000-4000-8000-0000000000aa"
```

Expected: `state: TOKEN_AVAILABLE`, `tokenReady: true`.

Within a few seconds, **ngrok** should show `POST /api/v3/hip/token/on-generate-token`.

**Verify in DB:**

```bash
psql "postgresql://hims:hims@localhost:5433/hims_dev" -c \
  "SELECT abha_address, expires_at IS NOT NULL AS has_token FROM abdm_adapter.abdm_link_tokens WHERE abha_address = 'your-abha@sbx';"
```

**Debug only:** Postman **HIP Initiated Linking → Link Token Generation** hits NHA directly (same callback path).

### D.3 Step 2 — Link care contexts (Door 1 — Swagger)

Swagger: **M2-HIP-Linking** → `POST /m2/hip/initiated-link/start`

Headers in Swagger UI:

- `x-tenant-id`: `00000000-0000-4000-8000-0000000000aa`

Body example:

```json
{
  "abhaAddress": "your-abha@sbx",
  "patientName": "Test Patient",
  "gender": "M",
  "yearOfBirth": 1990,
  "phoneNo": "+91XXXXXXXXXX",
  "careContexts": [
    {
      "referenceNumber": "VISIT-2026-001",
      "display": "OP consultation",
      "hiType": "OPCONSULTATION"
    }
  ]
}
```

**Same curl:**

```bash
curl -sS -X POST "http://localhost:3007/api/abdm/v1/m2/hip/initiated-link/start" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 00000000-0000-4000-8000-0000000000aa" \
  -d '{
    "abhaAddress": "your-abha@sbx",
    "patientName": "Test Patient",
    "gender": "M",
    "yearOfBirth": 1990,
    "careContexts": [
      {
        "referenceNumber": "VISIT-2026-001",
        "display": "OP consultation",
        "hiType": "OPCONSULTATION"
      }
    ]
  }'
```

Expected: **202** with `sessionId` and state `CC_LINK_REQUESTED` (or similar).

If **503 link token**: call `link-token/acquire` again and poll status until `TOKEN_AVAILABLE`.

### D.4 Step 3 — Link result callback (automatic, Door 3)

ngrok should show:

```text
POST /api/v3/link/on_carecontext
```

**Verify:**

```sql
SELECT session_id, state FROM abdm_adapter.abdm_sessions
WHERE flow_kind = 'abdm.m2.hip-initiated-link.v1'
ORDER BY created_at DESC LIMIT 1;
-- state should be LINKED
```

Optional SMS: if `phoneNo` or `ABDM_DEFAULT_SMS_PHONE` set → then `POST /api/v3/patients/sms/on-notify` on ngrok.

---

## Part E — User consent (Door 3)

Consent is **not** a Swagger API. The **HIU / gateway** notifies your HIP:

`POST https://NGROK/api/v3/consent/request/hip/notify`

In full sandbox, this may arrive **after** linking (see Postman sample notes in HIP Initiated Linking responses). If it does not arrive automatically, **simulate** it (same as NHA would send):

```bash
NGROK=https://a1b2c3d4.ngrok-free.app
TENANT=00000000-0000-4000-8000-0000000000aa
REQ=$(uuidgen)

curl -sS -X POST "$NGROK/api/v3/consent/request/hip/notify" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQ" \
  -H "TIMESTAMP: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  -H "X-HIP-ID: IN3610001625" \
  -H "X-CM-ID: sbx" \
  -d '{
    "notification": {
      "status": "GRANTED",
      "consentId": "'"$REQ"'",
      "signature": "test-signature-stub",
      "grantAcknowledgement": true,
      "consentDetail": {
        "schemaVersion": "v3",
        "consentId": "'"$REQ"'",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "patient": { "id": "your-abha@sbx" },
        "careContexts": [
          {
            "patientReference": "patient-ref-1",
            "careContextReference": "VISIT-2026-001"
          }
        ],
        "purpose": { "text": "Care Management", "code": "CAREMGT", "refUri": "https://example.com" },
        "hip": { "id": "IN3610001625" },
        "hiu": { "id": "HIU-SANDBOX" },
        "hiTypes": ["OPConsultation"],
        "permission": {
          "accessMode": "VIEW",
          "dateRange": { "from": "2020-01-01T00:00:00.000Z", "to": "2030-01-01T00:00:00.000Z" },
          "dataEraseAt": "2030-01-01T00:00:00.000Z",
          "frequency": { "unit": "HOUR", "value": 1, "repeats": 0 }
        }
      }
    }
  }'
```

**Check:**

```sql
SELECT consent_id, status FROM abdm_adapter.abdm_consent_artefacts ORDER BY granted_at DESC LIMIT 1;
```

Adapter also sends ack to NHA `consent/.../on-notify` (Door 2 outbound — check serve logs).

Postman folder **Data Transfer(HIP)** → **Consent HIP on notify** is the **HIP ack to NHA** (outbound), not the inbound notify above.

---

## Part F — Record fetch / data transfer (Door 3 + webhook.site)

### F.1 Setup HIU push URL (webhook.site)

1. Open https://webhook.site  
2. Copy your unique URL, e.g. `https://webhook.site/abc-123-def`  
3. Use as **`dataPushUrl`** in HI request (HIU receives encrypted bundles here)

### F.2 Simulate HI request to your HIP

After consent row exists (Part E), run:

```bash
NGROK=https://a1b2c3d4.ngrok-free.app
CONSENT_ID=<consent-id-from-db>
PUSH_URL=https://webhook.site/your-unique-id
REQ=$(uuidgen)
TXN=$(uuidgen)

curl -sS -X POST "$NGROK/api/v3/hip/health-information/request" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQ" \
  -H "TIMESTAMP: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  -H "X-HIP-ID: IN3610001625" \
  -d "{
    \"hiRequest\": {
      \"consent\": { \"id\": \"$CONSENT_ID\" },
      \"dateRange\": {
        \"from\": \"2020-01-01T00:00:00.000Z\",
        \"to\": \"2030-01-01T00:00:00.000Z\"
      },
      \"dataPushUrl\": \"$PUSH_URL\",
      \"keyMaterial\": {
        \"cryptoAlg\": \"ECDH\",
        \"curve\": \"Curve25519\",
        \"dhPublicKey\": {
          \"expiry\": \"2030-01-01T00:00:00.000Z\",
          \"parameters\": \"Curve25519/32byte random key\",
          \"keyValue\": \"BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=\"
        },
        \"nonce\": \"0ka0stPfqmXWhX+ODC/iOFMO0PXFdRjBdcEGbv55qqc=\"
      }
    }
  }"
```

**What adapter does:**

1. Ack to NHA `health-information/hip/on-request` (Door 2 outbound)  
2. Fetches mock bundle (`ABDM_M2_MOCK_PLATFORM=true`)  
3. POSTs encrypted payload to **webhook.site** (`dataPushUrl`)  
4. Notifies NHA `health-information/notify`

**Check:**

- webhook.site shows POST with `entries`  
- Serve logs: no errors on push  
- Session state `abdm.m3.hip.v1` progresses in DB  

Postman **Data Transfer(HIP)** → **HIP Health Information Response** = outbound ack (adapter does this automatically after inbound request).

---

## Part G — User-initiated linking (optional)

Patient uses PHR app; NHA calls your ngrok:

| Order | Postman folder (simulate) or wait for real PHR | Your path |
|-------|-----------------------------------------------|-----------|
| 1 | User Initiated → discover | `POST /api/v3/hip/patient/care-context/discover` |
| 2 | init | `POST /api/v3/hip/link/care-context/init` |
| 3 | confirm | `POST /api/v3/hip/link/care-context/confirm` |

Requires `ABDM_M2_MOCK_PLATFORM=true` and `ABDM_MOCK_ABHA_ADDRESS` matching discover body.

You can import Postman examples and change host from `webhook.site` to your **ngrok** URL for manual simulation.

---

## Part H — Quick reference tables

### H.1 App APIs (Swagger / Door 1)

Base: `http://localhost:3007/api/abdm/v1`  
Header: `x-tenant-id: 00000000-0000-4000-8000-0000000000aa`

| API | Method | Path |
|-----|--------|------|
| Health | GET | `/healthz` (also `/api/abdm/v1/healthz`) |
| Gateway smoke | GET | `/m0/gateway/session` |
| M1 OTP | POST | `/m1/enrol/aadhaar/otp` |
| M1 verify | POST | `/m1/enrol/aadhaar/verify` |
| M1 ABHA address | POST | `/m1/abha-address` |
| M1 profile | GET | `/m1/profile?sessionId=` |
| **M2 link start** | POST | `/m2/hip/initiated-link/start` |
| M2 add contexts | POST | `/m2/add-contexts/publish` |
| M2 SMS | POST | `/m2/sms/notify` |

### H.2 Postman → NHA (Door 2) — minimum set

| Postman request | Purpose |
|-----------------|---------|
| Registration and Auth → Session API | `accessToken` |
| Registration and Auth → Update Bridge URL | Register ngrok |
| HIP Initiated Linking → Link Token Generation | Token for link |
| Data Transfer → (outbound acks — optional observe) | After adapter runs |

### H.3 Callbacks on ngrok (Door 3)

Base: `https://YOUR-NGROK.ngrok-free.app`

| Method | Path |
|--------|------|
| POST | `/api/v3/hip/token/on-generate-token` |
| POST | `/api/v3/link/on_carecontext` |
| POST | `/api/v3/consent/request/hip/notify` |
| POST | `/api/v3/hip/health-information/request` |
| POST | `/api/v3/hip/patient/care-context/discover` |
| POST | `/api/v3/hip/link/care-context/init` |
| POST | `/api/v3/hip/link/care-context/confirm` |

---

## Part I — Troubleshooting

| Problem | Fix |
|---------|-----|
| No callback on ngrok | Run **Update Bridge URL** again; ngrok URL changed |
| 503 on initiated-link/start | Run generate-token; wait for on-generate-token |
| 400 Invalid X Auth token | DB may hold a fake JWT (e.g. manual curl test); restore real `linkToken` from ngrok `on-generate-token` body |
| ABDM-1092 duplicate token | Token still active on NHA — skip generate-token; fix DB token or wait for expiry |
| Wrong patient on discover | Set `ABDM_MOCK_ABHA_ADDRESS` = your M1 ABHA |
| Consent push fails | Run Part E first; use `consentId` from DB in Part F |
| webhook.site empty | Check `dataPushUrl` in HI request; check adapter logs |
| ngrok 404 | Path must include `/api/v3/...` |
| ngrok **500** on `on-generate-token` | Check serve logs; often missing `REQUEST-ID` header (adapter uses `body.response.requestId` as fallback) |
| DB `link_token` = `<paste...>` or `token_len` &lt; 100 | Placeholder UPDATE — delete row; fix callback **202** first; token saves automatically |

---

## Part J — Recommended test order (checklist)

- [ ] Terminal 1: `abdm-adapter-svc:serve` healthy  
- [ ] Terminal 2: `ngrok http 3007`  
- [ ] Postman: Session API → `accessToken`  
- [ ] Postman: Update Bridge URL → your ngrok HTTPS URL  
- [ ] M1: create ABHA → update `ABDM_MOCK_ABHA_ADDRESS`  
- [ ] Postman: Link Token Generation  
- [ ] ngrok received `on-generate-token`  
- [ ] Swagger/curl: `initiated-link/start`  
- [ ] ngrok received `on_carecontext` → DB state `LINKED`  
- [ ] curl: consent notify to ngrok → row in `abdm_consent_artefacts`  
- [ ] webhook.site URL + curl: HI request → payload on webhook.site  

When all checked, you have tested **HIP link + consent + record fetch** end-to-end on sandbox.
