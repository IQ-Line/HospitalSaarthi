# ABDM Adapter — M3 Mock Harness Guide

> Self-contained playbook for driving M3 flows locally without depending on real ABDM gateway, Record Foundation, or EMPI. Read after [`08-m3-flows.md`](./08-m3-flows.md) and the [ADR-0033 mock strategy](../../adr/0033-abdm-m3-mock-harness-strategy.md).

The harness has two halves:

1. **Mock CM via curl** — bash scripts fire synthetic gateway callbacks at our service. The service's outbound gateway HTTP becomes no-ops + structured logging.
2. **Loopback HIU** — the HIP-side data push, instead of POSTing to the external `dataPushUrl` from the request, rewrites the URL to localhost so the same service receives, decrypts, and stores. Closes the encrypt→decrypt loop end-to-end in one process.

## 1. Env flag matrix

| Env var | Default (dev) | Default (prod) | What it does |
|---|---|---|---|
| `ABDM_M3_MOCK_GATEWAY` | `true` | `false` | Outbound gateway HTTP calls become no-ops + log. Curl scripts fire the would-be-callbacks at our inbound endpoints. |
| `ABDM_M3_LOOPBACK_HIU` | `true` | `false` | HIP-side dataPushUrl resolves to `http://localhost:${PORT}/api/v3/hiu/health-information/transfer/:transferId` instead of the external URL in the request. |
| `ABDM_M3_DATA_PUSH_URL_ALLOWLIST` | empty (any) | comma-sep host list | Restricts dataPushUrl outbound to known HIUs in non-loopback mode. SSRF defense. Empty = any (dev only). |
| `ABDM_M3_PUSH_TIMEOUT_MS` | `10000` | `10000` | Per-attempt timeout for HIP push to HIU. |
| `ABDM_M3_TRANSFER_TIMEOUT_HOURS` | `24` | `24` | HIU `AWAITING_PUSH` deadline before flipping to `EXPIRED` (`M3_HIU_STATES` has no separate `TIMEOUT` — encode timeout reason in `context.error`). |
| `ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS` | `72` | `72` | HIU `AWAITING_PATIENT_APPROVAL` deadline before flipping to `EXPIRED` if no notify arrives. |
| `ABDM_M3_KEYPAIR_TTL_HOURS` | `24` | `24` | Expiry stamped on the HIU public key in the data request body. |

**Local dev** (in `.env.local` or shell):
```bash
export ABDM_M3_MOCK_GATEWAY=true
export ABDM_M3_LOOPBACK_HIU=true
export ABDM_M3_DATA_PUSH_URL_ALLOWLIST=     # empty — accept any
```

**Sandbox** (when you want to verify a real gateway round-trip):
```bash
export ABDM_M3_MOCK_GATEWAY=false
export ABDM_M3_LOOPBACK_HIU=false
export ABDM_M3_DATA_PUSH_URL_ALLOWLIST=ngrok.io   # or specific subdomain
# then: ngrok http 3007
```

**Production** (all real, allowlist enumerated):
```bash
ABDM_M3_MOCK_GATEWAY=false
ABDM_M3_LOOPBACK_HIU=false
ABDM_M3_DATA_PUSH_URL_ALLOWLIST=hiu-staging.aiims.in,hiu-prod.aiims.in
```

## 2. Architecture

