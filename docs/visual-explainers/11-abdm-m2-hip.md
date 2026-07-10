---
title: "ABDM Milestone 2 — HIP: linking & data push"
objective: How HIMS acts as a Health Information Provider (HIP) — minting care contexts from clinical data, linking them to a patient's ABHA, storing consent artefacts, and encrypting + pushing FHIR bundles to an HIU through the ABDM gateway.
---

This page traces the **HIP side** of ABDM M2 as it exists in the code today. Everything
lives under `modules/integration-hub/src/integrations/abdm/` (TypeScript) with the FHIR
bundles produced by the OPD module (`modules/opd/`, Python). M1 (ABHA creation) and M3
(HIU / consent-request) have their own pages — this one is the provider.

> **Two URL surfaces.** Inbound **gateway callbacks** land at `/api/v3/…`; **platform
> staff APIs** live at `/api/abdm/v1/…`. Both are mounted by `router.ts`; the M2/M3
> platform routes sit inside a Cerbos-gated child scope (`authMode: "protected"`).

<!-- chapter: The HIP role -->

## What "HIP" means here

HIMS is the system that **holds** the records. Its job in M2/M3 is four things: publish
that records exist (**care contexts**), prove the patient owns them (**linking**), accept
a signed **consent artefact**, and on demand **encrypt + push** the matching FHIR bundles
to the requesting HIU — always via the ABDM gateway (the Consent Manager, "CM"), never
peer-to-peer for control messages.

```diagram title="HIP role recap" look=clean
flowchart LR
  subgraph HIMS["HIMS (HIP)"]
    OPD["OPD module<br/>clinical data"]
    RF["Record Foundation<br/>care contexts + FHIR bundles"]
    HUB["integration-hub<br/>ABDM adapter"]
  end
  GW["ABDM Gateway / CM"]
  HIU["HIU<br/>(e.g. PHR app, other hospital)"]

  OPD -->|"build + store bundles"| RF
  OPD -->|"orchestrate M2"| HUB
  HUB -->|"link carecontext / context notify"| GW
  HUB -->|"read bundles"| RF
  GW -->|"consent artefact"| HUB
  GW -->|"HI request"| HUB
  HUB -->|"encrypted bundles -> dataPushUrl"| HIU
  HIU -->|"consent + HI request"| GW
```

The adapter never invents record content — it **fetches** already-built bundles from
Record Foundation (`deps.recordFoundation.listBundles`) and only owns the ABDM protocol:
sessions, link tokens, OTPs, consent artefacts, crypto, and the wire envelopes.

## The four moving parts

```data-model title="What the adapter persists (integration_hub schema)"
. abdm_sessions — one row per flow instance (the FSM)
.   iq_tenant_id uuid PK
.   session_id uuid PK
.   flow_kind text — e.g. abdm.m2.user-initiated-link.v1
.   state text — current FSM state
.   txn_id text — CM transactionId (correlation)
.   request_id text — inbound gateway requestId
.   context jsonb — patientId, abhaAddress, careContexts, otpAttemptCount, error…
. abdm_link_tokens — cached HIP link token per ABHA (for HIP-initiated link)
.   abha_address text PK
.   link_token text
.   expires_at timestamptz
. abdm_linked_care_contexts — which care-context refs are already linked to an ABHA
.   abha_address text PK
.   care_context_ref text PK
. abdm_consent_artefacts — HIP-side stored consent (what authorises a push)
.   consent_id text PK
.   patient_id uuid — resolved EMPI patient
.   hip_id text
.   hiu_id text
.   status text — GRANTED / …
.   data_erase_at timestamptz
.   artefact_json jsonb — filtered to supported care contexts
.   signature text
.   signature_valid boolean
```

<!-- chapter: Creating care contexts -->

## From a finished consultation to a care context

Before anything can be linked or pushed, the record has to *exist* as a care context with
a stored FHIR bundle. This is the OPD module's job (Python), fired **after** the clinical
write commits so it can never fail the encounter.

Source: `modules/opd/src/opd/integrations/abdm_m2.py` →
`trigger_m2_after_end_consultation()`.

