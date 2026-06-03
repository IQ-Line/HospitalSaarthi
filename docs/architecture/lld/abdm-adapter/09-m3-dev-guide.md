# ABDM Adapter — M3 Dev Guide

> Self-contained checklist for the developer picking up the M3 sprint. Read this start-to-finish before opening a file. Assumes you've finished M2 — references M2 patterns rather than re-explaining them.

## 0. Prerequisites

- **M2 is merged on `dev`** (Fidelius BC curve25519, signature verifier, mock platform clients, per-flow context pattern all available). Branch off `dev`, not off any M2 PR branch.
- ABDM Sandbox credentials, same env keys as M1/M2 (`ABDM_SANDBOX_CLIENT_ID` / `ABDM_SANDBOX_CLIENT_SECRET`).
- **`X-HIU-ID`** — your facility's HIU id (one per HIP/HIU pair registered in HFR). Confirm with the lead which test HIU id to use in the sandbox.
- **Callback URL** — extend the M1/M2 `ngrok http 3007` registration; the new M3 inbound paths (`/api/v3/hiu/...`, `/api/v3/hip/health-information/request`) must resolve under the public URL registered in the sandbox console. **No new registration needed if the M2 base path is already registered** — gateway routes by full path.
- **Mock harness** — for most of this sprint you'll drive flows without sandbox. See [`10-m3-mock-harness-guide.md`](./10-m3-mock-harness-guide.md). Default env in dev: `ABDM_M3_MOCK_GATEWAY=true` + `ABDM_M3_LOOPBACK_HIU=true`.
- Reference impl at `/home/ayushiqline/projects/hims/abdi-lims-backed` available locally. Start with `src/services/milestone3Service.ts`, `src/services/callbackService.ts` (M3 sections), `src/routes/milestone3.ts`, `src/routes/callback.ts`, and `src/models/M3Session.ts`. Useful for *which exact `on-*` body shape the sandbox accepts* and *what error codes appear in practice*. **Do not copy structure** — production intermixes handlers and persistence; M3 here keeps the M1/M2 typed-port layering. See [`11-m3-doc-vetting-notes.md`](./11-m3-doc-vetting-notes.md) for the bug catalogue you should NOT replicate.

Reading order before code:

