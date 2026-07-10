---
title: "ABDM Milestone 3: HIU — consent & data fetch"
objective: How HIMS acts as a Health Information User (HIU) — requesting a patient's consent, then pulling and decrypting their records held by other hospitals (HIPs). Grounded in modules/integration-hub/src/integrations/abdm.
---

**HIU = Health Information User.** In M3, HIMS is the side that *wants* records it does
not hold — a doctor pulls a walk-in patient's past prescriptions, discharge summaries and
diagnostic reports from whichever other facilities (HIPs) treated them. Nothing crosses the
wire without a patient-signed **consent artefact**, and every record is **end-to-end
encrypted** HIP→HIU.

All M3 HIU code lives under `modules/integration-hub/src/integrations/abdm/`
(`use-cases/m3/hiu/`, `rest-handlers/m3/`, `lib/`, `schema/`). The service that mounts it is
`services/integration-hub-svc/`.

```diagram title="M3 HIU — the four legs" look=clean
flowchart TB
  subgraph L1["1 · Consent request"]
    A["Doctor asks for records"] --> B["gateway consent/request/init"]
    B --> C["Patient approves in PHR app"]
  end
  subgraph L2["2 · Artefact fetch"]
    C --> D["CM notify + on-fetch"]
    D --> E["signed artefact stored"]
  end
  subgraph L3["3 · Data request"]
    E --> F["hi-request + our ECDH key"]
    F --> G["HIP pushes to our dataPushUrl"]
  end
  subgraph L4["4 · Data receipt"]
    G --> H["decrypt (Fidelius)"]
    H --> I["FHIR stored in data_transfers"]
    I --> J["clinician views / downloads"]
  end
```

The whole pipeline is a single session row in `abdm_sessions` whose `state` column walks the
11 `M3_HIU_STATES` (`packages/ts-sdk-abha/src/constants/fsm-states.ts`) from
`CONSENT_INIT_REQUESTED` to `ACKNOWLEDGED`.

<!-- chapter: Two kinds of endpoint -->

The adapter exposes **two** route surfaces, mounted separately in
`services/integration-hub-svc/src/main.ts`:

- **Platform routes** — what our own frontend calls. Prefix `/api/abdm/v1`, behind a JWT
  identity gate **and** a Cerbos capability PEP. Defined in
  `rest-handlers/m3/m3-platform-routes.ts` (every route is `authMode: "protected"`).
- **Gateway callbacks** — what the NHA gateway / CM / peer HIP call back into. Prefix
  `/api/v3`, **no** JWT — authenticated by gateway signature semantics, never our token.
  Defined in `rest-handlers/m3/m3-callback-routes.ts`.

```filetree
. modules/integration-hub/src/integrations/abdm/
.   rest-handlers/m3/m3-platform-routes.ts — our FE → /api/abdm/v1/m3/hiu/*
.   rest-handlers/m3/m3-callback-routes.ts — gateway → /api/v3/hiu/*
.   use-cases/m3/hiu/start-consent-request.ts — leg 1
.   use-cases/m3/hiu/handle-notify-callback.ts — leg 2 (fan-out)
.   use-cases/m3/hiu/handle-on-fetch-callback.ts — leg 2 (store artefact)
.   use-cases/m3/hiu/start-data-request.ts — leg 3 (our ECDH keys)
.   use-cases/m3/hiu/handle-bundle-push.ts — leg 4 (decrypt + ingest)
.   lib/fidelius-crypto.ts — ECDH + AES-GCM
.   lib/fidelius-curve25519-bc.ts — BouncyCastle curve25519 math
.   lib/m3-fsm-states.ts — state constants
.   schema/tables.ts — abdm_m3_* tables
```

<!-- chapter: Leg 1 — Consent request -->

The doctor names a purpose, the HI-types wanted, and a date range. `startConsentRequest`
(`use-cases/m3/hiu/start-consent-request.ts`) normalises the date range, computes a
`dataEraseAt` (defaults to permission-end + 90 days), creates the session row in
`CONSENT_INIT_REQUESTED`, POSTs the init body to the gateway, and persists a row in
`abdm_m3_consent_requests`. The patient then approves (or denies) in **their own** PHR /
ABHA app — HIMS never sees that screen.