```
                  ┌──────────────────────────────────────────────────┐
                  │             abdm-adapter-svc (:3007)              │
                  │                                                    │
   curl scripts ──▶│ POST /api/v3/hiu/consent/request/on-init          │ <-- HIU inbound from "CM" (mocked)
                  │ POST /api/v3/hiu/consent/request/notify           │
                  │ POST /api/v3/hiu/consent/on-fetch                 │
                  │ POST /api/v3/hiu/health-information/on-request    │
                  │ POST /api/v3/hiu/health-information/transfer/:id  │ <-- HIU receives push (real handler exercised)
                  │ POST /api/v3/hip/health-information/request       │ <-- HIP inbound from "CM" (mocked)
                  │                                                    │
                  │  Use-cases (real code path):                       │
                  │  - HIU: start, fetch, decrypt                      │
                  │  - HIP: assemble, encrypt, push                    │
                  │                                                    │
   loopback ◀────│  HIP push → localhost:3007/api/v3/hiu/.../transfer │
                  │  (when ABDM_M3_LOOPBACK_HIU=true)                  │
                  │                                                    │
                  │  Gateway outbound (mocked):                        │
                  │  - postConsentRequest()      → log only             │
                  │  - postConsentFetch()        → log only             │
                  │  - postDataRequest()         → log only             │
                  │  - postDataNotify()          → log only             │
                  │  (curl scripts simulate the would-be callbacks)    │
                  └──────────────────────────────────────────────────┘
                                          │
                                          │ uses
                                          ▼
                  ┌──────────────────────────────────────────────────┐
                  │  Mock platform clients (from M2):                  │
                  │  - MockRecordFoundationClient                      │
                  │    .fetchBundlesForConsent() → HealthDocumentRecord│
                  │    placeholder bundle (PR #86 must-fix #3)         │
                  │  - MockEmpiClient                                  │
                  └──────────────────────────────────────────────────┘
```