1. [`08-m3-flows.md`](./08-m3-flows.md) — flow catalogue (this guide assumes you've read it)
2. [`12-phr-push-reconciliation.md`](./12-phr-push-reconciliation.md) — canonical M3 HIP push / Fidelius direction
3. [`04-orchestration-phase-1-http-first.md §11`](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical) — **the nine portability rules**. Memorise; PR review will check.
3. [`ADR-0031`](../../adr/0031-abdm-m3-mock-harness-strategy.md) — mock harness strategy (why curl-injectable + loopback)
4. This file
5. `docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md` — **the source spec.** Read §4 (Consent flow) end-to-end and §5 (Data flow) end-to-end before writing any handler. Skip §6 (Subscription — deferred to M4).
6. [`11-m3-doc-vetting-notes.md`](./11-m3-doc-vetting-notes.md) — before copying any pattern from production HIMS

### Naming bridge — HLD 04 vocabulary vs. ABDM adapter directories

Same as M2 (see [`06-m2-dev-guide.md §"Naming bridge"`](./06-m2-dev-guide.md#naming-bridge--hld-04-vocabulary-vs-abdm-adapter-directories)). No change.

## 1. Familiarise with the spec

Read the M3 spec end-to-end before writing code. For each of the three M3 flows in [`08-m3-flows.md`](./08-m3-flows.md), find in the spec:

- The **request body shape** for every endpoint (HIU → CM, CM → HIU, HIP → HIU push).
- The **header set** — `REQUEST-ID`, `TIMESTAMP`, `Authorization`, `X-HIU-ID`, `X-CM-ID`. Some endpoints add `X-HIP-ID` (HIP-side data response).
- The **error code table** — codes `ABDM-1xxx` that show up in M3-specific flows (`ABDM-1080` invalid consent artefact id, `ABDM-1092` expired consent, etc.). Add new codes to [`packages/ts-sdk-abha/src/constants/error-codes.ts`](../../../../packages/ts-sdk-abha/src/constants/error-codes.ts).
- The **sequence diagrams** in §4.2 and §5.2 — authoritative for who-talks-to-whom-when.

When the v3 markdown spec disagrees with the wrapper YAML, **the v3 markdown wins** — the wrapper is a downstream facade.

## 2. Populate protocol DTOs (`packages/ts-sdk-abha/src/protocol/m3/`)

Create the following files. Fill in this order:

1. **`common.ts`** — `KeyMaterial`, `ConsentArtefactRef`, `HiRequest`, `HiTypePascal` enum (`"OPConsultation" | "Prescription" | "DiagnosticReport" | "DischargeSummary" | "ImmunizationRecord" | "HealthDocumentRecord" | "WellnessRecord"`), `PurposeCode` enum.
2. **`consent-request.ts`** — `ConsentRequestInitBody` (HIU → CM, §4.3.1), `OnConsentInitCallback` (CM → HIU, §4.3.2: `{ consentRequest: { id }, error?, response: { requestId } }`), `ConsentNotifyCallback` (CM → HIU, §4.3.3: `{ notification: { consentRequestId, status, reason?, consentArtefacts: [{id}] } }`), `OnConsentNotifyAck` (HIU → CM, §4.3.4: `{ acknowledgement: [{status, consentId}], error?, response: { requestId } }`).
3. **`consent-fetch.ts`** — `ConsentFetchRequest` (HIU → CM, §4.3.7: `{ consentId }`), `OnConsentFetchCallback` (CM → HIU, §4.3.8: full artefact body — see [`08-m3-flows.md §1 body shapes`](./08-m3-flows.md#body-shapes-cheat-sheet)).
4. **`data-request.ts`** — `HiuDataRequest` (HIU → CM, §5.3.1: the `hiRequest` body with `consent.id`, `dateRange`, `dataPushUrl`, `keyMaterial`), `OnHiuDataRequestCallback` (CM → HIU, §5.3.2), `HipDataRequest` (CM → HIP — same shape as HIU sent, threaded through CM).
5. **`data-push.ts`** — `EncryptedBundlePush` (HIP → HIU, no spec § dedicated; see [`08-m3-flows.md §2`](./08-m3-flows.md#body-shapes-cheat-sheet-1) push body). Fields: `pageNumber`, `pageCount`, `transactionId`, `entries: [{content, media, checksum, careContextReference}]`, `keyMaterial`.
6. **`data-notify.ts`** — `DataFlowNotify` (HIU or HIP → CM, §5.3.3: `{ notification: { consentId, transactionId, doneAt, notifier: {type, id}, statusNotification: {sessionStatus, hipId, statusResponses: [...]} } }`).

Each file exports interfaces, not classes. Suffix with `Body` for outbound requests, `Callback` for inbound-after-our-outbound. Match `protocol/m1/*.ts` and `protocol/m2/*.ts` for casing.

Inbound headers are **endpoint-specific** — per-route header DTO discipline same as M2 (don't model with one strict shared type):

```ts
// packages/ts-sdk-abha/src/protocol/common/inbound-gateway-headers.ts (already exists from M2)
export interface HiuInboundHeaders extends InboundGatewayHeadersBase {
  'x-hiu-id': string;
  'x-cm-id'?: string;
}
// HIP-side data-request callback uses HipInboundHeaders (already defined for M2).
// Push receiver (/transfer/:id) uses HiuInboundHeaders.
```

Per-route, validate only the header subset the spec requires. Use Zod or AJV at the handler.

## 3. Per-flow typed context

Same pattern as M2 ([`06-m2-dev-guide.md §3`](./06-m2-dev-guide.md#3-per-flow-typed-context--the-portable-shape)). Extend `FlowContextMap` + `FlowStateMap` in `modules/abdm-adapter/src/domain/session.ts`:

**Two flow kinds, not three.** The canonical `FlowContextMap` already declares `abdm.m3.hip.v1` (typed `M3HipContext`) and `abdm.m3.hiu.v1` (today an untyped `Record<string, unknown>` placeholder). Do NOT introduce new flow kinds. The work in this sprint is to:
1. **Define `M3HiuContext`** — replace the `Record<string, unknown>` placeholder. The HIU side is one flow kind with one umbrella state machine (`M3_HIU_STATES`); the consent-request sub-flow (08-m3-flows §1) and the data-fetch sub-flow (§2) share this context.
2. **Optionally extend `M3HipContext`** — it's currently minimal (consentId, transactionId, dataPushUrl, requestId). Add fields only when a new state transition genuinely needs to read or write them. Today's minimal shape is enough for the shipped HIP code; keep it lean.

```ts
// modules/abdm-adapter/src/domain/session.ts — edit in place
export interface FlowContextMap {
  // ... existing M1/M2 entries unchanged
  "abdm.m3.hip.v1": M3HipContext;          // already typed; extend cautiously
  "abdm.m3.hiu.v1": M3HiuContext;          // REPLACE the existing Record<string, unknown> placeholder
}
// FlowStateMap is already aligned (M3HipState, M3HiuState — no change needed)
```

Define `M3HiuContext` next to the HIU use-cases (`use-cases/m3/hiu/context.ts`). The HIU side is one umbrella context — consent-request sub-flow fields and data-fetch sub-flow fields live in the same interface because the same session row transitions through both:

```ts
// modules/abdm-adapter/src/use-cases/m3/hiu/context.ts
import type { EncryptedString } from "../../../lib/payload-encryptor";

export interface M3HiuContext {
  // §1 consent-request sub-flow
  consentRequestId?: string;                       // CM-issued at on-init; long-running handle
  consentArtefactIds?: string[];                   // populated on notify (multi-HIP fan-out)
  // §2 data-fetch sub-flow
  consentId?: string;                              // chosen artefact from the §1 list
  transferId?: string;                             // platform UUID; embedded in dataPushUrl path
  hiuPrivateKeyJwk?: EncryptedString;              // BC Weierstrass curve25519 private key, AES-encrypted at rest
  hiuPublicKeyBase64?: string;                     // 65-byte uncompressed EC point, base64
  transferNonceBase64?: string;                    // 32 bytes, base64
  dateRange?: { from: string; to: string };
  cmTransactionId?: string;                        // CM-issued at on-request; thread to notify
  hipPublicKeyBase64?: string;                     // received in push
  hipNonceBase64?: string;                         // received in push
  bundleJsonId?: string;                           // FK to abdm_m3_data_transfers.bundle_json after RECORDS_INGESTED
  error?: { code: string; message: string };
}
```

Use-cases take a typed session:

```ts
const session = await deps.sessions.findById<"abdm.m3.hiu.v1">({
  iqTenantId, sessionId,
});
// session.context is M3HiuContext, session.state is M3HiuState (one of M3_HIU_STATES)
```

Runtime guard `assertFlowKind(session, "abdm.m3.hiu.v1")` from M2 still applies. The HIP-side use-cases (already shipped) use `assertFlowKind(session, "abdm.m3.hip.v1")` — see [`push-health-information.ts:20`](../../../../modules/abdm-adapter/src/use-cases/m3/hip/push-health-information.ts).

## 4. Implement data-access additions

### 4.1 `abdm-m3-consent-requests.repo.ts` (new)

HIU-side ledger of consent requests we initiated. Schema:

```sql
CREATE TABLE abdm_adapter.abdm_m3_consent_requests (
  iq_tenant_id           uuid NOT NULL,
  consent_request_id     text NOT NULL,                    -- CM-issued
  session_id             uuid NOT NULL,                    -- platform-issued at INIT
  patient_abha_address   text NOT NULL,
  hip_id                 text,                              -- optional; pinned HIP
  purpose_code           text NOT NULL,
  hi_types               text[] NOT NULL,
  permission_date_from   timestamptz NOT NULL,
  permission_date_to     timestamptz NOT NULL,
  data_erase_at          timestamptz NOT NULL,
  state                  text NOT NULL,                    -- M3HiuState (one of M3_HIU_STATES — consent-half subset)
  consent_artefact_ids   text[] NOT NULL DEFAULT '{}',     -- populated when state becomes CONSENT_GRANTED (multi-artefact fan-out)
  context                jsonb NOT NULL,                   -- M3HiuContext snapshot (defensive — abdm_sessions.context remains the source of truth)
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (iq_tenant_id, consent_request_id)
);
SELECT create_distributed_table('abdm_adapter.abdm_m3_consent_requests', 'iq_tenant_id');
CREATE INDEX ix_m3_consent_requests_session ON abdm_adapter.abdm_m3_consent_requests (iq_tenant_id, session_id);
CREATE INDEX ix_m3_consent_requests_state  ON abdm_adapter.abdm_m3_consent_requests (iq_tenant_id, state);
```

Methods on `DrizzleM3ConsentRequestsRepo`:

```ts
class DrizzleM3ConsentRequestsRepo implements M3ConsentRequestsRepo {
  insert(input: { iqTenantId; consentRequestId; sessionId; ...context }): Promise<void>;
  findByConsentRequestId(input: { iqTenantId; consentRequestId }): Promise<M3ConsentRequest | null>;
  findBySessionId(input: { iqTenantId; sessionId }): Promise<M3ConsentRequest | null>;
  patch(input: { iqTenantId; consentRequestId; state?; contextMerge?; consentArtefactIds? }): Promise<void>;
  listForTenant(input: { iqTenantId; state? }): Promise<M3ConsentRequest[]>;
}
```

### 4.2 `abdm-m3-consent-artefacts-hiu.repo.ts` (new)

HIU-side: granted artefacts fetched and verified. **Separate from M2's `abdm_consent_artefacts`** (which is HIP-received). Schema:

```sql
CREATE TABLE abdm_adapter.abdm_m3_consent_artefacts_hiu (
  iq_tenant_id           uuid NOT NULL,
  consent_id             text NOT NULL,
  consent_request_id     text NOT NULL,                    -- FK back to abdm_m3_consent_requests
  patient_abha_address   text NOT NULL,
  hip_id                 text NOT NULL,                    -- which HIP holds the records
  status                 text NOT NULL,                    -- 'GRANTED'
  data_erase_at          timestamptz NOT NULL,
  granted_at             timestamptz NOT NULL,
  hi_types               text[] NOT NULL,                  -- PascalCase: OPConsultation, Prescription, ...
  care_contexts          jsonb NOT NULL,                   -- [{patientReference, careContextReference}, ...] from on-fetch body
  artefact_json          jsonb NOT NULL,                   -- full consentDetail body verbatim
  signature              text NOT NULL,
  signature_valid        boolean NOT NULL DEFAULT false,   -- false in mock/sandbox; true once staging verifier engages
  received_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (iq_tenant_id, consent_id)
);
SELECT create_distributed_table('abdm_adapter.abdm_m3_consent_artefacts_hiu', 'iq_tenant_id');
CREATE INDEX ix_m3_artefacts_hiu_patient ON abdm_adapter.abdm_m3_consent_artefacts_hiu (iq_tenant_id, patient_abha_address);
CREATE INDEX ix_m3_artefacts_hiu_request ON abdm_adapter.abdm_m3_consent_artefacts_hiu (iq_tenant_id, consent_request_id);
```

Methods: `upsert(artefact)`, `findById(iqTenantId, consentId)`, `listForRequest(iqTenantId, consentRequestId)`.

### 4.3 `abdm-m3-data-transfers.repo.ts` (new) — HIU-side transfer ledger

HIU-side only. The HIP side does not write here — it keeps state on `abdm_sessions` via `deps.sessions.patch` (see `push-health-information.ts` for the existing pattern). One row per HIU data-fetch attempt.

```sql
CREATE TABLE abdm_adapter.abdm_m3_data_transfers (
  iq_tenant_id            uuid NOT NULL,
  transfer_id             uuid NOT NULL,                   -- platform UUID; embedded in dataPushUrl
  session_id              uuid,                             -- HIU session that initiated the fetch (nullable for orphan rows)
  flow_kind               text NOT NULL,                    -- always 'abdm.m3.hiu.v1'
  state                   text NOT NULL,                    -- M3HiuState (data-fetch sub-flow subset)
  consent_id              text NOT NULL,
  outbound_request_id     text,                             -- gateway REQUEST-ID on data-request init (dedupe + on-request correlation)
  cm_transaction_id       text,                             -- CM-issued on /hiu/health-information/on-request
  hiu_private_key_jwk     text NOT NULL,                    -- encrypted at rest via PayloadEncryptor
  hiu_public_key_b64      text NOT NULL,                    -- base64 65-byte EC point we sent to CM
  hiu_nonce_b64           text NOT NULL,                    -- base64 32-byte nonce we sent to CM
  hip_public_key_b64      text,                             -- received in push; null until BUNDLES_RECEIVED
  hip_nonce_b64           text,                             -- ditto
  data_push_url           text NOT NULL,                    -- the URL we registered with CM (our own /transfer/:transferId)
  bundle_json             jsonb,                            -- decrypted FHIR bundle; populated at RECORDS_INGESTED, may be GC'd after the RF projection ingests
  error                   jsonb,                            -- { code, message } on EXPIRED
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  awaiting_push_until     timestamptz,                      -- 24h deadline; janitor sweeps when state=AWAITING_PUSH and now() > this
  PRIMARY KEY (iq_tenant_id, transfer_id)
);
SELECT create_distributed_table('abdm_adapter.abdm_m3_data_transfers', 'iq_tenant_id');
CREATE INDEX ix_m3_transfers_consent     ON abdm_adapter.abdm_m3_data_transfers (iq_tenant_id, consent_id);
CREATE INDEX ix_m3_transfers_txn         ON abdm_adapter.abdm_m3_data_transfers (iq_tenant_id, cm_transaction_id);
CREATE INDEX ix_m3_transfers_awaiting    ON abdm_adapter.abdm_m3_data_transfers (awaiting_push_until) WHERE state = 'AWAITING_PUSH';
```

Methods: `insert`, `findById`, `findByConsentId`, `findByCmTransactionId`, `patch`, `markBundleStored`, `listAwaitingPushOlderThan(deadline)` (for janitor).

### 4.4 Extend `gateway-client.http.ts`

Add M3 methods:

```ts
postConsentRequest(input: { requestId: string; body: ConsentRequestInitBody }): Promise<void>;
postConsentNotifyAck(input: { requestId: string; body: OnConsentNotifyAck }): Promise<void>;
postConsentFetch(input: { requestId: string; body: ConsentFetchRequest }): Promise<void>;
postDataRequest(input: { requestId: string; body: { hiRequest: HiuDataRequest } }): Promise<void>;
postDataNotify(input: { requestId: string; body: DataFlowNotify }): Promise<void>;
postHipOnRequestAck(input: { requestId: string; body: { hiRequest: { transactionId; sessionStatus }; error?; response: { requestId } } }): Promise<void>;
```

Each targets `ABDM_GATEWAY_BASE_URL` with the spec § path. Headers per the per-route requirement table in [`08-m3-flows.md`](./08-m3-flows.md). When `ABDM_M3_MOCK_GATEWAY=true`, the implementation logs the would-be-POST and returns immediately — no network call.

### 4.5 `HipDataPushClient` — already exists; extend, do not duplicate

The class is **already shipped** at [`data-access/hip-data-push.client.ts`](../../../../modules/abdm-adapter/src/data-access/hip-data-push.client.ts) as `HttpHipDataPushClient implements HipDataPushClient` (per the canonical port in [`ports.ts:191-197`](../../../../modules/abdm-adapter/src/ports.ts)):

```ts
// From ports.ts (do not redefine):
export interface HipDataPushClient {
  push(input: {
    dataPushUrl: string;
    body: Record<string, unknown>;
    requestId: string;
  }): Promise<void>;
}
```

Helpers also exported from the same file:
- `checksumForContent(content: string): string` — sha256 hex of the encrypted base64 payload
- `newPushRequestId(): string` — UUID for the outbound REQUEST-ID header

**What's missing** for M3 production-readiness (extend the class, don't fork it):
- An **allowlist** (`ABDM_M3_DATA_PUSH_URL_ALLOWLIST`) — comma-separated host list to gate the outbound POST against SSRF. Empty = any (dev only).
- A **loopback rewrite** for `ABDM_M3_LOOPBACK_HIU=true` — when set, override the `input.dataPushUrl` to `http://localhost:${PORT}${parsedPathname}` so the HIP side POSTs to our own HIU receiver. Used by the mock harness end-to-end loop.
- A **3-retry exponential backoff** (60s / 5min / 30min) for transient push failures; bounded by `ABDM_M3_PUSH_TOTAL_TIMEOUT_MS`.

Wire these via constructor config or a small subclass — whichever fits the existing class's constructor shape. Don't introduce a parallel `HttpDataPushClient` (the round-2 review caught this — there is only one canonical port).

### 4.6 `record-foundation-client.http.ts` — extend

The M2 stub `RecordFoundationClient` adds:

```ts
fetchBundlesForConsent(input: {
  iqTenantId: string;
  consentId: string;
  dateRange: { from: string; to: string };
}): Promise<FhirBundle>;
```

In mock mode (default), returns `buildMockHealthDocumentBundle({ abhaAddress, careContextReference })` (the placeholder from PR #86 must-fix #3) regardless of input. Real impl HTTPs to RF when RF arrives.

### 4.7 Signature verifier — reuse from M2

`lib/consent-signature-verifier.ts` (already on dev from M2 PR #86) handles JCS canonicalization + signature verification. M3's HIU on-fetch flow calls `verify(consentDetail, signature)` exactly as M2's consent-notify flow did. Sandbox/mock mode returns `signature_valid: false` but still persists; staging mode verifies against gateway JWKS (still TODO — same follow-up as M2).

## 5. Implement use-cases

### 5.1 What already exists (read, don't rebuild)

The HIP-side use-cases are **already shipped**. Don't create a parallel `hip-data-response/` folder — extend or wire up the existing files:

```
modules/abdm-adapter/src/use-cases/m3/hip/
  handle-hi-request-callback.ts          # EXISTS — handleHipHiRequestCallback(...)
                                          #   inbound /hip/health-information/request → DATA_REQUESTED
  push-health-information.ts              # EXISTS — pushHealthInformationForSession(...)
                                          #   KEYS_EXCHANGED → BUNDLES_FETCHED → BUNDLES_ENCRYPTED → BUNDLES_PUSHED
  notify-data-transfer.ts                 # EXISTS — notifyHipDataTransfer(...)
                                          #   BUNDLES_PUSHED → ACKNOWLEDGED
```

Adjacent already-shipped pieces (read these too):
- `lib/parse-hi-request-body.ts` — `parseHiRequestBody(body, requestId)` handles the `consent.id` vs top-level `consentId` quirk
- `data-access/hip-data-push.client.ts` — `HttpHipDataPushClient` (canonical `HipDataPushClient` impl) + `checksumForContent` + `newPushRequestId` helpers
- `data-access/fidelius.ts` — `FideliusEncryptor` port impl

### 5.2 What to build (HIU side from scratch)

```
modules/abdm-adapter/src/use-cases/m3/hiu/
  context.ts                              # M3HiuContext (defined in §3 above)
  start-consent-request.ts                # staff UI POST → outbound /consent/v3/request/init → CONSENT_INIT_REQUESTED
  handle-on-init-callback.ts              # inbound on-init → AWAITING_PATIENT_APPROVAL / EXPIRED (on error)
  handle-notify-callback.ts               # inbound notify → fan out fetch per artefact id; signature-verify each
  fetch-artefact.ts                       # outbound /consent/v3/fetch (one per artefact id from notify)
  handle-on-fetch-callback.ts             # inbound on-fetch → verify signature → persist → CONSENT_GRANTED
  start-data-request.ts                   # staff UI POST → deps.fidelius keypair → outbound /data-flow/.../request → DATA_REQUESTED
  handle-on-data-request-callback.ts      # inbound /hiu/health-information/on-request → AWAITING_PUSH (set 24h timer)
  handle-bundle-push.ts                   # inbound /transfer/:id → deps.fidelius.decryptBundle → RECORDS_INGESTED → notify CM → ACKNOWLEDGED
  *.test.ts
```

### 5.3 What to wire (REST handlers — currently empty)

`modules/abdm-adapter/src/rest-handlers/m3/` does not yet exist on this branch. Create it for both HIU (new) and HIP (existing use-cases). See §6 below.

### 5.4 Function shape and discipline

Use-case function shape (unchanged from M1/M2):

```ts
export async function handleNotifyCallback(
  input: AbdmTenantInput<ConsentNotifyCallback>,
  deps: AbdmAdapterDeps,
): Promise<void> { ... }
```

Discipline (rules from [HLD 04 §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical)):

- **No direct DB writes** — only relevant data-access ports (`deps.consentArtefacts`, `deps.sessions`, `deps.inboundMessages`, any new M3-specific repos).
- **No direct outbound HTTP** — only `deps.gateway`, `deps.recordFoundation`, `deps.dataPush`.
- **No direct lib/fidelius imports** — go through `deps.fidelius`. Direct lib imports defeat the port pattern and break the durable-execution port path (see [`08-m3-flows.md`](./08-m3-flows.md) HIU + HIP cheat sheets for the correct call shapes).
- **Atomic transitions only** via `deps.sessions.patch({ state, contextMerge, ... })`. No two-write sequences without surrounding TX.
- **Named state strings** — always from `M3_HIP_STATES` / `M3_HIU_STATES` consts, never literals. The state diagrams in `08-m3-flows.md` use the canonical names verbatim.
- **One transition per handler** — a single use-case function changes the state once. If two transitions needed, split into two use-cases; second invoked synchronously by first.

## 6. Wire REST handlers (`rest-handlers/m3/` — currently empty)

The directory `modules/abdm-adapter/src/rest-handlers/m3/` does not yet exist on this branch. Create it and wire handlers for **both** the new HIU use-cases (§5.2) **and** the already-shipped HIP use-cases (§5.1). The HIP use-cases just need an HTTP entry point — `handleHipHiRequestCallback` is the function to call from the inbound `/api/v3/hip/health-information/request` handler; existing code does NOT bind itself to Fastify.

One file per (sub-)flow. Each inbound handler does **exactly four things**.

```ts
app.post(
  "/api/v3/hiu/consent/request/on-init",
  { schema: { body: onConsentInitCallbackSchema, headers: hiuInboundHeadersSchema } },
  async (req, reply) => {
    // 1. Verify signature (mock: returns true; staging: real JWS check)
    const signatureValid = await verifyAbdmSignature(req.headers, req.body);
    if (!signatureValid) return reply.code(401).send({ error: { code: "ABDM-1411", message: "invalid-signature" } });

    // 2. Idempotency check — use the canonical flow kind "abdm.m3.hiu.v1"
    const isNew = await deps.inboundMessages.insertIfNew({
      iqTenantId: req.tenantId,
      requestId: req.headers['request-id'] as string,
      flowKind: 'abdm.m3.hiu.v1',
    });
    if (!isNew) return reply.code(200).send();

    // 3. Kick off async work
    await handleOnInitCallback({ iqTenantId: req.tenantId, ...req.body }, deps);

    // 4. Respond fast (2xx; 200 matches FT-certified production)
    return reply.code(200).send();
  },
);
```

**Return any 2xx within a few seconds.** The spec is internally inconsistent on response codes — see [`08-m3-flows.md Pitfall §3`](./08-m3-flows.md#pitfall-3--inbound-response-status-any-2xx-works-spec-is-inconsistent-production-runs-on-200) for the per-endpoint spec values. Production HIMS returns 200 across the board (Express `res.json()` defaults) and is FT-certified. Pick **200 or 202 consistently** across handlers (200 matches production) and document the choice in PR. **Do NOT assert exact status in integration tests** — the test will be silently right by accident or noisy-wrong as soon as sandbox tightens or relaxes.

**Status code per route** (production-aligned default; both 200 and 202 are accepted by the gateway in practice):

| Endpoint | Default in our handler |
|---|---|
| `/api/v3/hiu/consent/request/on-init` | `200` |
| `/api/v3/hiu/consent/request/notify` | `200` |
| `/api/v3/hiu/consent/on-fetch` | `200` |
| `/api/v3/hiu/health-information/on-request` | `200` |
| `/api/v3/hiu/health-information/transfer/:transferId` | `200` |
| `/api/v3/hip/health-information/request` | `200` |

Handler ≤50 LOC. If it grows, the work belongs in the use-case (rule 1 in HLD 04 §11).

**Route URL convention:** inbound paths must match what the spec says (`/api/v3/hiu/...`, `/api/v3/hip/...`). Gateway POSTs to your registered `callbackURL` + these paths. Do **not** prefix with `/api/abdm/v1/`.

Staff-facing routes (`POST /api/abdm/v1/m3/hiu/consent/request`, `POST /api/abdm/v1/m3/hiu/data-request`, `GET /api/abdm/v1/m3/hiu/transfers/:id`) live under `/api/abdm/v1/m3/...` and are platform-internal — guarded by better-auth.

## 7. Idempotency for inbound webhooks

Every inbound callback gets the dedupe sandwich:

```sql
INSERT INTO abdm_inbound_messages (iq_tenant_id, request_id, flow_kind)
VALUES ($1, $2, $3)
ON CONFLICT (iq_tenant_id, request_id) DO NOTHING
RETURNING request_id;
```

Zero rows ⇒ duplicate ⇒ return `202` and stop. **Do not** skip — gateway retries with the same `REQUEST-ID` and delivers the same callback 2-3 times under load.

**M3 wrinkle for `/transfer/:transferId`:** the push from HIP doesn't carry a gateway-issued `REQUEST-ID` (CM is not in this path; it's a direct HIP→HIU POST). Use the path's `transferId` as the dedupe key:

```sql
INSERT INTO abdm_inbound_messages (iq_tenant_id, request_id, flow_kind)
VALUES ($1, $2, $3)  -- request_id = transferId here
ON CONFLICT (iq_tenant_id, request_id) DO NOTHING
RETURNING request_id;
```

For outbound posts that fail mid-flight (gateway briefly unreachable), **do not auto-retry inside the use-case**. Update state to `*_PENDING_ON_RETRY` and schedule a timer (see [`04-orchestration-phase-1-http-first.md §6`](../integration-platform/04-orchestration-phase-1-http-first.md#6-timer-worker)). Worker picks it up.

## 8. Tests

- **Unit tests** for every use-case using a fake `AbdmAdapterDeps` — same pattern as M1/M2. Live next to use-cases as `*.test.ts`.
- **Idempotency test** per inbound handler: same `REQUEST-ID` (or `transferId` for push) twice → second returns `202` with no DB writes/use-case call.
- **Crypto round-trip test** — `m3-fidelius-roundtrip.test.ts`: HIU `start-data-request.ts` generates keypair via `deps.fidelius.generateOurKeyMaterial` → simulate HIP `push-health-information.ts` encrypt → call HIU `handle-bundle-push.ts` decrypt → assert bundle equality. No sandbox needed. Critical regression coverage.
- **Per-flow integration test** against the sandbox, gated behind `RUN_ABDM_SANDBOX_TESTS=1`:
  - `m3-hiu-consent-request.sandbox.integration.test.ts`
  - `m3-hiu-data-fetch.sandbox.integration.test.ts`
  - `m3-hip-data-response.sandbox.integration.test.ts`
- **Signature verification test** — same gate + TODO as M2. Sandbox-only path for this sprint.
- **Schema integrity** — snapshot test against `drizzle-kit generate` for the three new tables.
- **Mock harness smoke** — `bash modules/abdm-adapter/scripts/m3/full-loop.sh` completes without error against a locally-running adapter service with the mock flags enabled. Wire as a CI job (Linux runner; no sandbox required).

## 9. Local run

```bash
# Apply migration
psql "$DATABASE_URL" -f modules/abdm-adapter/migrations/0002_abdm_adapter_m3_schema.sql

# Start the service with mock harness on
export ABDM_M3_MOCK_GATEWAY=true
export ABDM_M3_LOOPBACK_HIU=true
npx nx run abdm-adapter-svc:serve
# Listens on :3007.

# In a second shell, drive an end-to-end loop in 5 minutes
bash modules/abdm-adapter/scripts/m3/full-loop.sh

# Or drive specific flows step-by-step per the harness guide
bash modules/abdm-adapter/scripts/m3/inject-on-init.sh <consentRequestId>
```

See [`10-m3-mock-harness-guide.md`](./10-m3-mock-harness-guide.md) for the full walkthrough + per-flow sequences + troubleshooting.

For sandbox runs (when sandbox is up and you want to verify a real gateway round-trip):

```bash
ngrok http 3007
# Take the public URL; if your M2 facility callbackURL is already registered, the M3 paths
# resolve automatically since they share the base URL.
export ABDM_M3_MOCK_GATEWAY=false
export ABDM_M3_LOOPBACK_HIU=false
RUN_ABDM_SANDBOX_TESTS=1 npx nx run abdm-adapter:test -- m3-hiu-consent-request.sandbox.integration
```

## 10. Commit checklist before opening the PR

- Both flow kinds (`abdm.m3.hiu.v1`, `abdm.m3.hip.v1`) covered, with all three documentary sub-flows (HIU consent-request, HIU data-fetch, HIP data-response) implemented: DTOs populated, use-cases populated (HIU from scratch; HIP REST-handler wiring only — the use-cases ship pre-existing), inbound REST handlers wired, outbound posters wired.
- `abdm_m3_consent_requests`, `abdm_m3_consent_artefacts_hiu`, `abdm_m3_data_transfers` migrations applied locally.
- Per-flow typed context in `domain/session.ts` working; `findById<F>()` IntelliSense surfaces the right `context` shape.
- **Every outbound acknowledgement body carries `response.requestId`** — grep `hiu/on-notify`, `hip/on-request`; audit visually. Missing it = gateway silently drops the response. See [`08-m3-flows.md pitfall §1`](./08-m3-flows.md#pitfall-1--responserequestid-correlation-direction).
- **Inbound response status is 2xx, consistently** — pick 200 (matches FT-certified production) or 202 (spec text for most endpoints), apply across all handlers, document the choice in PR. Do NOT assert exact status in integration tests. See [`08-m3-flows.md Pitfall §3`](./08-m3-flows.md#pitfall-3--inbound-response-status-any-2xx-works-spec-is-inconsistent-production-runs-on-200).
- **HI types are PascalCase everywhere in M3** — see [`08-m3-flows.md pitfall §2`](./08-m3-flows.md#pitfall-2--hi-type-casing-varies-by-endpoint-inherited-from-m2).
- **Crypto round-trip test passes** — `m3-fidelius-roundtrip.test.ts`. This is the most important regression-coverage test in M3; do not ship without it.
- **No hand-rolled Fidelius and no direct lib imports** — every encrypt/decrypt site calls `deps.fidelius.encryptForPeer`, `deps.fidelius.encryptBundles`, `deps.fidelius.decryptBundle`, or `deps.fidelius.generateOurKeyMaterial`. Grep `from "../../lib/fidelius` and `from ".*fidelius-crypto"` — anything outside `data-access/fidelius.ts` is a ship-blocker. See [`08-m3-flows.md Pitfall §6`](./08-m3-flows.md#pitfall-6--dont-reimplement-fidelius-use-the-wrappers).
- **dataPushUrl allowlist** — env `ABDM_M3_DATA_PUSH_URL_ALLOWLIST` documented; allowlist enforcement asserted in `hip-data-push.client.test.ts` (extends the existing test file alongside `hip-data-push.client.ts`).
- `pnpm -F @hims/ts-sdk-abha build` clean.
- `npx nx run abdm-adapter:lint` and `npx nx run abdm-adapter:test` clean.
- Mock harness 5-minute loop completes in local dev.
- New event publisher wired: `abdm.health-record.received` (on HIU transition into `RECORDS_INGESTED`).
- PR description includes:
  - which flows have been exercised end-to-end via mock vs. sandbox
  - the ngrok URL pattern you used for sandbox tests (so reviewer can repeat)
  - explicit "Phase 1 portability rules followed" callout linking [HLD 04 §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical)
  - the spec §X.Y.Z citations for any non-obvious body shapes you implemented

## 11. Open questions — surface in PR description, do not silently resolve

| # | Question | Default in this guide |
|---|---|---|
| 1 | **HIU ephemeral ECDH private key persistence.** Needs to survive minutes-to-hours wait for HIP push. Where? | `abdm_m3_data_transfers.hiu_private_key_jwk` (encrypted at rest via `payload-encryptor`). Production HIMS uses similar in `M3Session.privateKey`. Confirm encryption pattern with security review. |
| 2 | **`/pushDataUrl` path shape.** Spec doesn't pin a path; HIU registers any URL. | `/api/v3/hiu/health-information/transfer/:transferId` — embeds transferId so we don't need a separate lookup. Production HIMS uses `/pushDataUrl/:tenantId`; our shape is cleaner. Confirm with lead. |
| 3 | **Consent-artefact JWS signature verification — sandbox vs staging.** | Reuse `consent-signature-verifier.ts` from M2 PR #86; M3 supplies a different artefact shape to canonicalize via JCS. Sandbox mode permissive (`signature_valid: false`); staging path is a TODO + follow-up issue (same as M2). |
| 4 | **Doctor identity in consent request `requester.{name, identifier}`.** Where does name come from? Identifier required? | `name` from better-auth session's `user.full_name`, non-empty/non-whitespace check only. **Production HIMS does not validate this field** — gateway accepts any readable string. `identifier` defaults to `{ type: 'REGNO', value: '<from tenant config or empty>', system: 'https://www.mciindia.org' }`; sandbox accepts empty value. Mark TODO if tenant config not yet plumbed. |
| 5 | **Bundle storage post-decrypt.** Where does the FHIR bundle go? | Write to `abdm_m3_data_transfers.bundle_json` JSONB initially. Emit `abdm.health-record.received` event for downstream Record Foundation projection. "Show to doctor" is a frontend sprint. Real path post-RF: drop `bundle_json` after RF projection commits. |
| 6 | **Multi-artefact consents.** One consent request → N artefacts. Fan out fetch + data-request per artefact, or batch? | Fan out per artefact — simpler, matches CM's notify shape (`consentArtefacts: [{id}, …]`). Each artefact gets its own data-fetch flow with its own `transferId`. Parallelism = N. |
| 7 | **HIP-side data response retry on dataPushUrl failure.** | 3 attempts × exponential backoff via timer rows (matches M2 add-contexts §4). After 3rd failure → `FAILED`, notify CM with `sessionStatus: FAILED, hiStatus: ERRORED`. 4xx after first retry skips remaining retries (don't repeatedly POST to misconfigured HIU). |
| 8 | **Idempotency window for `/pushDataUrl`.** Gateway/HIP may retry the bundle drop. | `INSERT INTO abdm_inbound_messages ON CONFLICT DO NOTHING` keyed on `(iq_tenant_id, transfer_id)` — not `request_id`, since the push is signed-by-HIP not gateway-keyed. |
| 9 | **OpenAPI extension granularity.** Extend single `specs/openapi/abdm-adapter.v1.yaml` or branch to M3 file? | Extend existing — keeps generated clients monolithic. Bump version minor (`1.x → 1.(x+1)`). |
| 10 | **`FideliusEncryptor.generateOurKeyMaterial()` port method.** Added during build-pack prep (this PR) to unblock HIU-side keypair generation. The HIU needs the private key persisted across minutes-to-hours of waiting for the HIP push; the existing `encryptForPeer`/`encryptBundles` methods drop `ourPrivateKey` in the data-access wrapper. | Method added at `ports.ts:259-275` + impl at `data-access/fidelius.ts`. Returns `{ourPublicKey, ourPrivateKey, ourNonce}` (all base64). **Caller MUST encrypt `ourPrivateKey` via `PayloadEncryptor.encrypt()` before persisting in `abdm_m3_data_transfers.hiu_private_key_jwk`.** Review the shape with security before merging — the private-key handover is the most security-sensitive piece of M3. |

Each item appears in the PR description with the chosen default and a Yes/No "any objections?" prompt.

## 11.1 Production reference caveats — don't copy `hims/abdi-lims-backed` blindly

See [`11-m3-doc-vetting-notes.md`](./11-m3-doc-vetting-notes.md) for the full audit. Read it before copying any pattern from production's `milestone3Service.ts`, `callbackService.ts`, or `M3Session.ts`.

## 12. Port-out promise (durable execution target)

When this code eventually moves to durable execution ([`05-orchestration-target-durable-execution.md`](../integration-platform/05-orchestration-target-durable-execution.md)), here's what survives verbatim and what changes:

| Element | Phase 1 today | Durable execution port |
|---|---|---|
| Protocol DTOs (`packages/ts-sdk-abha/protocol/m3/*`) | TypeScript interfaces | **Unchanged** — workflow args / activity args |
| Per-flow context types (`use-cases/m3/<flow>/context.ts`) | TypeScript interface | **Unchanged** — workflow internal state |
| Per-flow state types | `M3_*_STATES` const arrays | **Unchanged** — used for status reporting only |
| Data-access ports (`AbdmAdapterDeps`) | Interface + Drizzle impl | **Unchanged** — wrapped as activities |
| Pure helpers (`lib/fidelius-crypto`, signature verifier, payload encryptor, data-push client) | Pure TS functions / classes | **Unchanged** — become activities |
| Use-case functions (`use-cases/m3/<flow>/*.ts`) | Take `(input, deps)` | Body becomes workflow body; `deps.gateway.post` becomes `await activity(…)` |
| REST handlers (`rest-handlers/m3/*.ts`) | Fastify route | Mostly unchanged; instead of calling use-case directly, signals the workflow |
| Atomic transitions (`deps.dataTransfers.patch`) | Postgres TX | Replaced by workflow-internal state writes |
| Timer rows (`awaiting_push_until`) | Polled by janitor worker | Replaced by `workflow.sleep()` |
| Mock harness (`scripts/m3/`, env flags) | Curl-driven local loop | Becomes integration-test input — Temporal test framework drives flows directly |

**90%+ survives verbatim.** The promise holds *only if* you keep use-cases pure, name your states, type your contexts per flow, and don't take shortcuts through globals or cross-port calls.

## Related

- [08-m3-flows.md](./08-m3-flows.md) — the M3 flow catalogue (read first)
- [10-m3-mock-harness-guide.md](./10-m3-mock-harness-guide.md) — env flags, 5-minute loop, troubleshooting
- [11-m3-doc-vetting-notes.md](./11-m3-doc-vetting-notes.md) — production HIMS divergences
- [ADR-0031 mock harness strategy](../../adr/0031-abdm-m3-mock-harness-strategy.md)
- [04-orchestration-phase-1-http-first.md §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical) — the nine portability rules
- [06-m2-dev-guide.md](./06-m2-dev-guide.md) — M2 patterns to mirror
- [02-m1-flows.md](./02-m1-flows.md) and [dev-guide.md](./dev-guide.md) — M1 patterns
- [docs/external/abdm/v3-m3-…](../../../external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md) — **the source spec** (8936 lines)