```diagram title="Consent request → patient approval"
sequenceDiagram
  autonumber
  participant FE as HIMS UI
  participant HIU as Integration Hub (HIU)
  participant GW as NHA Gateway / CM
  participant PHR as Patient PHR app
  FE->>HIU: POST /m3/hiu/consent/request
  HIU->>HIU: session = CONSENT_INIT_REQUESTED
  HIU->>GW: consent/request/init (purpose, hiTypes, dateRange)
  HIU-->>FE: 202 sessionId + state
  GW-->>HIU: POST /api/v3/hiu/.../on-init
  HIU->>HIU: session = AWAITING_PATIENT_APPROVAL
  GW->>PHR: notify patient
  PHR->>GW: approve / deny
  Note over FE,HIU: FE polls GET /m3/hiu/consent/request/{sessionId}
```

The init body is built literally in `start-consent-request.ts` — note `accessMode: "VIEW"`
and `frequency` as a one-shot pull:

```code lang=ts file=use-cases/m3/hiu/start-consent-request.ts hl=1,5-9
permission: {
  accessMode: "VIEW",
  dateRange: permissionDateRange,   // NHA CM timestamp format
  dataEraseAt,                      // must be in the future or we throw
  frequency: { unit: "DAY", value: 0, repeats: 0 },
},
hiTypes: input.hiTypes,             // e.g. ["OPConsultation","Prescription"]
```

```api-endpoint method=POST path=/api/abdm/v1/m3/hiu/consent/request title="Initiate a consent-pull request"
. auth Bearer platform JWT — plus Cerbos capability PEP
. body patientAbhaAddress string — patient ABHA address (e.g. name@sbx)
. body purpose string — PurposeCode: CAREMGT | BTG | PUBHLTH | HPAYMT | DSRCH | PATRQT
. body hiTypes string[] — HiTypePascal: Prescription, DiagnosticReport, DischargeSummary, OPConsultation, ...
. body dateRange object — { from, to } clinical window
. body hipId string — optional; omit to request across all HIPs
. body dataEraseAt string — optional; default = permission.to + 90d
request:
{
  "patientAbhaAddress": "test.user@sbx",
  "purpose": "CAREMGT",
  "hiTypes": ["OPConsultation", "Prescription"],
  "dateRange": { "from": "2025-01-01T00:00:00Z", "to": "2026-05-21T00:00:00Z" }
}
response 202:
{ "sessionId": "b1f2…", "state": "CONSENT_INIT_REQUESTED" }
response 400:
{ "error": "BadRequest", "message": "dataEraseAt must be in the future" }
```

<!-- chapter: Leg 2 — Artefact notify & fetch -->

When the patient approves, the CM sends a **notify** with the consent-artefact IDs.
`handleNotifyCallback` (`use-cases/m3/hiu/handle-notify-callback.ts`) acknowledges, then
**fans out** a fetch per artefact ID. Each artefact comes back via **on-fetch**, where
`handleOnFetchCallback` verifies the RSA signature, resolves the local patient, and stores
the artefact. Only when *all* pending artefacts are fetched does the session flip to
`CONSENT_GRANTED`.

```diagram title="Notify → fetch → GRANTED (per-artefact fan-out)"
sequenceDiagram
  autonumber
  participant GW as CM / Gateway
  participant HIU as Integration Hub (HIU)
  participant EMPI as EMPI / Registration
  GW->>HIU: POST /api/v3/hiu/consent/request/notify (status, artefact ids)
  alt status DENIED or REVOKED
    HIU->>HIU: session + request = CONSENT_DENIED
  else GRANTED
    HIU-->>GW: ack (on-notify)
    loop each consent artefact id
      HIU->>GW: consent/fetch
      GW-->>HIU: POST /api/v3/hiu/consent/on-fetch (signed artefact)
      HIU->>HIU: verify RSA signature (canonical JSON)
      HIU->>EMPI: resolve patientId from ABHA address
      HIU->>HIU: upsert artefacts_hiu + consent_artefacts
    end
    HIU->>HIU: all fetched → session = CONSENT_GRANTED
    HIU->>HIU: publish consent.granted event
  end
```

