# ABDM Adapter — M2 Dev Guide

> Self-contained checklist for the developer picking up the M2 sprint. Read this start-to-finish before opening a file. Assumes you've finished M1 — references M1 patterns rather than re-explaining them.

## 0. Prerequisites

- M1 is **merged on `dev`** (tip ≥ `c967b4d` as of 2026-05-19, ABHA verify in `1667c8c`). Branch off `dev`, not off the M1 PR branch.
- ABDM Sandbox credentials, same env keys as M1 (`ABDM_SANDBOX_CLIENT_ID` / `ABDM_SANDBOX_CLIENT_SECRET`).
- **`X-CM-ID`** and **`X-HIP-ID`** header values for the sandbox. `X-CM-ID` is fixed per environment (sandbox: `sbx`). `X-HIP-ID` is your facility's HIP id, registered in HFR. **`X-HIU-ID`** appears on inbound user-initiated-linking callbacks (gateway tells us *which* PHR app is asking) — you don't set it, you read it.
- **Callback URL.** ABDM gateway needs a public URL to POST inbound callbacks to. For local dev, use `ngrok http 3007` and register the public URL in the sandbox console under your facility's "callback URL" setting. Path is fixed: all `/api/v3/…` routes documented in [`05-m2-flows.md`](./05-m2-flows.md).
- Reference impl at `hims/abdi-lims-backed/src/services/milestone2*Service.ts` available locally. Useful for *which exact `on-*` response shape the sandbox accepts* and *what gateway error codes appear in practice*. **Do not copy structure** — the production service intermingles handlers and persistence; M2 here keeps the M1 typed-port layering.
- Postman: M2 sandbox collection (ask the lead — published separately from the M1 collection).

Reading order before code:

1. [`05-m2-flows.md`](./05-m2-flows.md) — flow catalogue (this guide assumes you've read it)
2. [`02-fsm-specifications.md §5`](../integration-platform/02-fsm-specifications.md#5-abdmm2user-initiated-linkv1----patient-links-from-phr-app) — canonical state machine for user-initiated-link
3. [`04-orchestration-phase-1-http-first.md`](../integration-platform/04-orchestration-phase-1-http-first.md) — **especially §11 Portability Rules**. Nine rules. Memorise them; PR review will check.
4. This file
5. `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md` — **the source spec.** Read §4 (HIP-initiated linking) and §5 (user-initiated linking) end-to-end before writing any handler. §6.3.1–§6.3.2 for the consent notify shape.

### Naming bridge — HLD 04 vocabulary vs. ABDM adapter directories

HLD 04 §8 sketches a future consolidated `services/integration-hub-svc/` with `flows/`, `activities/`, and `routes/` directories. M1 shipped under `modules/abdm-adapter/` with `use-cases/`, `lib/`, and `rest-handlers/` — because the integration-hub consolidation hasn't happened yet. **You stay in the M1 layout for M2.** The mapping is:

| HLD 04 §8 directory | Current ABDM adapter directory | What it holds |
|---|---|---|
| `flows/` | `modules/abdm-adapter/src/use-cases/` | One function per state transition / step |
| `activities/` | `modules/abdm-adapter/src/lib/` | Pure helpers — no DB, no flow state |
| `routes/` | `modules/abdm-adapter/src/rest-handlers/` | Fastify route registrations |
| `lib/` (cross-cutting) | `modules/abdm-adapter/src/lib/` (mixed) | Encryption, sessions repo wrappers, idempotency |

The portability rules apply to *function shapes* and *boundaries*, not directory names. When the integration-hub consolidation happens (post-Phase 1), a folder rename is the only move. Do not pre-empt it.

## 1. Familiarise with the spec

Read the M2 spec doc end-to-end before writing any code. For each of the five M2 flows in [`05-m2-flows.md`](./05-m2-flows.md), find in the spec:

- The **request body shape** for every endpoint (gateway → HIP *and* HIP → gateway).
- The **header set** — `REQUEST-ID`, `TIMESTAMP`, `Authorization`, `X-HIP-ID`, `X-CM-ID`. Some endpoints add `X-LINK-TOKEN` (hip-initiated-link) or `X-AUTH-TOKEN` (when a patient JWT is involved). Section 3.2 covers the auth header derivation.
- The **error code table** — codes `ABDM-1xxx` are M2-specific. Add new codes to [`packages/ts-sdk-abha/src/constants/error-codes.ts`](../../../../packages/ts-sdk-abha/src/constants/error-codes.ts).
- The **sequence diagrams** in §4.2 and §5.2 — these are the authoritative read for who-talks-to-whom-when.

When the v3 markdown spec disagrees with the wrapper YAML, **the v3 markdown wins** — the wrapper is a downstream facade.

## 2. Populate protocol DTOs (`packages/ts-sdk-abha/src/protocol/m2/`)

The scaffold files exist with `export {}` placeholders. Fill them in this order:

1. **`discovery.ts`** — `DiscoveryRequest` (inbound, §5.3.2) + `OnDiscoverRequest` (outbound to gateway, §5.3.3). Includes `transactionId`, `patient[]`, `careContexts[]`, `hiType`, `count`, `error?`. **This is the most-touched flow shape; nail it first.**
2. **`link-init.ts`** — `LinkInitRequest` (inbound, §5.3.6) + `OnLinkInitRequest` (outbound, §5.3.7). Includes `link.referenceNumber`, `link.authenticationType`, `link.meta.{communicationMedium, communicationHint, communicationExpiry}`.
3. **`link-confirm.ts`** — `LinkConfirmRequest` (inbound, §5.3.10 has `confirmation.token` + `confirmation.linkRefNumber`). The HIP responds inline (HTTP body, not a separate `on-confirm` POST) per §5.3.11 — verify in spec, the doc strongly implies the HIP response is in the HTTP body of §5.3.10's callback handler.
4. **`hip-initiated-link.ts`** — **new file**. Just one pair of types (token-generation lives in `link-token.ts`, see #4b):
   - `LinkCareContextRequest` (HIP outbound, §4.3.3) — `patient[]` with `careContexts[]`, `hiType`, `count`. Requires `X-LINK-TOKEN` header (read from cache, see §4.6).
   - `OnLinkCareContextCallback` (gateway inbound, §4.3.4) — `status` enum + optional `error`.

4b. **`link-token.ts`** — **new file** for the per-patient link-token cache helper (NOT a flow). See [`05-m2-flows.md §2.1`](./05-m2-flows.md#21-link-token-cache-per-patient-ephemeral--a-helper-not-a-flow):
   - `GenerateTokenRequest` (HIP outbound, §4.3.1) — `abhaAddress`, `name`, `gender`, `yearOfBirth`. Used only by `lib/link-token-cache.ts` internally; **not** by hip-initiated-link use-cases directly.
   - `OnGenerateTokenCallback` (gateway inbound, §4.3.2) — `linkToken` JWT. Handled by the cache's callback handler (UPSERTs the row), **not** as a flow transition.
5. **`consent-notify.ts`** — `ConsentNotifyRequest` (inbound, §6.3.1) — full consent artefact. Export `ConsentArtefact` type for repo use. `OnConsentNotifyRequest` (outbound ack, §6.3.2).
6. **`care-context-publish.ts`** — `AddContextsRequest` (outbound, §4.3.6) — `notification.{patient, careContext, hiTypes, date, hip}`. `OnAddContextsCallback` (inbound ack, §4.3.7).
7. **`sms-notify.ts`** — *optional*. `SmsNotifyRequest` (outbound, §4.3.8) — `notification.{phoneNo, hip}`. `OnSmsNotifyCallback` (inbound ack, §4.3.9).

Each file exports interfaces, not classes. Suffix with `Request` for the wire shape, `Callback` for inbound-after-our-outbound. Match `protocol/m1/*.ts` for casing.

Shared inbound headers go into a single `protocol/common/inbound-gateway-headers.ts` — reuse, don't repeat per endpoint:

```ts
export interface InboundGatewayHeaders {
  'request-id': string;             // gateway-issued UUID
  timestamp: string;                // ISO-8601
  'x-cm-id': string;
  'x-hip-id'?: string;              // present on most HIP inbound; absent on some
  'x-hiu-id'?: string;              // present on user-initiated linking inbound
  authorization?: string;           // sandbox: optional; staging+: required signature
}
```

## 3. Per-flow typed context — **the portable shape**

This is the one new pattern for M2. M1 used `Record<string, unknown>` for `AbdmSession.context`; that was OK for one milestone but doesn't scale. For M2, **introduce a per-flow context type** and a generic `AbdmSession<F>`.

### What changes in `modules/abdm-adapter/src/domain/session.ts`

Make `AbdmSession` generic over `flowKind`, with two type maps:

```ts
export interface FlowContextMap {
  // M1 (existing, retroactively typed)
  'abdm.m1.aadhaar-otp.v1': M1AadhaarOtpContext;
  'abdm.m1.mobile-otp.v1': M1SimpleOtpContext;
  'abdm.m1.login.v1': M1LoginContext;
  'abdm.m1.verify-existing.v1': M1VerifyExistingContext;
  // M2 (NEW)
  'abdm.m2.user-initiated-link.v1': M2UserLinkContext;
  'abdm.m2.hip-initiated-link.v1': M2HipLinkContext;
  'abdm.m2.consent-notify.v1': M2ConsentNotifyContext;
  'abdm.m2.add-contexts.v1': M2AddContextsContext;
  'abdm.m2.sms-notify.v1': M2SmsNotifyContext;
}

export interface FlowStateMap {
  'abdm.m1.aadhaar-otp.v1': M1AadhaarOtpState;
  // ... existing M1 entries
  'abdm.m2.user-initiated-link.v1': M2UserLinkState;
  'abdm.m2.hip-initiated-link.v1': M2HipInitiatedLinkState;
  'abdm.m2.consent-notify.v1': M2ConsentNotifyState;
  'abdm.m2.add-contexts.v1': M2AddContextsState;
  'abdm.m2.sms-notify.v1': M2SmsNotifyState;
}

export interface AbdmSession<F extends AbdmFlowKind = AbdmFlowKind> {
  iqTenantId: string;
  sessionId: string;
  flowKind: F;
  state: FlowStateMap[F];
  txnId: string | null;
  requestId: string | null;
  xToken: string | null;
  tToken: string | null;
  context: FlowContextMap[F];
  createdAt: Date;
  updatedAt: Date;
}
```

Each context type lives next to its flow's use-cases (`use-cases/m2/<flow-name>/context.ts`). Example for hip-initiated-link:

```ts
// modules/abdm-adapter/src/use-cases/m2/hip-initiated-link/context.ts
export interface M2HipLinkContext {
  abhaAddress: string;
  abhaNumber?: string;
  patientName: string;
  careContexts: Array<{                      // set at INIT from staff UI
    referenceNumber: string;
    display: string;
    hiType: 'OPCONSULTATION' | 'PRESCRIPTION' | 'DIAGNOSTICREPORT' | 'DISCHARGESUMMARY' | 'IMMUNIZATIONRECORD' | 'HEALTHDOCUMENTRECORD' | 'WELLNESSRECORD';
  }>;
  ccLinkRequestId?: string;                  // set at CC_LINK_REQUESTED
  error?: { code: string; message: string };
}
```

Note: `linkToken` is **not** in `M2HipLinkContext`. The token is a cached credential owned by the link-token manager (§4.6 below), not flow state. The use-case reads it on demand at the moment of the outbound `link/carecontext` call.

Use-cases now take a typed session:

```ts
const session = await deps.sessions.findById<'abdm.m2.hip-initiated-link.v1'>({
  iqTenantId, sessionId,
});
// session.context is M2HipLinkContext, session.state is M2HipInitiatedLinkState — IntelliSense surfaces all fields
```

The repo implementation does **not change** at runtime — it still reads/writes JSON. The generic is **type-only**: `findById<F>` casts the row after returning. Add a runtime guard once (`assertFlowKind(session, expectedFlow)`) that throws if `session.flowKind` doesn't match — defends against bad URLs or accidentally loading the wrong session.

### Why this matters for the durable-execution port

When the flow body eventually becomes a Temporal workflow function, its signature is `(args: TArgs) → Promise<TResult>` with private mutable `context: FlowContextMap[F]` and `state: FlowStateMap[F]`. **The types are identical** — the use-case body becomes the workflow body almost verbatim. Investing in the typed shape now saves a translation pass later.

## 4. Implement data-access additions (`modules/abdm-adapter/src/data-access/`)

### 4.1 `abdm-inbound-messages.repo.ts` (new)

Dedupe table for inbound webhooks. Schema:

```sql
CREATE TABLE abdm_adapter.abdm_inbound_messages (
  iq_tenant_id  uuid NOT NULL,
  request_id    text NOT NULL,
  flow_kind     text NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (iq_tenant_id, request_id)
);
SELECT create_distributed_table('abdm_adapter.abdm_inbound_messages', 'iq_tenant_id');
```

Single method: `insertIfNew(iqTenantId, requestId, flowKind) → boolean`. Returns true if it was inserted, false if duplicate. Implementation: `INSERT … ON CONFLICT DO NOTHING RETURNING request_id` and check `rowCount`.

### 4.2 `abdm-consent-artefacts.repo.ts` (new)

Persist consent artefact verbatim plus indexed fields. Schema:

```sql
CREATE TABLE abdm_adapter.abdm_consent_artefacts (
  iq_tenant_id      uuid NOT NULL,
  consent_id        text NOT NULL,
  patient_id        uuid NOT NULL,
  hip_id            text NOT NULL,
  hiu_id            text NOT NULL,
  status            text NOT NULL,                    -- 'GRANTED' | 'REVOKED'
  data_erase_at     timestamptz NOT NULL,
  granted_at        timestamptz NOT NULL,
  artefact_json     jsonb NOT NULL,                   -- full unflattened consent body
  signature         text NOT NULL,
  signature_valid   boolean NOT NULL DEFAULT false,
  received_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (iq_tenant_id, consent_id)
);
SELECT create_distributed_table('abdm_adapter.abdm_consent_artefacts', 'iq_tenant_id');
CREATE INDEX ix_abdm_consent_patient ON abdm_adapter.abdm_consent_artefacts (iq_tenant_id, patient_id);
CREATE INDEX ix_abdm_consent_data_erase ON abdm_adapter.abdm_consent_artefacts (data_erase_at) WHERE status = 'GRANTED';
```

Methods: `upsert(artefact)`, `findById(iqTenantId, consentId)`. **No partial updates** — status changes are tracked via state machine, not column flipping.

### 4.3 Extend `gateway-client.http.ts`

Add **two** methods for M2:

- `postGateway(input)` — same as M1's `post` but targets `ABDM_GATEWAY_BASE_URL` (not `ABDM_ABHA_API_BASE_URL`). M2 outbound calls go to the gateway base, not the ABHA API base.
- `postWithLinkToken(input)` — adds the `X-LINK-TOKEN` header for hip-initiated-link's `/api/hiecm/hip/v3/link/carecontext`. **The token is read from the link-token cache (§4.6), not from session context.**

### 4.4 EMPI HTTP client (new)

`empi-client.http.ts` — implements `EmpiClient`:

```ts
findPatientByAbhaAddress(input: { iqTenantId, abhaAddress }): Promise<{ patientId, demographics } | null>
findPatientByDemographics(input: {
  iqTenantId, identifiers: Array<{ type: string; value: string }>
}): Promise<{ patientId, score } | null>
```

Endpoint: `EMPI_BASE_URL` env var, `GET /api/v1/patients/find?…`. Service-account JWT in `Authorization`. **Do not** inline EMPI HTTP calls inside use-cases (rule 2 in [HLD 04 §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical)) — they go through this client.

### 4.5 Record Foundation HTTP client (new)

`record-foundation-client.http.ts` — implements `RecordFoundationClient`:

```ts
listUnlinkedCareContexts(input: { iqTenantId, patientId }): Promise<CareContext[]>
markCareContextLinked(input: { iqTenantId, careContextId }): Promise<void>
```

Endpoint: `RECORD_FOUNDATION_BASE_URL`. Same service-account JWT.

### 4.6 Link Token Cache (new) — **the per-patient ephemeral helper**

A small cache for the link tokens that authorise `link/carecontext` calls. See [`05-m2-flows.md §2.1`](./05-m2-flows.md#21-link-token-cache-per-patient-ephemeral--a-helper-not-a-flow) for the architectural rationale. **The hip-initiated-link flow does NOT manage tokens** — it calls `linkTokenCache.getOrAcquire(abha, demographics)` and gets a string back.

Key principles:

- **Keyed by patient ABHA address, not tenant.** The JWT's `sub` claim is the patient; the credential's natural key is the patient. There is no `iq_tenant_id` column.
- **Citus reference table** (no distribution), small and high-churn.
- **No background refresh worker.** TTL is too short (<15min); pre-warming for unknown patients is pointless. Acquisition is on-demand.

Components:

1. **`abdm-link-tokens.repo.ts`** (new) — Drizzle repo for `abdm_adapter.abdm_link_tokens`:

   ```sql
   CREATE TABLE abdm_adapter.abdm_link_tokens (
     abha_address        text PRIMARY KEY,         -- patient's ABHA address
     link_token          text NOT NULL,            -- encrypted via lib/payload-encryptor
     expires_at          timestamptz NOT NULL,
     obtained_at         timestamptz NOT NULL DEFAULT now(),
     pending_request_id  text                      -- present while generate-token is in flight
   );
   SELECT create_reference_table('abdm_adapter.abdm_link_tokens');
   ```

   Methods:
   - `findFresh(abhaAddress): Promise<{ linkToken: string; expiresAt: Date } | null>` — returns null if absent or expiring within 60s.
   - `claimAcquisition(abhaAddress, requestId): Promise<boolean>` — INSERT a stub row with `pending_request_id`; returns false if another acquisition is already in flight.
   - `completeAcquisition(abhaAddress, encryptedToken, expiresAt): Promise<void>` — UPSERT the real token (called by the callback handler).
   - `invalidate(abhaAddress): Promise<void>` — DELETE.
   - `janitor(): Promise<number>` — `DELETE WHERE expires_at < now()`; called on a 5-minute timer.

2. **`lib/link-token-cache.ts`** (new) — the helper used by use-cases:

   ```ts
   export class LinkTokenNotAvailable extends Error {}

   export interface LinkTokenAcquireInput {
     abhaAddress: string;
     abhaNumber?: string;
     name: string;                              // pipe-separated First | Middle | Last
     gender: 'M' | 'F' | 'O' | 'D';
     yearOfBirth: number;
     timeoutMs?: number;                        // default 8000
   }

   export async function getOrAcquire(
     input: LinkTokenAcquireInput,
     deps: { linkTokens: LinkTokenRepo; gateway: GatewayClient; encryptor: PayloadEncryptor },
   ): Promise<string> {
     // 1. fast path: cache hit
     const cached = await deps.linkTokens.findFresh(input.abhaAddress);
     if (cached) return deps.encryptor.decrypt(cached.linkToken);

     // 2. miss: claim, post generate-token, poll
     const requestId = randomUUID();
     const claimed = await deps.linkTokens.claimAcquisition(input.abhaAddress, requestId);
     if (!claimed) {
       // someone else is acquiring; just poll
     } else {
       await deps.gateway.postGenerateToken({
         requestId,
         body: { abhaAddress: input.abhaAddress, abhaNumber: input.abhaNumber,
                 name: input.name, gender: input.gender, yearOfBirth: input.yearOfBirth },
       });
     }

     // 3. poll the cache up to timeoutMs
     const deadline = Date.now() + (input.timeoutMs ?? 8000);
     while (Date.now() < deadline) {
       await sleep(200);
       const row = await deps.linkTokens.findFresh(input.abhaAddress);
       if (row) return deps.encryptor.decrypt(row.linkToken);
     }
     await deps.linkTokens.invalidate(input.abhaAddress);    // clean up stub row
     throw new LinkTokenNotAvailable();
   }
   ```

3. **`use-cases/m2/link-token/handle-token-callback.ts`** (new) — handles inbound `on-generate-token` (§4.3.2). Signature: `(input: OnGenerateTokenCallback, deps) → Promise<void>`. Logic:
   - Extract `abhaAddress` and `linkToken` from the body.
   - Decode the JWT to read `exp` → `expiresAt`.
   - Encrypt the token via `lib/payload-encryptor`.
   - Call `deps.linkTokens.completeAcquisition(abhaAddress, encryptedToken, expiresAt)`.
   - **No flow transition** — the cache UPSERT IS the side effect. The waiting `getOrAcquire` will pick this up via its poll.

4. **REST handler for inbound callback:** `rest-handlers/m2/link-token-routes.ts` registers `POST /api/v3/hip/token/on-generate-token`. Standard dedupe sandwich; invokes `handle-token-callback`.

5. **Timer kind: `link-token-janitor`** — a tiny 5-minute periodic timer that calls `linkTokens.janitor()` to delete expired rows. Doesn't generate, doesn't refresh — just cleans.

**This entire component is invisible to the hip-initiated-link use-cases.** They call `linkTokenCache.getOrAcquire(…)` and get a string or an exception.

### 4.7 Signature verifier (new, in `lib/`)

`lib/abdm-signature-verifier.ts` — verifies JWS signatures on inbound gateway callbacks against the gateway's public key.

- **Sandbox:** `verify()` always returns `true` (signature verification is permissive). Add a `// TODO(staging): real JWS verification` marker.
- **Staging/production:** fetch the gateway's public key from §3.2.3's keycloak certificate endpoint (`/api/hiecm/gateway/v3/.well-known/openid-configuration` → `jwks_uri`). Cache it for the JWKS TTL. Verify the `Authorization` header is a JWS over the body using one of the published keys.

Implement only the sandbox path for this sprint. The staging path is a follow-up issue — flag in PR.

## 5. Implement use-cases (`modules/abdm-adapter/src/use-cases/m2/`)

Folder structure — group by flow once a milestone has >1 entry-point pair:

```
modules/abdm-adapter/src/use-cases/m2/
  user-initiated-link/
    context.ts                       # M2UserLinkContext
    handle-discover-callback.ts      # inbound discover → resolve EMPI → list contexts → post on-discover
    handle-link-init-callback.ts     # inbound link/init → generate linkRefNumber + dispatch OTP → post on-init
    handle-link-confirm-callback.ts  # inbound link/confirm → verify OTP → mark linked → post on-confirm inline
    finalise-link.ts                 # PATCH Record Foundation, transition LINKED
    *.test.ts
  hip-initiated-link/
    context.ts                       # M2HipLinkContext (NO linkToken field — token from cache)
    start.ts                         # staff UI POST → read cached link token → outbound link/carecontext
    handle-link-callback.ts          # inbound on_carecontext → success/failure
    *.test.ts
  link-token/                        # PER-PATIENT EPHEMERAL CACHE — NOT a flow
    handle-token-callback.ts         # inbound on-generate-token → UPSERT cache row keyed by abha_address
    *.test.ts
    # (no refresh.ts — acquisition is on-demand via lib/link-token-cache.ts; no background worker)
  consent-notify/
    context.ts                       # M2ConsentNotifyContext
    handle-consent-notify-callback.ts # inbound notify → verify signature → persist artefact → ack
    *.test.ts
  add-contexts/
    context.ts                       # M2AddContextsContext
    publish.ts                       # consumes record-foundation.care-context.created event → outbound notify
    handle-on-notify-callback.ts     # inbound on-notify → completed/failed
    *.test.ts
  sms-notify/                        # OPTIONAL
    context.ts
    request.ts                       # outbound sms/notify2
    handle-on-notify-callback.ts
    *.test.ts
```

Use-case function shape (unchanged from M1):

```ts
export async function handleDiscoverCallback(
  input: AbdmTenantInput<DiscoveryRequest>,
  deps: AbdmAdapterDeps,
): Promise<DiscoverCallbackResponse> { … }
```

Discipline (rules from [HLD 04 §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical)):

- **No direct DB writes** — only `deps.sessions`, `deps.inboundMessages`, `deps.consentArtefacts`.
- **No direct outbound HTTP** — only `deps.gateway`, `deps.empi`, `deps.recordFoundation`.
- **Atomic transitions only** via `deps.sessions.patch({ state, contextMerge, txnId? })`. No two-write sequences without surrounding TX.
- **Named state strings** — always from `M2_*_STATES` consts, never literals.
- **One transition per handler** — a single use-case function changes the state once. If you need two transitions (e.g., `DISCOVERY_RECEIVED` → `PATIENT_MATCHED` → `CONTEXTS_LISTED`), split into two use-cases; the second is invoked synchronously by the first.

## 6. Wire REST handlers (`modules/abdm-adapter/src/rest-handlers/m2/`)

One file per flow folder. Each inbound handler does **exactly four things**:

```ts
app.post(
  "/api/v3/hip/patient/care-context/discover",       // public callback URL path — must match what's registered with ABDM
  { schema: { body: discoveryRequestSchema, headers: inboundGatewayHeadersSchema } },
  async (req, reply) => {
    // 1. Verify signature (sandbox: always returns true; staging: real JWS check)
    const signatureValid = await verifyAbdmSignature(req.headers, req.body);
    if (!signatureValid) return reply.code(401).send({ error: { code: "ABDM-1411", message: "invalid-signature" } });

    // 2. Idempotency check — duplicate → 202 immediately
    const isNew = await deps.inboundMessages.insertIfNew({
      iqTenantId: req.tenantId,
      requestId: req.headers['request-id'] as string,
      flowKind: 'abdm.m2.user-initiated-link.v1',
    });
    if (!isNew) return reply.code(202).send();

    // 3. Schedule async on-discover post (or run inline for Phase 1 sandbox)
    await handleDiscoverCallback({ iqTenantId: req.tenantId, ...req.body }, deps);

    // 4. Return 202 — gateway expects this fast
    return reply.code(202).send();
  },
);
```

Handler is ≤50 LOC. If it grows beyond that, the work belongs in the use-case (rule 1 in HLD 04 §11).

**Route URL convention:** the inbound paths must match exactly what the spec says (`/api/v3/hip/...`, `/api/v3/hiu/...`, `/api/v3/links/...`, `/api/v3/consent/...`, `/api/v3/patients/...`). These are the paths gateway POSTs to your `callbackURL`. Do **not** prefix with `/api/abdm/v1/`.

## 7. Idempotency for inbound webhooks

Every inbound callback gets the dedupe sandwich:

```sql
INSERT INTO abdm_inbound_messages (iq_tenant_id, request_id, flow_kind)
VALUES ($1, $2, $3)
ON CONFLICT (iq_tenant_id, request_id) DO NOTHING
RETURNING request_id;
```

Zero rows ⇒ duplicate ⇒ return 202 and stop. **Do not** skip this — the gateway retries with the same `REQUEST-ID` and will deliver the same callback 2-3 times under load.

For outbound posts that fail mid-flight (e.g., gateway is briefly unreachable), **do not auto-retry inside the use-case**. Update state to a `*_PENDING_ON_RETRY` shape and schedule a timer (see [`04-orchestration-phase-1-http-first.md §6`](../integration-platform/04-orchestration-phase-1-http-first.md#6-timer-worker)). The worker picks it up.

## 8. Tests

- **Unit tests** for every use-case using a fake `AbdmAdapterDeps` — same pattern as M1. Tests live next to use-cases as `*.test.ts`.
- **Idempotency test** per inbound handler: same `REQUEST-ID` twice → second returns 202 with no DB writes.
- **Per-flow integration test** against the sandbox, gated behind `RUN_ABDM_SANDBOX_TESTS=1`:
  - `m2-user-initiated-link.sandbox.integration.test.ts` — simulate three inbound callbacks via local POST; assert state arrives at `LINKED`.
  - `m2-hip-initiated-link.sandbox.integration.test.ts` — drive outbound + inbound chain via the sandbox.
  - `m2-consent-notify.sandbox.integration.test.ts` — POST a synthetic consent notify; assert artefact persisted + ack posted.
- **Signature verification test** — gated test that exercises the staging path against the sandbox JWKS endpoint. Add a `RUN_ABDM_SIGNATURE_TESTS=1` env gate; ship the sandbox-only path for now and mark the staging code path with `// TODO(staging)`.
- **Schema integrity** — snapshot test against `drizzle-kit generate` for the new tables, same as M1.

## 9. Local run

```bash
# Apply migrations
psql "$DATABASE_URL" -f modules/abdm-adapter/migrations/0001_abdm_adapter_m2_schema.sql

# Start the service
npx nx run abdm-adapter-svc:serve
# Listens on :3007.

# Expose to ABDM sandbox
ngrok http 3007
# Take the public URL (e.g., https://abc123.ngrok.io); set it as your facility's callback URL in the sandbox console.
# All M2 inbound paths must resolve under this URL: /api/v3/hip/..., /api/v3/links/..., /api/v3/consent/..., /api/v3/patients/...

# Smoke a synthetic inbound discover (no real ABDM involvement)
curl -X POST http://localhost:3007/api/v3/hip/patient/care-context/discover \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: <tenant-uuid>' \
  -H 'request-id: 11111111-1111-1111-1111-111111111111' \
  -H 'timestamp: 2026-05-19T10:00:00Z' \
  -H 'x-cm-id: sbx' -H 'x-hip-id: <your-hip-id>' \
  -d @docs/external/abdm/samples/m2-discover-request.json
```

(If `samples/m2-discover-request.json` doesn't exist yet, lift one from the Postman collection's example response and commit it under that path.)

## 10. Commit checklist before opening the PR

- All four mandatory flows: DTOs populated, use-cases populated, inbound REST handlers wired, outbound posters wired.
- `abdm_inbound_messages` and `abdm_consent_artefacts` migrations applied locally.
- Per-flow typed context in `domain/session.ts` working; `findById<F>()` IntelliSense surfaces the right `context` shape.
- `pnpm -F @hims/ts-sdk-abha build` clean.
- `npx nx run abdm-adapter:lint` and `npx nx run abdm-adapter:test` clean.
- One sandbox happy-path test passing locally per mandatory flow (gated, not in CI).
- New event publishers wired: `abdm.consent.granted`, `abdm.care-context.linked`, `abdm.care-context.published`.
- PR description includes:
  - which inbound callbacks have been exercised end-to-end vs. mocked
  - the ngrok URL pattern you used (so reviewer can repeat)
  - explicit "Phase 1 portability rules followed" callout linking [HLD 04 §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical)
  - the spec §X.Y.Z citations for any non-obvious body shapes you implemented

## 11. Open questions — surface in PR description, do not silently resolve

- **Signature verification.** Sandbox is permissive; staging requires JWS verification using the gateway's published JWKS. Ship the sandbox stub for this sprint; **file a follow-up issue** for the staging path with a target date before any production tenant uses M2. Source: spec §3.2.3.
- **EMPI demographic matching.** What's the score threshold for "match" vs "no match"? Default to ≥ 0.85 and surface this — confirm with EMPI owner.
- **Link Token Cache TTL window.** Spec doesn't pin the exact JWT TTL; observed in production HIMS is "<15min." Decode the JWT `exp` claim and use it directly — don't hardcode 15min. Surface the observed value in PR for the record.
- **Multi-instance behaviour of `getOrAcquire`.** When two instances simultaneously cache-miss for the same patient, one's `claimAcquisition` wins (PK constraint), the other polls. Confirm under load test before staging — single-Postgres serialisation should be sufficient but verify.
- **Care-context publish trigger.** Which Record Foundation event do you consume? Coordinate with the Record Foundation owner — the event name `record-foundation.care-context.created` is a *proposal*; confirm before wiring.
- **Inbound message log retention.** How long do we keep `abdm_inbound_messages` rows? Default to 30 days with a janitor; flag for ops review.
- **Add-contexts retry.** Three attempts × exponential backoff per [`05-m2-flows.md §4`](./05-m2-flows.md#4-abdmm2add-contextsv1). DLQ shape: post-Phase 1; for now, log + alert on third failure.
- **SMS-notify** — implement or defer? Confirm with product before adding to scope.

## 12. Port-out promise (durable execution target)

When this code eventually moves to durable execution ([`05-orchestration-target-durable-execution.md`](../integration-platform/05-orchestration-target-durable-execution.md)), here's what survives verbatim and what changes:

| Element | Phase 1 today | Durable execution port |
|---|---|---|
| Protocol DTOs (`packages/ts-sdk-abha/protocol/m2/*`) | TypeScript interfaces | **Unchanged** — workflow args / activity args |
| Per-flow context types (`use-cases/m2/<flow>/context.ts`) | TypeScript interface | **Unchanged** — workflow internal state |
| Per-flow state types | `M2_*_STATES` const arrays | **Unchanged** — used for status reporting only |
| Data-access ports (`AbdmAdapterDeps`) | Interface + Drizzle impl | **Unchanged** — wrapped as activities |
| Pure helpers (`lib/m2-*.ts`, signature verifier, payload encryptor) | Pure TS functions | **Unchanged** — become activities |
| Use-case functions (`use-cases/m2/<flow>/*.ts`) | Take `(input, deps)` | Body becomes workflow body; `deps.gateway.post` becomes `await activity(…)` |
| REST handlers (`rest-handlers/m2/*.ts`) | Fastify route | Mostly unchanged; instead of calling use-case directly, signals the workflow |
| Atomic transitions (`deps.sessions.patch`) | Postgres TX | Replaced by workflow-internal state writes |
| Timer rows | Polled by worker | Replaced by `workflow.sleep()` |

**90%+ survives verbatim.** The promise holds *only if* you keep use-cases pure, name your states, type your contexts per flow, and don't take shortcuts through globals or cross-port calls.

## Related

- [05-m2-flows.md](./05-m2-flows.md) — the M2 flow catalogue (read first)
- [04-orchestration-phase-1-http-first.md §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical) — the nine portability rules
- [02-m1-flows.md](./02-m1-flows.md) and [dev-guide.md](./dev-guide.md) — M1 patterns to mirror
- [02-fsm-specifications.md §5–§8](../integration-platform/02-fsm-specifications.md) — canonical M2/M3 state machines (note: only user-initiated-link is currently in §5; the rest of M2 is in [05-m2-flows.md](./05-m2-flows.md) until the FSM doc is updated)
- [docs/external/abdm/v3-m2-…](../../../external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md) — **the source spec** (12k lines). All body shapes here are grounded in this doc.