```diagram title="OPD end-consultation -> care contexts -> hub"
sequenceDiagram
  participant OPD as OPD (opd-svc)
  participant FHIR as py-sdk-fhir
  participant RF as Record Foundation
  participant HUB as integration-hub

  Note over OPD: end consultation (background task)
  OPD->>OPD: load visit clinical snapshot
  loop per applicable HI-type
    OPD->>FHIR: build_*_bundle(inputs)
    FHIR-->>OPD: FHIR document Bundle
    OPD->>RF: POST care-contexts
    OPD->>RF: POST bundles (bundle_json)
    RF-->>OPD: care_context_id
  end
  OPD->>HUB: POST /api/abdm/v1/m2/orchestrate/after-care-contexts
  Note over HUB: careContexts[] -> M2 linking + notify
```

Each HI-type is gated on whether the visit actually has that data (no diagnosis/medicines →
no Prescription; no immunization rows → no ImmunizationRecord). Care-context references are
deterministic (`{visit_id}_OPConsultNote`, `{visit_id}_Prescription`, …), so the same visit
maps to stable refs across re-runs.

```callout tone=info title="This is the OUTBOX SEAM"
`_publish_m2_to_hub()` is the single OPD→hub M2 boundary. Today it is a direct in-request
`urllib` POST (HTTP-first, per the ratified Phase-1 orchestration decision). The durable
target (Temporal) replaces only this function body with an enqueue — the caller contract
(`careContexts` in, `M2ShareResult` out) is unchanged. Grep `OUTBOX SEAM`.
```

<!-- chapter: FHIR bundle building -->

## Which HI-types we can produce, and who builds them

Two SDKs, two jobs. The **Python** `py-sdk-fhir` owns the four end-to-end **HI-type
document-bundle composers** that OPD actually calls. The **TypeScript** `ts-sdk-fhir`
exposes **resource-level** builders + a profile validator + canonical JSON, used for
display/validation (e.g. `fhir-bundle-display.ts`, the web consent viewer) — it does *not*
compose the four HI-type bundles.

| HI-type (ABDM) | Composer (called by OPD) | NRCeS profile | Source data |
|---|---|---|---|
| OPConsultation | `build_op_consult_bundle` | `OpConsultRecord` | prescription form_data + patient/practitioner/encounter + optional rendered PDF |
| Prescription | `build_prescription_bundle` | `Prescription` | form_data diagnosis + medicines (skipped if none) |
| ImmunizationRecord | `build_immunization_bundle` | `ImmunizationRecord` | form_data immunization rows |
| HealthDocumentRecord | `build_health_document_bundle` | `HealthDocumentRecord` | user-uploaded documents (Azure blob), per row |

`py-sdk-fhir` composers (`src/hims_sdk_fhir/hi_types/`) assemble Wave-B resource builders
(`builders/`: patient, practitioner, encounter, condition, medication_request/statement,
observation/vitals, immunization, allergy_intolerance, document_reference, composition,
organization) into a finished `type: document` Bundle: Composition first, `urn:uuid:`
references, DocumentBundle `meta` + confidentiality.

```filetree
. packages/
.   py-sdk-fhir/src/hims_sdk_fhir/
+     hi_types/            — op_consult, prescription, immunization, health_document (the 4 composers)
.     builders/            — ~13 resource builders (Wave B)
.     profile_registry.py  — NRCES_PROFILES canonical URLs + versions
.   ts-sdk-fhir/src/
.     builders/            — composition, bundle, encounter, medication-request, diagnostic-report, observation (resource-level)
.     validators/          — profile-validator (used for display/validation, not push assembly)
```

```callout tone=info title="Where the bundle bytes are at push time"
The adapter's push path never re-builds FHIR. `pushHealthInformationForSession` pulls the
stored `contentJson` straight from Record Foundation (`resolve-rf-bundles.ts`). So the
Python composers run **once, at consultation time**; the TS adapter only encrypts what RF
already holds.
```

<!-- chapter: Linking flows -->

## Discovery (user-initiated, from a PHR app)

A patient in a PHR app searches for their records. The CM calls our discover callback; we
match the patient in EMPI and answer with the care contexts they can link.

Handler: `use-cases/m2/user-initiated-link/handle-discover-callback.ts`.