```callout tone=info title="Signature check is real — except in mock mode"
`verifyM3ConsentArtefactSignature` (`lib/m3-consent-artefact-signature.ts`) canonicalises
`consent.consentDetail`, then RSA-SHA256-verifies `consent.signature` against
`ABDM_CM_CONSENT_VERIFY_CERT_PEM`. A missing signature or unconfigured cert returns `false`
→ the artefact is rejected and the session goes `CONSENT_DENIED`. **But** the first line
short-circuits to `true` when `allowInsecureAbdmCallbacks()` or `isM3MockGateway()` — in those
modes **any** signature value passes (the mock loop happens to send `"mock-signature"`; there
is no keyed check).
```

<!-- chapter: Consent state machine -->

The session's `state` column is one field cycling through all 11 `M3_HIU_STATES`
(`lib/m3-fsm-states.ts`). Consent and data-fetch are two halves of the same lifecycle. Below
is the machine exactly as the use-cases drive it.

```diagram title="M3 HIU session lifecycle (as implemented)"
stateDiagram-v2
  [*] --> CONSENT_INIT_REQUESTED
  CONSENT_INIT_REQUESTED --> AWAITING_PATIENT_APPROVAL: on-init ok
  CONSENT_INIT_REQUESTED --> EXPIRED: on-init error
  AWAITING_PATIENT_APPROVAL --> CONSENT_GRANTED: all artefacts fetched
  AWAITING_PATIENT_APPROVAL --> CONSENT_DENIED: notify DENIED / REVOKED
  AWAITING_PATIENT_APPROVAL --> CONSENT_DENIED: bad signature
  CONSENT_GRANTED --> DATA_REQUESTED: hi-request (auto on grant)
  DATA_REQUESTED --> AWAITING_PUSH: on-request ok
  DATA_REQUESTED --> EXPIRED: on-request error
  AWAITING_PUSH --> BUNDLES_RECEIVED: HIP push arrives
  BUNDLES_RECEIVED --> BUNDLES_DECRYPTED: Fidelius decrypt ok
  BUNDLES_RECEIVED --> EXPIRED: decrypt / key failure
  BUNDLES_DECRYPTED --> RECORDS_INGESTED: write bundle_json + emit event
  RECORDS_INGESTED --> ACKNOWLEDGED: CM data-flow notify sent
  ACKNOWLEDGED --> [*]
  CONSENT_DENIED --> [*]
  EXPIRED --> [*]
```

```callout tone=warning title="One honest quirk in the state set"
1. **`EXPIRED` is the catch-all failure sink.** `failTransfer()` in `handle-bundle-push.ts`
   parks missing-key and decrypt failures in `EXPIRED`, and a `REVOKED` notify lands in
   `CONSENT_DENIED` (with `error.code = "REVOKED"`), not a distinct `REVOKED` state — the FE
   re-derives "revoked" from that error code in `mapM3FsmToDisplayStatus`.
```

<!-- chapter: Legs 3 & 4 — Data request, encrypted push & decryption -->

Once granted, `start-data-request.ts` generates **our** ephemeral ECDH key pair (via
Fidelius), stores the private key **encrypted at rest** (`payloadEncryptor`), and sends the
HIP a `hiRequest` carrying our public key + nonce and a **dataPushUrl** pointing back at our
own callback. The HIP later encrypts each FHIR bundle to our public key and POSTs it to that
URL, where `handle-bundle-push.ts` decrypts and stores it. On a granted on-fetch this whole
leg **auto-fires** (`ensureDataRequestForConsent`) for legacy parity.

```diagram title="hi-request → HIP push → decrypt → ingest"
sequenceDiagram
  autonumber
  participant HIU as Integration Hub (HIU)
  participant GW as CM / Gateway
  participant HIP as Peer HIP
  HIU->>HIU: generate ECDH keypair (Curve25519), store priv encrypted
  HIU->>GW: hi-request { consentId, dateRange, dataPushUrl, keyMaterial }
  HIU->>HIU: transfer = DATA_REQUESTED
  GW-->>HIU: POST /api/v3/hiu/health-information/on-request
  HIU->>HIU: transfer = AWAITING_PUSH
  HIP->>HIU: POST /api/v3/hiu/health-information/transfer/{transferId}
  HIU->>HIU: transfer = BUNDLES_RECEIVED (store HIP pub key + nonce)
  HIU->>HIU: Fidelius decrypt each entry → transfer = RECORDS_INGESTED
  HIU->>HIU: publish health-record.received event
  HIU->>GW: data-flow notify (sessionStatus RECEIVED) [best-effort]
  HIU->>HIU: transfer = ACKNOWLEDGED
```

