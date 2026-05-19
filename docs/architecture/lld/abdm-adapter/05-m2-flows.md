# ABDM Adapter — LLD §05 M2 Flows

The second sprint covers **M2** — care-context linking and consent reception. M2 is the milestone where the platform stops being purely outbound and becomes a **webhook target** for the ABDM gateway.

This doc is the flow catalogue. The companion [`06-m2-dev-guide.md`](./06-m2-dev-guide.md) is the developer checklist (read it after this one).

---

## What's new in M2 vs. M1

M1 was 100% outbound from the platform's side. M2 introduces three new structural concepts:

1. **Inbound gateway webhooks.** The ABDM gateway POSTs to *us* (the HIP). We must accept the call and respond with the spec-defined status code quickly — **per spec, some endpoints respond `200 OK`, others `202 Accepted`** (see each endpoint's section in the spec doc). Sandbox is permissive in practice and tolerates `202` universally, but **code to the spec value and assert it in the integration test** rather than relying on sandbox tolerance. Long-running work runs asynchronously after the response.
2. **Outbound `on-*` callbacks paired with inbound requests.** A typical M2 flow alternates direction: inbound `discover` from gateway → outbound `on-discover` from HIP → inbound `link/init` from gateway → outbound `on-init` from HIP. Each step is correlated by `REQUEST-ID`/`transactionId`.
3. **Idle waiting states.** A flow may sit in a state for minutes (waiting for the patient to type an OTP in their PHR app) with no platform-side activity. The session row is the durable record; there is no in-memory continuation.

This is the dividing line between M1 and M2.

**Source spec (extracted to repo):** [`docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`](../../../external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md) — 12k lines. **Read it.** Every endpoint, header, and field below is grounded in a specific section (§X.Y.Z) of this doc; cite the section in your PR when the body shape isn't obvious.

**State diagrams in [`02-fsm-specifications.md §5`](../integration-platform/02-fsm-specifications.md#5-abdmm2user-initiated-linkv1----patient-links-from-phr-app)** are authoritative for `abdm.m2.user-initiated-link.v1`. Hip-initiated linking, consent-notify, add-contexts, and SMS-notify are documented in §1–§5 of *this* file; the FSM spec doc will be updated to include them as a follow-up.

**Reference impl:** `hims/abdi-lims-backed/src/services/milestone2*Service.ts` in the production HIMS. The exact files (verify locally — names may have drifted): `milestone2HipInitiatedService.ts`, `milestone2UserInitiatedService.ts`, `milestone2ConsentService.ts`. Useful for *which exact on-\* response shape works in the sandbox* and *which gateway error codes you'll see in practice*. **Do not copy code structure** — the production HIMS uses Mongo + ad-hoc handlers; M2 here keeps the M1 typed-port layering.

---

## M2 flow taxonomy

| Flow ID | Triggered by | Span | Terminal | Has OTP? |
|---|---|---|---|---|
| `abdm.m2.user-initiated-link.v1` | Patient picks our facility in their PHR app | minutes | `LINKED` / `NO_MATCH` / `FAILED` | Yes — OTP from HIP to patient mobile |
| `abdm.m2.hip-initiated-link.v1` | Hospital staff links records for a known patient | seconds-to-minutes | `LINKED` / `FAILED` | **No** — link token authorizes |
| `abdm.m2.consent-notify.v1` | Gateway notifies HIP of a granted consent | seconds | `ACKED` / `FAILED` | No |
| `abdm.m2.add-contexts.v1` | Internal event: new visit recorded for a linked patient | seconds | `COMPLETED` / `FAILED` | No |
| `abdm.m2.sms-notify.v1` | Internal event: notify patient by SMS about linking | seconds | `ACKED` / `FAILED` | No |

The first two are the linking flows. The third is the consent-receipt half of the larger M3 picture (full M3 record-serving is a later sprint). The fourth keeps already-linked patients' care contexts fresh. The fifth lets the HIP push SMS to patients via the gateway (used to nudge them to authorize a link).

---

## 1. `abdm.m2.user-initiated-link.v1`

### Patient experience

The patient opens their **PHR app** (e.g., NDHM, Eka.Care, Paytm Health) and types in or searches for "our facility" by name. The PHR app, acting as an **HIU**, asks the ABDM gateway: "Does this HIP have records for me?" The gateway forwards the question to us. We look up the patient in EMPI by their ABHA address (and demographic fallbacks) and Record Foundation for matching unlinked care contexts. We respond with a list of contexts that *could* be linked. The patient selects which ones; the gateway asks us to authenticate the patient (we send an OTP to the registered mobile); the patient enters the OTP in the PHR app; we confirm and link.

### Sequence

```
PHR App (HIU) → Gateway → HIP (us)        and reverse for on-* callbacks

  HIU  ──discover──▶  CM (gateway)  ──forward──▶  HIP
   ◀──── on-discover (HIP responds with careContexts)
  HIU  ──link/init──▶  CM           ──forward──▶  HIP
   ◀──── on-init (HIP responds with linkRefNumber + OTP delivery hint; OTP sent SMS-side)
  HIU  ──link/confirm──▶ CM         ──forward──▶  HIP (with OTP token)
   ◀──── on-confirm (HIP validates OTP, replies with linked careContexts)
```

### State diagram

```mermaid
stateDiagram-v2
  [*] --> DISCOVERY_RECEIVED: inbound on /care-context/discover
  DISCOVERY_RECEIVED --> PATIENT_MATCHED: EMPI match by ABHA address / demographics
  DISCOVERY_RECEIVED --> NO_MATCH: no EMPI match
  PATIENT_MATCHED --> CONTEXTS_LISTED: Record Foundation lists unlinked care contexts
  CONTEXTS_LISTED --> ON_DISCOVER_RESPONDED: outbound on-discover posted
  ON_DISCOVER_RESPONDED --> LINK_INIT_RECEIVED: inbound on /link/care-context/init
  LINK_INIT_RECEIVED --> OTP_DISPATCHED: outbound on-init posted; HIP sends OTP via SMS
  OTP_DISPATCHED --> LINK_CONFIRMED: inbound on /link/care-context/confirm with valid OTP
  LINK_CONFIRMED --> CONTEXTS_PUBLISHED: outbound on-confirm posted; care contexts marked linked
  CONTEXTS_PUBLISHED --> LINKED: Record Foundation patched, abdm.care-context.linked emitted
  NO_MATCH --> [*]
  LINKED --> [*]
  ON_DISCOVER_RESPONDED --> FAILED: gateway timeout (24h no link/init)
  OTP_DISPATCHED --> FAILED: invalid OTP / OTP expired
```

### Endpoint table

| # | Direction | Endpoint URL | Section | State transition |
|---|---|---|---|---|
| 1 | IN (gateway → HIP) | `POST {callback}/api/v3/hip/patient/care-context/discover` | §5.3.2 | `→ DISCOVERY_RECEIVED` |
| 1b | platform | EMPI `GET /api/v1/patients/find?abha_address=…` | — | `→ PATIENT_MATCHED` / `NO_MATCH` |
| 1c | platform | Record Foundation `GET /api/v1/timeline-index?patient_id=…&linked=false` | — | `→ CONTEXTS_LISTED` |
| 1d | OUT (HIP → gateway) | `POST /api/hiecm/user-initiated-linking/v3/patient/care-context/on-discover` | §5.3.3 | `→ ON_DISCOVER_RESPONDED` |
| 2 | IN (gateway → HIP) | `POST {callback}/api/v3/hip/link/care-context/init` | §5.3.6 | `→ LINK_INIT_RECEIVED` |
| 2b | OUT (HIP → gateway) | `POST /api/hiecm/user-initiated-linking/v3/link/care-context/on-init` | §5.3.7 | `→ OTP_DISPATCHED` |
| 3 | IN (gateway → HIP) | `POST {callback}/api/v3/hip/link/care-context/confirm` | §5.3.10 | `→ LINK_CONFIRMED` (respond `202 Accepted` immediately) |
| 3b | OUT (HIP → gateway) | `POST /api/hiecm/user-initiated-linking/v3/link/care-context/on-confirm` | §5.3.11 | `→ CONTEXTS_PUBLISHED` |
| 4 | platform | Record Foundation `PATCH /care-context/:id { abha_linkage_status: 'linked' }` | — | `→ LINKED` |

The confirm step is **two distinct calls**, not one with an inline response. The inbound `/confirm` callback returns `202 Accepted` to the gateway immediately (after dedupe + signature verify); the HIP then verifies the OTP and posts the result via a separate outbound `on-confirm` call carrying the linked `patient[]` array and `response.requestId` echoing the inbound REQUEST-ID. Same pattern as `on-discover`/`on-init`.

**Important:** The inbound paths (gateway → us) start with `/api/v3/hip/…` — these are the routes you mount on **your** Fastify app at the `callbackURL` you registered with ABDM. The outbound paths (us → gateway) start with `/api/hiecm/…` and are POSTed to `ABDM_GATEWAY_BASE_URL` (sandbox: `https://dev.abdm.gov.in`).

States used: [`M2_USER_LINK_STATES`](../../../../packages/ts-sdk-abha/src/constants/fsm-states.ts) — already declared, no additions needed.

### Correlation

- **External correlation:** `REQUEST-ID` header on each inbound; `transactionId` field in the request body (issued by gateway at discover, echoed through init and confirm). Both identify the same session.
- **Internal correlation:** `sessionId` (platform-issued UUID at `DISCOVERY_RECEIVED`). Every outbound `on-*` must echo `requestId` and `transactionId`.
- **Idempotency:** `INSERT INTO abdm_inbound_messages (iq_tenant_id, request_id) ON CONFLICT DO NOTHING`. If 0 rows inserted, return `202` immediately — the gateway is retrying.

### Failure modes

- **No matching patient.** Reply `on-discover` with **only** `transactionId`, `error: { code: "ABDM-1010", message: "Patient not found" }`, and `response.requestId` — **do not include a `patient` field** (spec §5.3.3 failure body omits it). Transition `→ NO_MATCH`. Terminal — do not error.
- **EMPI / Record Foundation unavailable.** Persist `DISCOVERY_RECEIVED`, schedule a retry timer, do not post `on-discover` until both resolve. If retries exhaust, transition `→ FAILED`.
- **Patient abandons after `on-discover`.** Gateway never sends `link/init`. Sweep via janitor after 24h, transition `→ FAILED`.
- **Wrong OTP at `link/confirm`.** Inbound confirm callback returns `202 Accepted`, then HIP posts outbound `on-confirm` with `error: { code, message }` and `response.requestId` — there is no inline error response. State stays at `OTP_DISPATCHED`; patient can retry from PHR app (gateway will resend a fresh `confirm`).

---

## 2. `abdm.m2.hip-initiated-link.v1`

### Staff experience

Hospital staff at the registration desk (or after a visit) **already knows the patient's ABHA address** — typically from the patient's printed ABHA card, or because the staff did an M1 verify-existing earlier. Staff clicks "Link records to ABHA" in the platform UI. The platform sends the list of care contexts to link to the gateway; the gateway validates and acknowledges. **There is no OTP step** in this flow.

### Decoupling note — link token is NOT a state in the flow

Spec §4.3.1/§4.3.2 documents a short-lived JWT **link token** that authorises `link/carecontext`. **Production HIMS keeps token generation inline as a state of every linking flow; we explicitly do not.** The token is a **per-patient ephemeral credential** with no relationship to tenants or workflows — it belongs to a small cache that the linking use-case consults transparently. The linking flow's state machine has no `TOKEN_*` state.

Rationale:

- **The token is a credential, not a workflow.** Per spec §4.3.2 the JWT's `sub` claim is the patient's ABHA address; the token is scoped to (HIP, patient). It does not represent a user-facing or business outcome. Credentials belong in caches, not state machines.
- **Nothing about it is tenant-shaped.** Tenant is a deployment dimension; the token's natural identity is the patient. Coupling the token to tenant adds noise to the data model.
- **Linking should feel synchronous to staff.** A `TOKEN_REQUESTED → TOKEN_RECEIVED` waiting state would expose plumbing as a user-visible flow milestone.
- **Token-gen still happens.** It's just hidden behind a `linkTokenCache.getOrAcquire(abha, demographics)` helper that returns a string. Cache hit → instant. Cache miss → triggers generate-token, awaits the callback, returns. Helper has its own short timeout.

The token's lifecycle is documented separately in §2.1 below — but importantly, §2.1 documents a *helper*, not a flow.

### Sequence

```
HIP (us) → Gateway,  Gateway → HIP (us) for callbacks

  HIP  ──link/carecontext──▶  Gateway   (HIP sends careContexts + X-LINK-TOKEN header pulled from cache)
   ◀──── on_carecontext     (Gateway returns success/error)
```

### State diagram

```mermaid
stateDiagram-v2
  [*] --> INIT: staff UI click "Link records to ABHA"
  INIT --> CC_LINK_REQUESTED: outbound link/carecontext (with cached X-LINK-TOKEN)
  INIT --> FAILED: no fresh token in cache (surfaced to staff as "retry shortly")
  CC_LINK_REQUESTED --> CC_LINK_CONFIRMED: inbound on_carecontext (status SUCCESS)
  CC_LINK_REQUESTED --> FAILED: inbound on_carecontext (status non-SUCCESS)
  CC_LINK_CONFIRMED --> LINKED: Record Foundation patched, abdm.care-context.linked emitted
  LINKED --> [*]
  FAILED --> [*]
```

### Endpoint table

| # | Direction | Endpoint URL | Section | State transition |
|---|---|---|---|---|
| 0 | platform | `POST /api/abdm/v1/m2/hip/initiated-link/start` (staff UI) | — | `→ INIT` |
| 1 | OUT (HIP → gateway) | `POST /api/hiecm/hip/v3/link/carecontext` (with `X-LINK-TOKEN` header pulled from token cache) | §4.3.3 | `→ CC_LINK_REQUESTED` |
| 1b | IN (gateway → HIP) | `POST {callback}/api/v3/link/on_carecontext` | §4.3.4 | `→ CC_LINK_CONFIRMED` / `→ FAILED` |
| 2 | platform | Record Foundation `PATCH /care-context/:id { abha_linkage_status: 'linked' }` | — | `→ LINKED` |

### Request body shape (cheat sheet)

**§4.3.3 link/carecontext** — HIP outbound body (with `X-LINK-TOKEN: <cached linkToken>` header):
```jsonc
{
  "abhaAddress": "ayush@abdm",
  "abhaNumber": "91-1234-5678-9012",
  "patient": [{
    "referenceNumber": "MRN-2024-001",
    "display": "Patient: Ayush Wardhan",
    "careContexts": [
      { "referenceNumber": "VISIT-2024-1101", "display": "OP consultation 2024-11-01" }
    ],
    "hiType": "OPCONSULTATION",
    "count": 1                              // must equal careContexts.length
  }]
}
```

**§4.3.4 on_carecontext** — gateway → HIP body:
```jsonc
{
  "abhaAddress": "ayush@abdm",
  "status": "Successfully Linked care context",   // success literal
  "error": { "code": "ABDM-1038", "message": "..." },   // present on non-success; see error table below
  "response": { "requestId": "<echo of REQUEST-ID from §4.3.3>" }
}
```

**Known `on_carecontext` error codes** (extend `packages/ts-sdk-abha/src/constants/error-codes.ts`):

| Code | Meaning | How to handle |
|---|---|---|
| `ABDM-1038` | ABHA address mismatch with link token | Invalidate cached token for this patient; transition `→ FAILED`; staff retry re-generates. |
| `ABDM-1056` | These care contexts have been already linked | **Soft success** — transition `→ LINKED`. Log warning; the desired end state already holds. |
| `ABDM-1062` | ABHA number mismatch with link token | Same as 1038 — invalidate + retry. |
| `ABDM-1063` | HIP ID mismatch with link token | Token issued for a different HIP. Invalidate; surface to staff as misconfiguration. |
| `ABDM-1066` | Invalid JWT token | Token corrupt or tampered. Invalidate; transition `→ FAILED`. |

The exact code → message mapping in the spec is occasionally inconsistent; verify against sandbox responses during integration tests and update the table if drift is observed.

States used: **new**, add to [`packages/ts-sdk-abha/src/constants/fsm-states.ts`](../../../../packages/ts-sdk-abha/src/constants/fsm-states.ts):

```ts
export const M2_HIP_INITIATED_LINK_STATES = [
  'INIT',
  'CC_LINK_REQUESTED',
  'CC_LINK_CONFIRMED',
  'LINKED',
  'FAILED',
] as const;
```

### Differences from user-initiated-link

- **No discovery step.** ABHA already known; no EMPI demographic match required.
- **No OTP step.** The link token (managed out-of-band) is the authorization — gateway accepts the link request as long as the `X-LINK-TOKEN` header carries a valid, unexpired token issued to this HIP.
- **Single outbound + single inbound, in sequence.** Compared to user-initiated's three-pair pattern.
- **Linking flow itself does not generate the token.** It pulls a fresh one from the link-token cache.

### Failure modes

- **Token acquisition timeout.** `linkTokenCache.getOrAcquire` exhausts its budget (default 8s) waiting for the `on-generate-token` callback. Transition `→ FAILED`. Surface to staff: "ABDM gateway slow — please retry." Most retries succeed because the token has by now arrived in the cache.
- **`on_carecontext` returns "Counter and Care context count mismatch"** — `count` field doesn't equal `careContexts.length`. Build-time bug; assert in DTO.
- **`on_carecontext` returns `ABDM-1056` "These care contexts have been already linked"** — soft success. Transition `→ LINKED` (idempotent re-link). Log warning.
- **`on_carecontext` returns a token-mismatch error** (`ABDM-1038`, `ABDM-1062`, `ABDM-1063`, or `ABDM-1066` — see error table in §4.3.4 cheat sheet above) — cached token is stale or wrong-scoped. The cache invalidates the row for that patient; transition `→ FAILED`. Staff retry triggers a fresh token-gen.

---

## 2.1 Link Token Cache (per-patient, ephemeral) — a helper, not a flow

The link token is a **per-patient credential** whose lifetime is set by the JWT's `exp` claim (observed: minutes, not hours). It is cached in a small ephemeral table. It is **not** a flow — it is plumbing the linking use-case consults transparently.

### Why this is not a flow

The token doesn't represent any user-facing or business outcome. A flow framing would force a state machine onto a credential, which doesn't pay rent. The credential is independent of any workflow's state.

### Why we still partition by tenant in the table, even though the credential isn't tenant-owned data

The token's logical identity per spec §4.3.2 is `(hipId, patientAbha)`. Conceptually, the credential is **not tenant-owned data** — it represents the gateway's authorisation for *this HIP* to link records for *this patient*. So the user's intuition that "tokens shouldn't have anything to do with tenant" is right at the conceptual level.

**Operationally, however, we keep `iq_tenant_id` as a namespace/HIP-boundary partition in the table** for two reasons:

1. In multi-HIP deployments (multiple facilities served by one platform install), `hipId` varies and the credential's identity becomes `(hipId, patient)`. Since `iq_tenant_id` maps 1:1 to HIP in this codebase, it serves as the HIP-boundary dimension.
2. Without that partition, a single-keyed `(abha_address)` PK would let two facilities' tokens collide in the cache for the same patient — a credential leak.

So the framing is: **the credential is not workflow-scoped and not tenant-owned, but is partitioned by `(iq_tenant_id, abha_address)` for namespace safety.** The cache logic does not reason about tenants beyond using the column as a partition key.

### Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Link Token Cache (per-patient, tenant-partitioned)                      │
│                                                                          │
│  ┌──────────────────────┐    ┌───────────────────────────────────────┐  │
│  │ abdm_link_tokens     │    │ linkTokenCache.getOrAcquire(          │  │
│  │  PK (iq_tenant_id,   │    │   iq_tenant_id, abha, …)              │  │
│  │      abha_address)   │◀──▶│ - SELECT … FOR UPDATE                  │  │
│  │  link_token (NULL    │    │ - if hit and expires > now+60s:        │  │
│  │    while pending,    │    │     return cached.linkToken            │  │
│  │    encrypted at rest)│    │ - else: claim acquisition, trigger     │  │
│  │  expires_at (NULL    │    │   generate-token, poll cache for ≤8s   │  │
│  │    while pending)    │    │   until token appears (or timeout)     │  │
│  │  pending_request_id  │    └───────────────────────────────────────┘  │
│  │  obtained_at         │                                                │
│  └──────────────────────┘                                                │
│         ▲                                                                │
│         │ UPSERT on receipt                                              │
│  on-generate-token ──────────────                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Endpoints involved (managed by the cache helper, not by any flow)

| Direction | Endpoint | Section | Driven by |
|---|---|---|---|
| OUT (HIP → gateway) | `POST /api/hiecm/v3/token/generate-token` | §4.3.1 | `linkTokenCache.getOrAcquire` (on cache miss) |
| IN (gateway → HIP) | `POST {callback}/api/v3/hip/token/on-generate-token` | §4.3.2 | Cache writer — UPSERTs the row, no flow state |

### `abdm_link_tokens` table

```sql
CREATE TABLE abdm_adapter.abdm_link_tokens (
  iq_tenant_id        uuid NOT NULL,
  abha_address        text NOT NULL,
  link_token          text,                                  -- NULL while a generate-token is pending; encrypted at rest via lib/payload-encryptor once populated
  expires_at          timestamptz,                           -- NULL while pending; set to JWT `exp` on receipt
  obtained_at         timestamptz,                           -- NULL while pending; set on receipt
  pending_request_id  text,                                  -- present while generate-token is in flight; cleared on receipt
  pending_expires_at  timestamptz,                           -- guard against orphaned pending rows; set to now()+30s on claim
  PRIMARY KEY (iq_tenant_id, abha_address)
);
-- Citus: distribute by iq_tenant_id, co-located with other adapter tables.
SELECT create_distributed_table('abdm_adapter.abdm_link_tokens', 'iq_tenant_id');
```

**Why distributed-by-tenant and not a reference table:** an earlier draft used a Citus reference table (no distribution column). Reference tables are good for small mostly-read lookup data, but link tokens are high-churn (every link operation reads, every generate-token writes) and reference-table writes require 2PC across all workers — operationally hot. Distributing by `iq_tenant_id` co-locates this with the rest of the adapter's tables, makes writes single-shard, and provides the namespace boundary.

**`pending_expires_at`** prevents an orphaned pending row from blocking acquisition forever (e.g., if a `generate-token` POST hangs and the requesting process crashes). The `claimAcquisition` predicate ignores rows whose `pending_expires_at < now()` and overwrites them.

Stale completed rows get evicted by a small janitor (one-line `DELETE … WHERE expires_at < now()` on a 5-min schedule).

### The cache API

```ts
// modules/abdm-adapter/src/lib/link-token-cache.ts

export class LinkTokenNotAvailable extends Error {}

export interface LinkTokenCache {
  /**
   * Return a fresh link token for the given patient. Cache hit → returns immediately.
   * Cache miss → triggers a generate-token to the gateway and awaits the on-generate-token
   * callback. Bounded by `timeoutMs` (default 8000); throws LinkTokenNotAvailable on timeout.
   *
   * TTL of returned token is whatever the JWT's `exp` claim says — do NOT hardcode 15min
   * (production HIMS does this and ends up reusing stale tokens; don't repeat the mistake).
   */
  getOrAcquire(input: {
    iqTenantId: string;
    abhaAddress: string;
    abhaNumber?: string;
    name: string;
    gender: 'M' | 'F' | 'O' | 'D';
    yearOfBirth: number;
    timeoutMs?: number;
  }): Promise<string>;

  /**
   * Invalidate the cached row for a patient. Called by the linking flow on
   * `on_carecontext` returning a token-mismatch error (ABDM-1038/1062/1063/1066).
   */
  invalidate(input: { iqTenantId: string; abhaAddress: string }): Promise<void>;
}
```

Implementation outline:

1. `getOrAcquire`: `SELECT … WHERE (iq_tenant_id, abha_address) = ($1, $2) FOR UPDATE`. If a fresh row exists (`link_token IS NOT NULL AND expires_at > now() + 60s`), return the decrypted token (release lock).
2. **Claim acquisition with `INSERT ... ON CONFLICT DO UPDATE`** so two concurrent instances coordinate cleanly:
   ```sql
   INSERT INTO abdm_link_tokens
     (iq_tenant_id, abha_address, pending_request_id, pending_expires_at)
   VALUES ($1, $2, $3, now() + interval '30 seconds')
   ON CONFLICT (iq_tenant_id, abha_address) DO UPDATE
     SET pending_request_id  = EXCLUDED.pending_request_id,
         pending_expires_at  = EXCLUDED.pending_expires_at,
         link_token          = NULL,
         expires_at          = NULL
     WHERE abdm_link_tokens.expires_at IS NULL OR abdm_link_tokens.expires_at <= now() + interval '60 seconds';
   ```
   If the WHERE blocks the update (because another instance already has a fresh row), step 1's SELECT will see it on the next poll iteration.
3. After successful claim, POST `/api/hiecm/v3/token/generate-token` with the patient demographics and `pending_request_id` as the `REQUEST-ID` header.
4. Poll the cache: `SELECT … WHERE (iq_tenant_id, abha_address) = ($1, $2) AND link_token IS NOT NULL` every 200ms × 40 = up to 8s.
5. Row populated with a real token → return it. Timeout → leave the row as-is for the next attempt (the `pending_expires_at` guard ensures it doesn't block future acquisitions); throw `LinkTokenNotAvailable`.

The inbound `on-generate-token` handler (in `rest-handlers/m2/link-token-routes.ts`) does the UPSERT keyed by `(iq_tenant_id, abha_address)`. It decodes the JWT's `exp` claim and stores that as `expires_at`. No flow state involved.

### Multi-instance note

If the HTTP service runs more than one replica, the in-flight `generate-token` request and its `on-generate-token` callback might land on different instances. The Postgres pattern above handles this — instance A claims via `ON CONFLICT DO UPDATE`, posts the request, instance B may receive the callback and UPSERT, instance A's poll picks up the new row. No cross-instance pub/sub needed. Single Postgres = single source of truth.

### Cold start

When the service first starts with an empty cache, the first link attempt for each patient incurs the ~3-5s generate-token round trip. Subsequent attempts within the JWT's validity window are instant. **No background pre-warming is needed** — the validity window is short and the set of patients about to be linked next is unpredictable.

---

## 3. `abdm.m2.consent-notify.v1`

### What it is

The patient grants consent in their PHR app for a HIU (another hospital, or a research org) to view records held at our facility. The consent manager forwards a **consent artefact** to us (the HIP). We persist the artefact and acknowledge. **Actual record serving under this consent is M3** — this M2 flow is just receipt + ack.

### State diagram

```mermaid
stateDiagram-v2
  [*] --> CONSENT_NOTIFIED: inbound /consent/request/hip/notify
  CONSENT_NOTIFIED --> CONSENT_PERSISTED: signature verified, artefact stored
  CONSENT_NOTIFIED --> FAILED: signature invalid
  CONSENT_PERSISTED --> ACKED: outbound on-notify posted with status OK
  ACKED --> [*]
  FAILED --> [*]
```

### Endpoint table

| # | Direction | Endpoint URL | Section | State transition |
|---|---|---|---|---|
| 1 | IN (gateway → HIP) | `POST {callback}/api/v3/consent/request/hip/notify` | §6.3.1 | `→ CONSENT_NOTIFIED` |
| 1b | platform | Persist into `abdm_adapter.abdm_consent_artefacts` | — | `→ CONSENT_PERSISTED` |
| 1c | OUT (HIP → gateway) | `POST /api/hiecm/consent/v3/request/hip/on-notify` | §6.3.2 | `→ ACKED` |

### Inbound body shape (cheat sheet)

**§6.3.1 consent/request/hip/notify** — gateway → HIP body is **wrapped** under `notification`. Do NOT model the artefact as flat top-level fields:

```jsonc
{
  "notification": {
    "consentId": "<UUID>",                       // pull from here for indexed column
    "consentDetail": {
      "schemaVersion": "1.5",
      "consentId": "<UUID>",                     // mirrored inside consentDetail too
      "createdAt": "2026-05-19T10:00:00Z",
      "status": "GRANTED",                       // or "REVOKED"
      "patient":  { "id": "ayush@abdm" },        // patient ABHA address
      "hip":      { "id": "<our-hip-id>" },
      "hiu":      { "id": "<requesting-hiu-id>" },
      "purpose":  { "text": "Care Management", "code": "CAREMGT", "refUri": "..." },
      "hiTypes":  ["OPConsultation", "Prescription"],
      "permission": {
        "accessMode": "VIEW",
        "dateRange": { "from": "2024-01-01T00:00:00Z", "to": "2026-05-19T00:00:00Z" },
        "dataEraseAt": "2026-08-19T00:00:00Z",
        "frequency": { "unit": "HOUR", "value": 1, "repeats": 0 }
      },
      "consentManager": { "id": "sbx" },
      "requester": { "name": "...", "identifier": { ... } }
    },
    "signature": "<base64>"                      // signature of consentDetail
  }
}
```

Persist `notification.consentDetail` verbatim plus the wrapper-level `signature`. Pull indexed values from `notification.consentDetail`:

| Indexed column | Source path |
|---|---|
| `consent_id` | `notification.consentId` |
| `patient_id` (resolved via EMPI from `consentDetail.patient.id`) | `notification.consentDetail.patient.id` |
| `hip_id` | `notification.consentDetail.hip.id` |
| `hiu_id` | `notification.consentDetail.hiu.id` |
| `status` | `notification.consentDetail.status` |
| `data_erase_at` | `notification.consentDetail.permission.dataEraseAt` |
| `granted_at` | `notification.consentDetail.createdAt` |

**`artefact_json jsonb`** stores the full `notification` object (wrapper + consentDetail + signature) — do not flatten. Future M3 / consent-supervisor consumers may need wrapper metadata.

States used: **new**:

```ts
export const M2_CONSENT_NOTIFY_STATES = [
  'CONSENT_NOTIFIED',
  'CONSENT_PERSISTED',
  'ACKED',
  'FAILED',
] as const;
```

### Event emitted

On `CONSENT_PERSISTED`, emit `abdm.consent.granted` with the artefact id + patient id + dataEraseAt. The long-lived consent supervisor (`abdm.consent.lifecycle.v1` per [FSM spec §8](../integration-platform/02-fsm-specifications.md#8-abdmconsentlifecyclev1----the-long-lived-supervisor)) will eventually consume this — out of scope for M2.

### Failure modes

- **Signature verification fails** — reply on-notify with `error: { code: "ABDM-1411", message: "invalid-signature" }`, state `→ FAILED`. Surface as a security alert.
- **Duplicate `consentId`** — `ON CONFLICT (iq_tenant_id, consent_id) DO NOTHING`. Still ack with success. Gateway retries are expected.

---

## 4. `abdm.m2.add-contexts.v1`

### What it is

A previously-linked patient gets a new visit / encounter / care context at our facility. We proactively notify the gateway so the patient sees the new record available in their PHR app (no manual re-discovery needed).

### State diagram

```mermaid
stateDiagram-v2
  [*] --> INIT: event record-foundation.care-context.created (for a linked patient)
  INIT --> NOTIFIED: outbound /link/context/notify (with patient ABHA + careContext refs)
  NOTIFIED --> COMPLETED: inbound /links/context/on-notify (acknowledgement.status SUCCESS)
  NOTIFIED --> FAILED: inbound on-notify with error
  COMPLETED --> [*]
  FAILED --> [*]
```

### Endpoint table

| # | Direction | Endpoint URL | Section | State transition |
|---|---|---|---|---|
| 0 | platform | (event `record-foundation.care-context.created`) | — | `→ INIT` |
| 1 | OUT (HIP → gateway) | `POST /api/hiecm/hip/v3/link/context/notify` | §4.3.6 | `→ NOTIFIED` |
| 1b | IN (gateway → HIP) | `POST {callback}/api/v3/links/context/on-notify` | §4.3.7 | `→ COMPLETED` / `→ FAILED` |

### Trigger

This flow is **not** started by an HTTP request. It is started by an in-process event from Record Foundation when a new care context is registered for an already-linked patient. The event payload carries `patient_id`, `iq_tenant_id`, `care_context_id[]`, `display_text[]`, `hi_type`. The consumer lives in `modules/abdm-adapter/src/events/consumers/care-context-created.ts`.

### Request body shape (cheat sheet)

**§4.3.6 link/context/notify** — HIP outbound body:
```jsonc
{
  "notification": {
    "patient": { "id": "ayush@abdm" },
    "careContext": {
      "patientReference": "MRN-2024-001",
      "careContextReference": "VISIT-2024-1115"
    },
    "hiTypes": ["OPCONSULTATION"],
    "date": "2024-11-15T14:30:00Z",
    "hip": { "id": "<our-hip-id>" }
  }
}
```

States used: **new**:

```ts
export const M2_ADD_CONTEXTS_STATES = [
  'INIT',
  'NOTIFIED',
  'COMPLETED',
  'FAILED',
] as const;
```

### Failure modes

- **Patient was never linked.** Skip — do not start a flow. Log a debug.
- **`on-notify` returns error.** Transition `→ FAILED`. Retry policy: 3 attempts at 60s / 5min / 30min via timer rows. After third failure, alert.

---

## 5. `abdm.m2.sms-notify.v1`

### What it is

HIP-initiated SMS to a patient — used in conjunction with hip-initiated-link to nudge the patient ("we've linked your records, view them at <PHR app>"). The gateway sends the SMS on the HIP's behalf using the patient's registered mobile.

### State diagram

```mermaid
stateDiagram-v2
  [*] --> INIT: trigger (linking flow completion / staff action)
  INIT --> SMS_REQUESTED: outbound /links/sms/notify2
  SMS_REQUESTED --> SMS_ACKED: inbound /patients/sms/on-notify (status SUCCESS)
  SMS_REQUESTED --> FAILED: inbound on-notify with error
  SMS_ACKED --> [*]
  FAILED --> [*]
```

### Endpoint table

| # | Direction | Endpoint URL | Section | State transition |
|---|---|---|---|---|
| 0 | platform | (trigger — typically post-`LINKED` of hip-initiated-link) | — | `→ INIT` |
| 1 | OUT (HIP → gateway) | `POST /api/hiecm/hip/v3/link/patient/links/sms/notify2` | §4.3.8 | `→ SMS_REQUESTED` |
| 1b | IN (gateway → HIP) | `POST {callback}/api/v3/patients/sms/on-notify` | §4.3.9 | `→ SMS_ACKED` / `→ FAILED` |

### Request body shape (cheat sheet)

**§4.3.8 sms/notify2** — HIP outbound body:
```jsonc
{
  "requestId": "<UUID we generate>",
  "timestamp": "2026-05-19T12:00:00Z",
  "notification": {
    "phoneNo": "+919812345678",
    "hip": { "id": "<our-hip-id>", "name": "ACME Hospital" }
  }
}
```

States used: **new**:

```ts
export const M2_SMS_NOTIFY_STATES = [
  'INIT',
  'SMS_REQUESTED',
  'SMS_ACKED',
  'FAILED',
] as const;
```

### Note

This flow is **optional for M2 sprint** — implement only if the product spec calls for it. If skipped, the patient sees the link in their PHR app whenever they next refresh; no SMS push. Confirm with product before deciding.

---

## Common pitfalls — read before writing any handler

These are M2-wide gotchas that bite implementers in sandbox testing. None of them are obvious from a quick spec scan; all of them are real.

### Pitfall 1 — Every outbound `on-*` must echo `response.requestId`

The ABDM gateway correlates outbound `on-*` posts back to the original inbound REQUEST-ID via the `response.requestId` field in the body. **If you omit it, the gateway silently drops the response** — the flow stalls with no error in our logs. The DTO for every outbound `on-*` shape includes a top-level `response: { requestId: string }` field; the value is the `REQUEST-ID` header from the matching inbound callback (NOT a fresh one).

Affected endpoints: `on-discover`, `on-init`, `on-confirm`, `on-notify` (add-contexts, consent ack, SMS), `on_carecontext`. Make this a code-review checklist item.

### Pitfall 2 — HI type casing varies by endpoint

ABDM v3's HI type enum (record kinds) is **spelled differently on different endpoints**:

| Endpoint | Casing | Example |
|---|---|---|
| `link/carecontext` (HIP-initiated linking, §4.3.3) | ALL CAPS | `PRESCRIPTION`, `OPCONSULTATION`, `DIAGNOSTICREPORT`, `DISCHARGESUMMARY` |
| `on-discover` / `on-init` / `on-confirm` (user-initiated linking) | ALL CAPS | same as above |
| `link/context/notify` (add-contexts, §4.3.6) | PascalCase | `Prescription`, `OPConsultation`, `DiagnosticReport`, `DischargeSummary` |
| `consent/request/hip/notify` body `hiTypes` (§6.3.1) | PascalCase | same as add-contexts |

**Do not define one global all-caps enum and use it everywhere — it will silently fail validation on PascalCase endpoints, or vice versa.** Either:

- Define **per-endpoint wire enums**:
  ```ts
  export type LinkCareContextHiType = 'PRESCRIPTION' | 'OPCONSULTATION' | 'DIAGNOSTICREPORT' | 'DISCHARGESUMMARY' | 'IMMUNIZATIONRECORD' | 'HEALTHDOCUMENTRECORD' | 'WELLNESSRECORD';
  export type ContextNotifyHiType  = 'Prescription'  | 'OPConsultation'  | 'DiagnosticReport'  | 'DischargeSummary'  | 'ImmunizationRecord'  | 'HealthDocumentRecord'  | 'WellnessRecord';
  ```
- Or define one canonical PascalCase enum + a `toUpperHiType(t: HiType): LinkCareContextHiType` normalizer used at the wire boundary.

The spec markdown is itself inconsistent — verify exact casing against sandbox responses during integration tests and flag any drift in PR.

### Pitfall 3 — Inbound response status varies by endpoint (`200` vs `202`)

The "respond fast" rule is universal; the **status code is not**. Spec values:

| Endpoint | Spec response |
|---|---|
| Inbound `discover` (§5.3.2) | `200 OK` |
| Inbound `link/care-context/init` (§5.3.6) | `200 OK` |
| Inbound `link/care-context/confirm` (§5.3.10) | `202 Accepted` |
| Inbound `on_carecontext` (§4.3.4) | `202 Accepted` |
| Inbound `consent/request/hip/notify` (§6.3.1) | `202 Accepted` |

**Sandbox is permissive and tolerates `202` universally** — but code to the spec value per route, and have the integration test assert on the spec status. That way the doc stays correct even if sandbox tightens up.

### Pitfall 4 — Inbound header set varies by endpoint

Don't model all inbound callbacks with one strict `InboundGatewayHeaders` type. Different endpoints require different identity headers (`X-HIP-ID` vs `X-HIU-ID`); `X-CM-ID` is not universally required. See [`06-m2-dev-guide.md §2`](./06-m2-dev-guide.md#2-populate-protocol-dtos-packagests-sdk-abhasrcprotocolm2) for the header DTO split per endpoint family.

---

## Acceptance for M2 sprint completion

- All four mandatory flows (user-initiated-link, hip-initiated-link, consent-notify, add-contexts) have populated DTO types in `@hims/ts-sdk-abha/protocol/m2/`. SMS-notify is optional per product.
- Inbound REST handlers in `modules/abdm-adapter/src/rest-handlers/m2/` with **signature verification** + **`REQUEST-ID` idempotency** + body validation (Zod or AJV — match M1's convention).
- Outbound HTTP clients added: gateway `generate-token`, `link/carecontext`, `on-discover`, `on-init`, `on-confirm`, `link/context/notify`, `consent/request/hip/on-notify`, optionally `links/sms/notify2`. **Every outbound `on-*` body carries `response.requestId` echoing the matching inbound REQUEST-ID.**
- Per-flow typed session: each M2 use-case sees `AbdmSession<'abdm.m2.…v1'>` with its own context type. See [`06-m2-dev-guide.md §3`](./06-m2-dev-guide.md#3-per-flow-typed-context--the-portable-shape).
- New tables migrated: `abdm_inbound_messages`, `abdm_consent_artefacts`. (Decide spelling — `abdm_*` or generic `integration_*` — with the lead before naming.)
- Integration tests: one happy-path against ABDM sandbox per mandatory flow; gated behind `RUN_ABDM_SANDBOX_TESTS=1`.
- Telemetry counters per state transition: `// TODO(metrics)` markers — same as M1.
- New events emitted: `abdm.consent.granted`, `abdm.care-context.linked`, `abdm.care-context.published`.

## What's NOT in scope

- **M3 record serving.** Consent is persisted + acked here; data fetch under that consent is M3.
- **Consent lifecycle supervisor** (`abdm.consent.lifecycle.v1`). Document the event boundary; do not implement.
- **Fidelius envelope encryption.** Required for M3 record bundles; not needed for any M2 flow.
- **Staff UI for hip-initiated-link.** Backend handlers only; UI is a frontend sprint.
- **Add-contexts retry-with-DLQ.** Three attempts is the cap; DLQ is post-Phase 1.
- **"Get all patient links"** (spec §4.3.5). Read-only listing API — only needed if product wants a "linked patients" UI. Defer.

## Related

- [02-m1-flows.md](./02-m1-flows.md) — M1 catalogue (compare for shape consistency)
- [06-m2-dev-guide.md](./06-m2-dev-guide.md) — step-by-step impl checklist
- [04-orchestration-phase-1-http-first.md §11](../integration-platform/04-orchestration-phase-1-http-first.md#11-portability-rules--the-structure-that-makes-future-de-migration-mechanical) — the nine structural rules every M2 file must obey
- [02-fsm-specifications.md §5](../integration-platform/02-fsm-specifications.md#5-abdmm2user-initiated-linkv1----patient-links-from-phr-app) — canonical state machine spec for user-initiated-link (the other M2 flows will be added to this doc as a follow-up)
- [docs/external/abdm/v3-m2-…](../../../external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md) — **the source spec.** All endpoint paths, request bodies, and error codes here are grounded in this doc; cite the §X.Y.Z section in PR if a body shape needs interpretation.