The **real code paths** exercised in mock mode:
- State machine transitions
- ECDH keypair generation, deriveSharedSecret, AES-GCM encrypt/decrypt
- JCS canonicalization (signature is permissive in mock — see pitfall §5 of [`08-m3-flows.md`](./08-m3-flows.md#pitfall-5--datapushurl-is-external-allowlist--timeout-matter))
- Idempotency dedupe
- DB writes to `abdm_m3_consent_requests`, `abdm_m3_consent_artefacts_hiu`, `abdm_m3_data_transfers`
- Event emission (`abdm.health-record.received`)

The **mocked I/O edges**:
- Gateway outbound HTTP (`gateway-client.http.ts` becomes a logger when `ABDM_M3_MOCK_GATEWAY=true`)
- External HIU dataPushUrl (rewritten to localhost when `ABDM_M3_LOOPBACK_HIU=true`)
- Real Record Foundation (replaced by `MockRecordFoundationClient` returning placeholder bundle)

## 3. The 5-minute end-to-end loop

Run from the worktree root. Prerequisites: PG running, M3 migration applied, adapter service running with mock flags on.

```bash
# Terminal 1 — start the service
export ABDM_M3_MOCK_GATEWAY=true
export ABDM_M3_LOOPBACK_HIU=true
npx nx run abdm-adapter-svc:serve
# Listens on :3007.

# Terminal 2 — drive the loop
bash modules/abdm-adapter/scripts/m3/full-loop.sh
```

`full-loop.sh` runs all eight steps in sequence, captures the IDs between them, and exits 0 on success.

### Step-by-step (what `full-loop.sh` does)

**Step 1 — Start the consent request.**
```bash
SESSION=$(curl -sSX POST http://localhost:3007/api/abdm/v1/m3/hiu/consent/request \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: 00000000-0000-0000-0000-000000000001' \
  -d '{
    "patientAbhaAddress": "test.user@sbx",
    "purpose": "CAREMGT",
    "hiTypes": ["OPConsultation"],
    "dateRange": { "from": "2025-01-01T00:00:00Z", "to": "2026-05-21T00:00:00Z" }
  }' | jq -r '.sessionId')

CONSENT_REQUEST_ID=$(curl -sS \
  http://localhost:3007/api/abdm/v1/m3/hiu/consent/request/$SESSION \
  | jq -r '.consentRequestId')

echo "SESSION=$SESSION CONSENT_REQUEST_ID=$CONSENT_REQUEST_ID"
```

**Expected state:** `CONSENT_INIT_REQUESTED`
**Expected log line:** `[abdm.m3.hiu.v1] would-have-posted to CM (ABDM_M3_MOCK_GATEWAY=true) requestId=...`
**Verify:**
```bash
curl -sS http://localhost:3007/api/abdm/v1/m3/hiu/consent/request/$SESSION | jq '.state'
# expect: "CONSENT_INIT_REQUESTED"
```

**Step 2 — Inject `on-init` (CM acks our request).**
```bash
bash modules/abdm-adapter/scripts/m3/inject-on-init.sh $CONSENT_REQUEST_ID
```

**Expected state:** `AWAITING_PATIENT_APPROVAL`
**Verify:** state above flips.

**Step 3 — Inject `notify-granted` (patient approves).**
```bash
bash modules/abdm-adapter/scripts/m3/inject-notify-granted.sh $CONSENT_REQUEST_ID
```

**Expected state:** still `AWAITING_PATIENT_APPROVAL` until `/fetch` completes (the handler kicks off `/fetch` per artefact automatically within the same transition).
**Verify:**
```bash
CONSENT_ID=$(curl -sS http://localhost:3007/api/abdm/v1/m3/hiu/consent/request/$SESSION \
  | jq -r '.consentArtefactIds[0]')
echo "CONSENT_ID=$CONSENT_ID"
```

**Step 4 — Inject `on-fetch` (CM returns the signed artefact).**
```bash
bash modules/abdm-adapter/scripts/m3/inject-on-fetch.sh $CONSENT_ID
```

**Expected state:** `CONSENT_GRANTED`
**Verify:**
```bash
curl -sS http://localhost:3007/api/abdm/v1/m3/hiu/consent/request/$SESSION | jq '.state'
# expect: "CONSENT_GRANTED"
```

**Step 5 — Start the data request.**
```bash
TRANSFER_ID=$(curl -sSX POST http://localhost:3007/api/abdm/v1/m3/hiu/data-request \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: 00000000-0000-0000-0000-000000000001' \
  -d "{\"consentId\":\"$CONSENT_ID\"}" \
  | jq -r '.transferId')

echo "TRANSFER_ID=$TRANSFER_ID"
```

**Expected state:** `DATA_REQUESTED` (same session row; sub-flow has switched from consent-request to data-fetch)
**Expected log line:** `[abdm.m3.hiu.v1] generated keypair pubLen=65 nonceLen=32`

**Step 6 — Inject `on-request` (CM acks).**
```bash
bash modules/abdm-adapter/scripts/m3/inject-on-data-request.sh $TRANSFER_ID
```

**Expected state:** `AWAITING_PUSH`
**Verify:**
```bash
curl -sS http://localhost:3007/api/abdm/v1/m3/hiu/transfers/$TRANSFER_ID | jq '.state'
# expect: "AWAITING_PUSH"
```

**Step 7 — Trigger the HIP-side data flow (loopback).**
```bash
bash modules/abdm-adapter/scripts/m3/trigger-hip-data-flow.sh $CONSENT_ID
```

This fires `POST /api/v3/hip/health-information/request` at our own service. Because `ABDM_M3_LOOPBACK_HIU=true`, the HIP side:
1. Acks CM (logged as would-be-POST)
2. Calls `MockRecordFoundationClient.fetchBundlesForConsent` → returns placeholder `HealthDocumentRecord`
3. Encrypts with Fidelius using the HIU's public key (we look it up from `abdm_m3_data_transfers` by `consent_id`)
4. POSTs the encrypted body to `localhost:3007/api/v3/hiu/health-information/transfer/$TRANSFER_ID` (loopback)
5. Notifies CM (logged) with `sessionStatus: TRANSFERRED`

The HIU receiver (us) then decrypts and stores.

**Expected HIU state progression (within ~2s):** `BUNDLES_RECEIVED` → `BUNDLES_DECRYPTED` → `RECORDS_INGESTED` → `ACKNOWLEDGED`

**Step 8 — Verify the bundle landed.**
```bash
curl -sS http://localhost:3007/api/abdm/v1/m3/hiu/transfers/$TRANSFER_ID | jq '.'
# expect: state="ACKNOWLEDGED", bundle contains FHIR HealthDocumentRecord
```

If state ≠ ACKNOWLEDGED at this point, see §7 Troubleshooting.

## 4. HIU consent-request only

For testing only the consent sub-flow (not data fetch), run steps 1–4 from above and stop. The session sits at `CONSENT_GRANTED` and never moves further until a data request starts (step 5).

Useful for testing `notify-denied` paths:
```bash
# steps 1-2 as above, then:
bash modules/abdm-adapter/scripts/m3/inject-notify-denied.sh $CONSENT_REQUEST_ID
# state moves to DENIED — terminal
```

## 5. HIU data-fetch only

Assumes you already have a granted artefact in DB (typically because consent-request flow ran). To seed manually:

```sql
INSERT INTO abdm_adapter.abdm_m3_consent_artefacts_hiu
  (iq_tenant_id, consent_id, consent_request_id, patient_abha_address, hip_id, status,
   data_erase_at, granted_at, artefact_json, signature, signature_valid)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'CON-TEST-SEEDED-0001',
   'REQ-TEST-SEEDED-0001',
   'test.user@sbx',
   'SBX_TEST_HIP_001',
   'GRANTED',
   now() + interval '90 days',
   now(),
   '{...artefact JSON from on-fetch-with-artefact.json fixture...}'::jsonb,
   'PLACEHOLDER_SIGNATURE',
   false);
```

Then run steps 5–8 with `CONSENT_ID=CON-TEST-SEEDED-0001`.

## 6. HIP data-response only

For testing only the HIP-side response, run step 7 directly with a seeded consent on the HIP side. The HIP side reads its own consent artefact storage (`abdm_consent_artefacts` from M2). Either:

(a) Run the M2 `consent-notify` flow first to seed an artefact, or
(b) Seed manually:

```sql
INSERT INTO abdm_adapter.abdm_consent_artefacts
  (iq_tenant_id, consent_id, patient_id, hip_id, hiu_id, status, data_erase_at, granted_at, artefact_json, signature, signature_valid)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CON-TEST-HIP-SEEDED-0001', ...);
```

Then:
```bash
bash modules/abdm-adapter/scripts/m3/trigger-hip-data-flow.sh CON-TEST-HIP-SEEDED-0001
```

Observe the encrypted POST hit `localhost:3007/...transfer/<random-transferId>` in the logs. The HIU receiver isn't expected to know what to do with a transfer it didn't request (since we skipped steps 5–6); it'll log a 404 or "unknown transferId" but the HIP side completes its own state machine to `COMPLETED`.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| **Decryption fails with "tag mismatch"** | Almost always: someone reimplemented Fidelius instead of using `decryptFromPeerMaterial`. The salt/IV split (first 20 bytes of XORed nonces as HKDF salt, last 12 bytes as AES-GCM IV) is the trap. XOR order itself does NOT matter — XOR is commutative. | Use the wrapper. See [`08-m3-flows.md Pitfall §6`](./08-m3-flows.md#pitfall-6--dont-reimplement-fidelius-use-the-wrappers) and [`fidelius-bc-vector.test.ts`](../../../../modules/abdm-adapter/src/lib/fidelius-bc-vector.test.ts) for the byte-exact reference vector. |
| **Decryption fails with "invalid public key length"** | HIU public key not properly base64-encoded as 65-byte uncompressed EC point | Check `keyMaterial.dhPublicKey.keyValue` length after base64 decode = 65 bytes starting with `0x04`. If it's 32 bytes, you've accidentally used Montgomery X25519 — see [`08-m3-flows.md pitfall §4`](./08-m3-flows.md#pitfall-4--ecdh-curve-form-trap-inherited-from-m2). |
| **Loopback push returns 404** | `ABDM_M3_LOOPBACK_HIU` not set OR transferId path mismatch | Check `echo $ABDM_M3_LOOPBACK_HIU` shows `true`. Check the HIP push URL log line — should end in `/transfer/$TRANSFER_ID`. |
| **`on-init` arrives but state stuck at `CONSENT_INIT_REQUESTED`** | Idempotency dedupe hit on wrong key | The curl script generates a fresh `REQUEST-ID` UUID each call. If you re-ran the same script with curl `--retry`, the second call gets dedup'd. Check `abdm_inbound_messages` table for the request_id. |
| **Consent fetch returns artefact but `signature_valid: false`** | Mock fixture's signature is a placeholder; verifier permissive in mock mode is expected | Real signature verification only against sandbox/staging gateway JWKS. `signature_valid: false` in mock mode is correct behaviour. |
| **Mock CM curl scripts hang** | Adapter service not running | Check `lsof -i :3007`. Restart `npx nx run abdm-adapter-svc:serve`. |
| **`uuidgen` not found** (the scripts use it) | Linux distro without `uuid-runtime` | Install: `sudo apt install uuid-runtime` — or replace `$(uuidgen)` with `$(cat /proc/sys/kernel/random/uuid)` in the scripts. |
| **`jq` not found** | Distro without jq | `sudo apt install jq` (Ubuntu/Debian) or `brew install jq` (mac). |
| **HIP push lands but HIU receiver decrypts to garbage** | HIU's private key was regenerated since the data request was sent (e.g., service restart between steps 5 and 7 with no DB persistence) | Confirm `abdm_m3_data_transfers.hiu_private_key_jwk` is populated and not NULL. If it is, the encrypted-at-rest layer (`payload-encryptor`) may be returning empty. |
| **CM-side `on-notify` ack not posted** (would-be-log line absent) | Notify handler logic skipped the ack | Check the flow's `handle-notify-callback.ts` — it should call `deps.gateway.postConsentNotifyAck(...)` before transitioning state. |
| **Bundle JSON in `abdm_m3_data_transfers.bundle_json` is empty `{}`** | Mock `RecordFoundationClient.fetchBundlesForConsent` returned an empty placeholder | Check `MockRecordFoundationClient` is wired with `buildMockHealthDocumentBundle` (the PR #86 helper). If RF is wired with the old stub, replace per [`09-m3-dev-guide.md §4.6`](./09-m3-dev-guide.md#46-record-foundation-clienthttpts--extend). |

## 8. Removing the harness

When **all three** of the [ADR-0033 §"Revisit trigger"](../../adr/0033-abdm-m3-mock-harness-strategy.md#revisit-trigger) conditions hold:

1. Real Record Foundation provides `fetchBundlesForConsent` over HTTP.
2. A separate HIU service exists in the platform.
3. CM JWKS-based JWS signature verifier is wired in production.

then:

1. Flip both flags off in production env:
   ```bash
   ABDM_M3_MOCK_GATEWAY=false
   ABDM_M3_LOOPBACK_HIU=false
   ```
2. Set `ABDM_M3_DATA_PUSH_URL_ALLOWLIST` to the real HIU base URLs.
3. Run sandbox integration tests instead of the curl loop.

**No code deletion needed** — env flags do the gating. The curl scripts stay in the repo as integration-test inputs (the `m3-hiu-consent-request.sandbox.integration.test.ts` can `bash inject-notify-granted.sh` instead of fabricating notify bodies in-process). Fixtures stay as unit-test inputs.

## Related

- [ADR-0033 mock harness strategy](../../adr/0033-abdm-m3-mock-harness-strategy.md) — why this exists
- [08-m3-flows.md](./08-m3-flows.md) — what the flows do (read first)
- [09-m3-dev-guide.md](./09-m3-dev-guide.md) — how to implement them
- [11-m3-doc-vetting-notes.md](./11-m3-doc-vetting-notes.md) — production HIMS divergences NOT to replicate
- `modules/abdm-adapter/test-fixtures/m3/README.md` — fixture-to-flow-step mapping
- `modules/abdm-adapter/scripts/m3/README.md` — per-script env requirements