**The crypto is real, not a stub.** `lib/fidelius-crypto.ts` + `lib/fidelius-curve25519-bc.ts`
implement ABDM Fidelius end-to-end:

```code lang=ts file=lib/fidelius-crypto.ts hl=2-6
// HIU decrypt path (mirror of the HIP encrypt path)
const sharedSecret = ecdhSharedSecretBc(ourPriv, peerPoint); // ECDH x-coord, 32 bytes
const { salt, iv } = deriveSaltAndIv(peerNonce, ourNonce);   // XOR the two 32-byte nonces
const aesKey = deriveAesKey(sharedSecret, salt);             // HKDF-SHA256 → 32-byte key
return decryptPayloadAesGcm(cipherBlob, aesKey, iv);         // AES-256-GCM
```

```callout tone=decision title="Why BouncyCastle curve25519, not X25519"
NHA's Java stack uses `CustomNamedCurves.getByName("curve25519")` — the **short-Weierstrass**
form (cofactor 8), **not** RFC-7748 X25519. `lib/fidelius-curve25519-bc.ts` reproduces that
exact curve with `@noble/curves` projective math (bypassing noble's prime-subgroup check,
since BC/NHA points are valid on-curve). Salt = first 20 bytes of `peerNonce XOR ourNonce`,
IV = last 12; AES key = `HKDF-SHA256(sharedSecret, salt)`. Node's `crypto` does HKDF + GCM;
`@noble` does the EC. A legacy base64 stub exists only behind `ABDM_FIDELIUS_USE_STUB=true`.
```

The HIP push endpoint is a **gateway callback** (no JWT). Tenant is resolved from the
`x-tenant-id` header, else the `abdm_m3_data_transfers` row (the CM often omits tenant
headers), else HIP/header resolution — and it is **idempotent** via `abdm_inbound_messages`.

```api-endpoint method=POST path=/api/v3/hiu/health-information/transfer/:transferId title="Data-receive callback (HIP pushes encrypted FHIR here)"
. auth None — gateway callback; tenant resolved from header / transfer row
. path transferId string — our transfer id, embedded in the dataPushUrl we sent
. header x-tenant-id string — optional; primary tenant hint
. header request-id string — optional; idempotency key
. body transactionId string — CM transaction id
. body entries array — [{ content(b64 cipher), media, checksum, careContextReference }]
. body keyMaterial object — HIP dhPublicKey + nonce for ECDH
request:
{
  "transactionId": "TXN-…",
  "pageNumber": 0, "pageCount": 1,
  "entries": [{ "content": "<base64 AES-GCM>", "media": "application/fhir+json", "checksum": "…", "careContextReference": "cc1" }],
  "keyMaterial": { "cryptoAlg": "ECDH", "curve": "Curve25519", "dhPublicKey": { "keyValue": "<HIP pub>", "expiry": "…", "parameters": "Curve25519/32byte random key" }, "nonce": "<HIP nonce>" }
}
response 200:
{}
response 400:
{ "error": "BadRequest", "message": "tenant resolution failed" }
```

<!-- chapter: Where the records land -->

There is no separate clinical-EMR ingest. Decrypted FHIR bundles live in the
`abdm_m3_data_transfers.bundle_json` JSONB column (as `{ transactionId, entries: [{ content,
careContextReference }] }`, where `content` is the plaintext FHIR bundle string). Signed
artefacts land in two tables; a patient-keyed copy is also written for other modules to read.