```diagram title="Care-context discovery"
sequenceDiagram
  participant CM as ABDM Gateway (CM)
  participant HUB as integration-hub
  participant EMPI as EMPI
  participant RF as Record Foundation

  CM->>HUB: POST /api/v3/hip/patient/care-context/discover
  HUB->>HUB: session DISCOVERY_RECEIVED (by transactionId)
  HUB->>EMPI: match by ABHA addr / ABHA number / demographics / verified id
  alt no match (or below score threshold)
    HUB->>CM: on-discover { error: PATIENT_NOT_FOUND }
    HUB->>HUB: session NO_MATCH
  else matched
    HUB->>HUB: session PATIENT_MATCHED
    HUB->>RF: list care contexts (minus already-linked)
    HUB->>CM: on-discover { patient[] grouped by hiType }
    HUB->>HUB: session ON_DISCOVER_RESPONDED
  end
```

Demographics matches must clear `MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE`
(`lib/m2-empi-match-threshold.ts`); a below-threshold hit is warned and treated as no
match. Only **unlinked** contexts are offered (already-linked refs filtered via
`abdm_linked_care_contexts`).

## User-initiated link: init → OTP → confirm

After discovery the PHR app initiates a link; we send an OTP, the patient confirms it, and
we publish the linked contexts back to the CM.

Handlers: `handle-link-init-callback.ts`, `handle-link-confirm-callback.ts`.

```diagram title="User-initiated link with OTP"
sequenceDiagram
  participant CM as Gateway (CM)
  participant HUB as integration-hub
  participant SMS as SMS provider
  participant PT as Patient

  CM->>HUB: POST /api/v3/hip/link/care-context/init
  HUB->>HUB: intersect selected vs discovered contexts
  alt MSG91 provider configured
    HUB->>SMS: sendOtp(phone)
  else local OTP
    HUB->>HUB: generate 6-digit OTP -> linkOtpStore.put
    HUB->>SMS: sendOtp(phone, otp)
  end
  HUB->>CM: on-init { link.referenceNumber, meta }
  HUB->>HUB: session OTP_DISPATCHED
  PT->>CM: enters OTP
  CM->>HUB: POST /api/v3/hip/link/care-context/confirm
  HUB->>HUB: attempt guard (max 5) + verify OTP
  alt OTP invalid / attempts exceeded
    HUB->>HUB: session FAILED (OTP_MISMATCH)
  else valid
    HUB->>CM: on-confirm { patient[] }
    HUB->>HUB: markLinked + publish each context (context/notify, 2s throttle)
    HUB->>HUB: session LINKED
  end
```

OTP verification has two modes (`verifyLinkOtp`): a real provider (`deps.sms.verifyOtp`,
e.g. MSG91) when a phone + verifier exist, otherwise consume the locally-stored OTP
(`abdm_link_otps`, hashed). Max attempts default 5 (`ABDM_LINK_OTP_MAX_ATTEMPTS`).

## HIP-initiated link (staff-driven, and the auto path)

When the hospital already knows the ABHA (e.g. captured at the desk), staff can link
directly — no discovery. This is also what `orchestrate-m2-after-care-contexts` fires
automatically for each HI-type after a consultation.

Handlers: `use-cases/m2/hip-initiated-link/start.ts` + `handle-link-callback.ts`.

```diagram title="HIP-initiated link"
sequenceDiagram
  participant HUB as integration-hub
  participant CM as Gateway (CM)

  Note over HUB: needs a valid link token (cached per ABHA)
  HUB->>CM: POST link/carecontext (link token + patient[] + careContexts)
  HUB->>HUB: session CC_LINK_REQUESTED
  CM-->>HUB: POST /api/v3/link/on_carecontext
  alt error: already linked
    HUB->>HUB: markLinked -> LINKED
  else error: link-token mismatch / invalid jwt
    HUB->>HUB: invalidate token -> FAILED
  else success
    HUB->>HUB: CC_LINK_CONFIRMED -> markLinked -> LINKED
    HUB->>HUB: publish care-context.linked event + SMS deep-link
  end
```

The auto orchestration (`orchestrateM2AfterCareContexts`) groups the incoming
`careContexts[]` by HI-type, starts one HIP-initiated link per group, waits up to 15s for
each to reach `LINKED`, then runs **context notify** (`add-contexts/publish.ts` →
`context/notify`) per care context. There is also an **event-driven** entry
(`register-m2-consumers.ts`, behind `ABDM_M2_ORCHESTRATE_ON_CARE_CONTEXT_EVENT`) that runs
the same orchestration off a Record-Foundation `care-context.registered` event.