```data-model title="integration_hub schema — M3 HIU tables (schema/tables.ts)"
. abdm_sessions — one row per flow; state walks M3_HIU_STATES
  . iq_tenant_id uuid PK
  . session_id uuid PK
  . flow_kind text — "abdm.m3.hiu.v1"
  . state text
  . context jsonb — pending/fetched artefact ids, key material, txn ids
. abdm_m3_consent_requests — the request + granted rollup
  . iq_tenant_id uuid PK
  . consent_request_id text PK
  . session_id uuid FK -> abdm_sessions.session_id
  . patient_abha_address text
  . purpose_code text
  . hi_types text[]
  . state text
  . consent_artefact_ids text[]
. abdm_m3_consent_artefacts_hiu — per-artefact, signature-checked
  . iq_tenant_id uuid PK
  . consent_id text PK
  . consent_request_id text FK -> abdm_m3_consent_requests.consent_request_id
  . artefact_json jsonb — full signed artefact
  . care_contexts jsonb
  . signature text
  . signature_valid boolean
. abdm_m3_data_transfers — key material + DECRYPTED bundles
  . iq_tenant_id uuid PK
  . transfer_id uuid PK
  . consent_id text
  . state text
  . hiu_private_key_jwk text — OUR priv key, encrypted at rest
  . hip_public_key_b64 text — peer key from the push
  . bundle_json jsonb — decrypted FHIR entries
  . error jsonb
. abdm_consent_artefacts — patient-keyed copy for other modules
  . iq_tenant_id uuid PK
  . consent_id text PK
  . patient_id uuid FK -> registration patient (cross-module, no DB FK)
  . hiu_id text
  . artefact_json jsonb
```

A clinician reads the records read-only through the platform routes: `GET
.../consent/request/{sessionId}/records` (list bundles per artefact) and `GET
.../attachment/{sessionId}/{bundleId}/{num}` (pull one embedded document). Both are served
by `get-consent-artefact-records.ts` and `get-m3-attachment.ts`, gated on the consent still
being health-data-accessible.

<!-- chapter: PDF / attachment rendering path -->

This is where the task's premise needs correcting against the code.

```callout tone=risk title="M3 received records do NOT go through the pdf-platform"
`grep` for `pdf-client` / `pdf-platform` across `modules/integration-hub` returns **nothing**.
The received FHIR bundles already **embed** their human-readable documents as base64
attachments (`presentedForm[].data` and `content[].attachment.data`, usually
`application/pdf`), rendered by the *source* HIP. `lib/fhir-bundle-display.ts →
extractAttachmentContent()` just pulls the Nth attachment out verbatim; the FE opens it as a
blob. **No FHIR→PDF rendering step exists in the M3 path.**
```

The `pdf-platform` (an external, containerised Gotenberg + worker service) and its
`packages/pdf-client` are a **separate** capability, used by the **registration** module to
*generate* OPD slips and receipts — not to render inbound ABHA records.

```diagram title="Two unrelated PDF paths" look=clean
flowchart LR
  subgraph M3["M3 HIU receive (this page)"]
    F["FHIR bundle w/ base64 attachment"] --> X["extractAttachmentContent"]
    X --> V["FE opens blob (PDF/image)"]
  end
  subgraph PP["pdf-platform (registration only)"]
    R["OPD slip request (typed)"] --> C["@hims/pdf-client HttpPdfPlatformRenderer"]
    C --> G["pdf-platform :8091 (Gotenberg)"]
    G --> P["generated PDF"]
  end
```

For completeness, the pdf-platform contract *is* real and drift-gated — types in
`packages/pdf-client/src/generated/` are generated from
`contracts/pdf-platform/report-contracts.schema.json`, and `make pdf-platform-up` clones a
**pinned** ref (`contracts/pdf-platform/PINNED_REF`) and runs Gotenberg + a worker on
`:8091`. It is simply **not on the M3 receive path**.

<!-- chapter: The frontend — actually exists -->

```callout tone=decision title="Correcting the brief: the consent-pull UI is present and wired"
The brief flagged the consent-pull frontend as a known gap ("backend flows exist, UI does
not"). **As of the current tree that is outdated.** Two real, routed surfaces exist:
- `services/web/src/features/create-rx/components/abha-consent-tab.tsx` — a **Request
  Consent** form (purpose, date range, requester, HIP-scope) that POSTs
  `startM3ConsentRequest` and polls the session state.
- `services/web/src/features/abha-consent-list/` — a consent list page (route
  `/abha-consent-list`), a details panel, a **View Documents** dialog, and
  `downloadM3Attachment` for the embedded reports.
```

HI-types are **selectable per request** (since 2026-07-10): the tab renders one checkbox
per `M3_HI_TYPES` entry, all checked by default, submit disabled at zero selected; the
chosen subset flows through to `startConsentRequest` (the backend schema accepts any
non-empty subset, `minItems: 1`). The list page can additionally *filter* by HI-type
after the fact.

```wireframe surface=panel title="create-rx → ABHA consent tab"
<div class="wf-row"><span class="wf-label">Requester</span><input class="wf-input" value="Dr. Rao"/></div>
<div class="wf-row"><span class="wf-label">Purpose</span><select class="wf-input"><option>Care Management</option></select></div>
<div class="wf-row"><span class="wf-label">From</span><input class="wf-input" value="2025-01-01"/><span class="wf-label">To</span><input class="wf-input" value="2026-05-21"/></div>
<div class="wf-row"><input type="checkbox" checked/> <span>Prescription</span> <input type="checkbox" checked/> <span>OP Consultation</span> <input type="checkbox"/> <span>Discharge Summary</span> <span>…</span></div>
<div class="wf-row"><button class="wf-btn wf-primary">Request Consent</button></div>
<div class="wf-note">Then polls: CONSENT_INIT_REQUESTED → AWAITING_PATIENT_APPROVAL → GRANTED</div>
```

<!-- chapter: What's real vs simulated -->

Being precise about what the tests actually exercise:

```callout tone=info title="The in-process mock loop drives the whole chain — with real crypto"
`modules/integration-hub/test/integration/.../m3/m3-hiu-mock-loop.integration.test.ts` runs
consent → on-init → notify → on-fetch → auto data-request → on-request → **encrypted bundle
push** → `ACKNOWLEDGED`. What is genuine vs faked:
- **Real:** the Fidelius round-trip. The test HIP-encrypts a FHIR payload to the HIU's stored
  public key/nonce via `createFideliusEncryptorFromEnv()` and asserts the pushed bundle
  decrypts back — the ECDH + AES-GCM path is exercised for real, and `bundleJson` is asserted.
- **Simulated:** repositories/sessions are in-memory `vi.fn()` stores; the gateway `post` is a
  no-op; `ABDM_M3_MOCK_GATEWAY=true` both skips outbound gateway calls
  (`skipM3OutboundGateway()`) and **bypasses signature verification** (any signature value
  passes; the loop's `"mock-signature"` is not a keyed check).
```

```filetree
. modules/integration-hub/test/integration/.../abdm/use-cases/m3/
.   m3-hiu-mock-loop.integration.test.ts — full loop, mocked I/O, REAL crypto
.   m3-hiu-consent-request.sandbox.integration.test.ts — gated: real NHA sandbox
.   m3-hiu-data-fetch.sandbox.integration.test.ts — gated: real NHA sandbox
.   m3-hip-data-response.sandbox.integration.test.ts — gated: real NHA sandbox
```

Sandbox tests hit the **real** NHA gateway and only run under `RUN_ABDM_SANDBOX_TESTS`.
Production cutover (per the runbook) is env-only: unset `ABDM_M3_MOCK_GATEWAY` /
`ABDM_M3_LOOPBACK_HIU`, **require** `ABDM_CM_CONSENT_VERIFY_CERT_PEM`, and enumerate
`ABDM_M3_DATA_PUSH_URL_ALLOWLIST`.

```callout tone=warning title="Runbook path drift (doc vs code)"
`docs/guides/abdm-adapter-m3-developer-and-e2e.md` still points at the **old module layout**:
`modules/abdm-adapter/…`, schema `abdm_adapter`, migration
`0003_abdm_adapter_m3_schema.sql`, and `scripts/m3/full-loop.sh`. The code has since moved to
`modules/integration-hub/src/integrations/abdm/` and the Drizzle schema is now
`integration_hub` (`schema/tables.ts`, with `ABDM_ADAPTER_SCHEMA_NAME` kept as a deprecated
alias). Route prefixes in the guide (`/api/v3/hiu/*`, `/api/abdm/v1/m3/*`) still match.
```