<!-- chapter: Consent notification -->

## Gateway notifies the HIP of a granted consent

When a patient grants consent at the CM, the gateway pushes the signed **consent artefact**
to us. We verify the signature, filter to the care contexts we can actually serve, resolve
the EMPI patient, and store it — that stored artefact is what later authorises a push.

Handler: `use-cases/m2/consent-notify/handle-consent-notify-callback.ts`.

```diagram title="Consent notify (HIP side)"
sequenceDiagram
  participant CM as Gateway CM
  participant HUB as integration-hub
  participant EMPI as EMPI / Registration
  participant BUS as EventBus

  CM->>HUB: POST /api/v3/consent/request/hip/notify
  Note over HUB: M3-HIU bridge tried first, else HIP-side runs
  HUB->>HUB: verify signature (CM X.509 + RS256 over consentDetail, JCS)
  HUB->>HUB: session CONSENT_NOTIFIED
  alt signature invalid
    HUB->>HUB: session FAILED (INVALID_SIGNATURE)
  else valid
    HUB->>HUB: filter careContexts to supported hiTypes
    HUB->>EMPI: resolve patientId (ABHA via EMPI/registration/link session)
    HUB->>HUB: upsert abdm_consent_artefacts (CONSENT_PERSISTED)
    HUB->>CM: consent on-notify { acknowledgement OK }
    HUB->>HUB: session ACKED
    HUB->>BUS: publish abdm.consent.granted
  end
```

Signature verification (`lib/consent-signature-verifier.ts`) canonicalises `consentDetail`
with RFC 8785 JCS and RS256-verifies against the CM cert
(`ABDM_CM_CONSENT_VERIFY_CERT_PEM`). In sandbox it can be bypassed with
`ABDM_ALLOW_INSECURE_CALLBACKS` (see the honesty callout). What we persist is the artefact
**filtered to supported care contexts** — an all-unsupported GRANTED consent is failed with
`NO_SUPPORTED_CARE_CONTEXTS`.

<!-- chapter: HI request + data push -->

## The data push: consent artefact → bundles → encrypt → HIU

This is the payoff. The CM sends an **HI request** (with the HIU's public key + nonce +
data-push URL). We ack it, gather the consented bundles from Record Foundation, encrypt
them with Fidelius, and POST the ciphertext to the HIU's `dataPushUrl`.

Handlers: `use-cases/m3/hip/handle-hi-request-callback.ts` (orchestration) →
`push-health-information.ts` (fetch/encrypt/push).

```diagram title="HI request -> encrypted push -> notify"
sequenceDiagram
  participant CM as Gateway (CM)
  participant HUB as integration-hub
  participant RF as Record Foundation
  participant FID as Fidelius (crypto)
  participant HIU as HIU dataPushUrl

  CM->>HUB: POST /api/v3/hip/health-information/request
  HUB->>HUB: session DATA_REQUESTED
  HUB->>CM: hip/on-request ack (ACKNOWLEDGED)
  Note over HUB: ack gates push — no ack => ABDM-1017, push skipped
  HUB->>HUB: session ACKNOWLEDGED
  HUB->>HUB: load consent artefact -> careContextReferences (ABDM-7727 if empty)
  HUB->>RF: resolve patientIds(ABHA) -> list bundles per ref
  RF-->>HUB: FHIR bundle JSONs
  HUB->>HUB: session BUNDLES_FETCHED
  HUB->>FID: encryptBundles(payloadJsons, peerPublicKey, peerNonce)
  FID-->>HUB: encryptedPayloads[], HIP keyToShare (SPKI), HIP nonce
  HUB->>HUB: session BUNDLES_ENCRYPTED
  HUB->>HIU: POST dataPushUrl { entries[], keyMaterial }
  HUB->>HUB: session BUNDLES_PUSHED
  HUB->>CM: health-information/notify (transfer complete)
  HUB->>HUB: session ACKNOWLEDGED
```

The push body (`HipDataPushRequest`) is a single page (`pageNumber: 0, pageCount: 1`)
carrying one `entry` per care context — each with the base64 ciphertext `content`, `media`,
a `checksum`, and its `careContextReference` — plus the HIP `keyMaterial`. The
`transactionId` used across ack → push → notify is the **CM's** `hiRequest.transactionId`
(authoritative; a mismatch would earn ABDM-1017). Failure paths (encrypt/push throws, or
notify fails while the HIU hasn't acknowledged) mark the session `FAILED` and best-effort
notify the CM of a failed transfer.

```api-endpoint method=POST path=/api/v3/hip/health-information/request title="Inbound HI request we expose (gateway callback)"
. header x-hip-id string — our HIP id
. body hiRequest object — transactionId, keyMaterial (HIU dhPublicKey + nonce), dataPushUrl
. body hiRequest.consent object — consent id authorising the pull
request:
{ "hiRequest": { "consent": { "id": "consent-uuid" }, "keyMaterial": { "dhPublicKey": { "keyValue": "<HIU base64 pubkey>" }, "nonce": "<HIU base64 nonce>" }, "dataPushUrl": "https://hiu.example/data/push" }, "transactionId": "cm-txn-uuid" }
response 202:
{ "accepted": true }
```

```api-endpoint method=POST path=/api/abdm/v1/m2/orchestrate/after-care-contexts title="Platform trigger OPD calls after a consultation"
. auth Cerbos-gated platform capability
. header x-tenant-id uuid — tenant
. body patientId string — EMPI patient id
. body careContexts array — { referenceNumber, display, hiType }
request:
{ "patientId": "empi-patient-uuid", "careContexts": [ { "referenceNumber": "visit123_Prescription", "display": "Prescription", "hiType": "PRESCRIPTION" } ] }
response 202:
{ "skipped": false, "hipLinkSessions": ["…"], "publishSessions": ["…"], "errors": [] }
```

<!-- chapter: Encryption -->

## The crypto: ABDM Fidelius (real, not a stub)

`lib/fidelius-crypto.ts` implements the ABDM Fidelius convention directly on `node:crypto`
plus `@noble/curves` for the curve. This is the **default** path; the base64 stub only runs
when `ABDM_FIDELIUS_USE_STUB=true`.

```code lang=ts file=lib/fidelius-crypto.ts hl=1,5,9
// ECDH over BouncyCastle-Weierstrass Curve25519 (fidelius-curve25519-bc.ts, @noble/curves)
const sharedSecret = ecdhSharedSecretBc(ourPriv, peerPoint);
// salt = first 20 bytes of (peerNonce XOR ourNonce); iv = the last 12 bytes
const { salt, iv } = deriveSaltAndIv(peerNonceBytes, ourNonce);   // both nonces 32 bytes
// AES key = HKDF-SHA256(sharedSecret, salt, info="", 32 bytes)
const aesKey = deriveAesKey(sharedSecret, salt);
// AES-256-GCM; ciphertext = update || final || authTag(16)
const blob = encryptPayloadAesGcm(payloadJson, aesKey, iv);
```

Key facts the code actually enforces:

- **One ephemeral key pair per push.** `encryptBundlesForPeer` generates a single ephemeral
  keypair + nonce; **all** entries in a push share the same HIP `keyMaterial`.
- **`keyToShare` is X509/SPKI.** `encryptBundles` throws unless the exported public key is
  SPKI (`isSpkiKeyToShareB64`) — that's what goes into
  `keyMaterial.dhPublicKey.keyValue`.
- **keyMaterial envelope** (`hip-push-envelope.ts`): `cryptoAlg: "ECDH"`,
  `curve: "Curve25519"`, `parameters: "Curve25519/32byte random key"`, `nonce`. Verified
  against Java/BouncyCastle test vectors (`test-fixtures/fidelius-*-vector.json`).

```callout tone=warning title="Checksum default is a literal placeholder"
`hip-push-checksum.ts` defaults to mode `"literal"`, which returns the literal string
`"string"` (production-HIMS / abdi-lims parity — the certified HIP historically sent that).
Real integrity hashes (`sha256` of ciphertext, or `md5` of plaintext) only turn on via
`ABDM_M3_PUSH_CHECKSUM_MODE`. Don't mistake the default for a computed checksum.
```

<!-- chapter: State machines -->

## Session state — the FSMs that correlate callbacks

Every flow is one `abdm_sessions` row keyed by `flow_kind`. Callbacks correlate back to
their session by **transactionId** (`txn_id`), **requestId** (`request_id`), or a flow
identifier like `linkRefNumber` stored in `context`. State-name constants are the single
source of truth in `packages/ts-sdk-abha/src/constants/fsm-states.ts`.

```diagram title="User-initiated link FSM (M2_USER_LINK_STATES)"
stateDiagram-v2
  [*] --> DISCOVERY_RECEIVED
  DISCOVERY_RECEIVED --> PATIENT_MATCHED: EMPI match
  DISCOVERY_RECEIVED --> NO_MATCH: no match
  PATIENT_MATCHED --> ON_DISCOVER_RESPONDED: contexts sent
  ON_DISCOVER_RESPONDED --> LINK_INIT_RECEIVED: init callback
  LINK_INIT_RECEIVED --> OTP_DISPATCHED: OTP sent
  OTP_DISPATCHED --> LINK_CONFIRMED: OTP valid
  OTP_DISPATCHED --> FAILED: OTP invalid / attempts exceeded
  LINK_CONFIRMED --> LINKED: on-confirm + publish
  LINKED --> [*]
  NO_MATCH --> [*]
  FAILED --> [*]
```

```diagram title="HIP data-serving FSM (M3_HIP_STATES)"
stateDiagram-v2
  [*] --> DATA_REQUESTED
  DATA_REQUESTED --> ACKNOWLEDGED: on-request ack ok
  DATA_REQUESTED --> FAILED: ack failed (ABDM-1017)
  ACKNOWLEDGED --> BUNDLES_FETCHED: RF bundles found
  BUNDLES_FETCHED --> BUNDLES_ENCRYPTED: Fidelius encrypt
  BUNDLES_ENCRYPTED --> BUNDLES_PUSHED: POST dataPushUrl
  BUNDLES_PUSHED --> ACKNOWLEDGED: notify CM ok
  BUNDLES_FETCHED --> FAILED: encrypt/push error
  ACKNOWLEDGED --> [*]
  FAILED --> [*]
```

The HIP-initiated link FSM is shorter: `INIT → CC_LINK_REQUESTED → CC_LINK_CONFIRMED →
LINKED` (or `FAILED`). Consent notify: `CONSENT_NOTIFIED → CONSENT_PERSISTED → ACKED` (or
`FAILED`).

<!-- chapter: Real vs mocked -->

## What is real, and what is sandbox scaffolding

Be honest about the milestone's edges — several pieces are gated behind env flags for local
and sandbox running.

```callout tone=decision title="Real by default"
- **Fidelius crypto is real** — Curve25519 ECDH + HKDF-SHA256 + AES-256-GCM, verified
  against Java vectors. The base64 stub is opt-in (`ABDM_FIDELIUS_USE_STUB=true`).
- **FHIR bundles are real** — the four `py-sdk-fhir` composers produce NRCeS-profiled
  document bundles from actual OPD clinical data (104 tests green).
- **Sessions, link tokens, OTP store, consent artefacts** — all persisted in Postgres
  (`integration_hub` schema), tenant-scoped.
- **The push path** — fetch-from-RF → encrypt → POST `dataPushUrl` → notify is fully wired.
```

```callout tone=warning title="Sandbox / dev scaffolding (env-gated)"
- `ABDM_M2_MOCK_PLATFORM=true` — canned patient + care contexts (skips EMPI/RF) so the
  user-initiated flow runs without real platform data.
- `ABDM_ALLOW_INSECURE_CALLBACKS` — skips consent-artefact signature verification (returns
  valid) for sandbox where you don't have the CM cert.
- `skipOutboundGatewayInDev()` — suppresses real outbound gateway POSTs during local
  inbound-simulation testing.
- Locally-generated link OTPs are **logged** (`abdm.m2.link_init.otp_generated`) for dev
  visibility — production relies on the SMS provider path.
- Checksum defaults to the literal `"string"` (see the crypto chapter).
```

```callout tone=risk title="Doc-vs-code discrepancy to know about"
`docs/guides/abdm-adapter-m2-runbook.md` still labels HI data transfer **"Done (stub
crypto)" / "(dev stub crypto)"** in its status table. That is **stale** — the code default
is the real Fidelius implementation (`fidelius-crypto.ts`); the stub is opt-in only. Trust
the code.
```
