---
title: "ABDM Milestone 1: ABHA creation & verification"
objective: How the HIMS platform creates and verifies India-national ABHA health IDs against the ABDM gateway — the components, the session-auth model, the M1 flows, and the state machine that ties them together.
---

**Milestone 1 (M1)** is the "get an ABHA number" layer. ABHA (Ayushman Bharat Health
Account) is India's national patient health ID; ABDM is the government exchange it
lives on. M1 covers three things a front-desk operator or patient can do — all
purely *synchronous* HTTP against the NHA (National Health Authority) gateway:

- **Create** a brand-new ABHA via **Aadhaar OTP** (the enrolment chain).
- **Login / verify** an *existing* ABHA via mobile OTP, ABHA-number OTP, or ABHA-address OTP.
- **Fetch profile / ABHA card / QR** once a session holds a profile token.

> M1 has **no asynchronous gateway callbacks** — every step is a request→response.
> Callbacks (and their JWS verification) only appear in M2 linking and M3 consent/data.
> That distinction drives half the architecture below, so it is called out explicitly.

```callout tone=warning title="Doc drift — the runbook names a service and schema that no longer exist"
`docs/guides/abdm-adapter-m1-runbook.md` describes a **standalone `abdm-adapter-svc`**
on port **3007** with tables in schema **`abdm_adapter`**. Both are stale. Commit
`45b33f40 refactor(integration-hub): migrate abdm-adapter to integration-hub` folded
the adapter into **`modules/integration-hub`**, served by **`services/integration-hub-svc`**;
`services/abdm-adapter-svc/` is now just an orphaned `.env`. The live schema constant is
`INTEGRATION_HUB_SCHEMA_NAME = "integration_hub"` (`schema/tables.ts:37`), so the table is
**`integration_hub.abdm_sessions`**. Trust the code paths in this page over the runbook.
```

<!-- chapter: Architecture -->

## The pieces

Four layers cooperate. The browser wizard talks to **one** HTTP surface
(`/api/abdm/v1`), which lives inside integration-hub; integration-hub is the only
thing that ever holds NHA credentials or talks to the gateway.

```diagram title="M1 component map" look=clean
flowchart LR
  subgraph browser["services/web — features/abha"]
    W["ABHA wizard (React)"]
    FC["abdm-client.ts + m1-enrolment.ts"]
  end
  subgraph svc["services/integration-hub-svc"]
    R["abdm router (M0/M1 identity-only)"]
    UC["use-cases/m1/* (functions)"]
    GC["HttpGatewayClient"]
    DB[("integration_hub.abdm_sessions")]
  end
  subgraph pkg["packages/ts-sdk-abha"]
    T["protocol/m1 types + validators + FSM state names"]
  end
  GW["NHA / ABDM gateway (external)"]

  W --> FC
  FC -->|"POST/GET /api/abdm/v1/m1/*"| R
  R --> UC
  UC --> GC
  UC <--> DB
  GC -->|"client_credentials + RSA-encrypted ids"| GW
  UC -. "imports types only" .-> T
  R -. "imports types only" .-> T
```

**Why integration-hub owns it (not a separate service).** The adapter began life as a
standalone service to *unblock dev* under the Phase-1 "HTTP-first" decision. Once the
event/HTTP boundaries settled it was migrated in, so ABHA (M1), linking (M2) and
consent/data (M3) share one deployable, one DB schema, one auth pipeline. The web app
can still point at a different origin via `VITE_ABDM_ADAPTER_ORIGIN`
(`features/abha/api/abdm-client.ts`) if the adapter is ever split out again.

```filetree
. modules/integration-hub/src/integrations/abdm/
.   router.ts — mounts M0/M1 (identity-only) + M2/M3 (Cerbos-gated) child scopes
.   rest-handlers/m1/m1-routes.ts — every /m1/* Fastify route
.   use-cases/m1/*.ts — one function per step (enrol, login, verify, profile)
.   data-access/gateway-client.http.ts — HttpGatewayClient (session + ABHA API calls)
.   lib/rsa-abdm-login-id.ts — RSA-OAEP encrypt of Aadhaar / OTP
.   lib/abdm-signature-verifier.ts — inbound callback JWS (M2/M3, not M1)
.   domain/session.ts — AbdmSession shape + flow discriminated union
.   schema/tables.ts — integration_hub.abdm_sessions
. packages/ts-sdk-abha/src/protocol/m1/ — request/response contracts (shared types)
. packages/ts-sdk-abha/src/constants/fsm-states.ts — canonical FSM state names
. services/web/src/features/abha/ — wizard UI + api/ client
```

Layer roles at a glance:

| Layer | Path | Role |
|---|---|---|
| **Types/contracts** | `packages/ts-sdk-abha/src/protocol/m1` | Shared request/response shapes + FSM state names. **No runtime**, no secrets — imported by both hub and web. |
| **HTTP adapter** | `services/integration-hub-svc` + `modules/integration-hub/.../abdm` | Terminates `/api/abdm/v1`, runs the M1 use-cases, holds the session table, is the *only* holder of NHA credentials. |
| **Gateway (external)** | NHA / ABDM | Issues the client-credentials bearer, the RSA public cert, and the ABHA/enrolment APIs. |
| **Web** | `services/web/src/features/abha` | Wizard UI; calls our endpoints only. Never sees Aadhaar encryption or gateway tokens. |

<!-- chapter: Gateway auth (two directions) -->

## How WE authenticate to the gateway

`HttpGatewayClient` (`data-access/gateway-client.http.ts`) is the single egress point.
Two credential mechanics matter for M1:

**1. Session bearer — OAuth2 client-credentials.** On first call it POSTs
`clientId` / `clientSecret` / `grantType:"client_credentials"` to
`/api/hiecm/gateway/v3/sessions`, caches the `accessToken` until
`expiresIn − 90s`, and single-flights concurrent refreshes. Both GETs (and the cert
fetch) and POSTs — including OTP request/verify — retry **once** on a `401` after
invalidating the cached bearer. It is an auth-refresh retry, not a general retry of any
failure: a non-401 error is thrown straight through.

```code lang=ts file=data-access/gateway-client.http.ts hl=3-7
// fetchBearerToken() — no Authorization header on the session POST itself
const body: NhaGatewaySessionRequestBody = {
  clientId,          // secrets.resolve("env:ABDM_SANDBOX_CLIENT_ID")
  clientSecret,      // secrets.resolve("env:ABDM_SANDBOX_CLIENT_SECRET")
  grantType: "client_credentials",
};
const url = joinUrl(this.gatewayBaseUrl, "/api/hiecm/gateway/v3/sessions");
// → caches { token, validUntilMs = now + expiresIn*1000 − 90_000 }
```

**2. Field-level encryption — Aadhaar & OTP never travel in clear.** Before any
enrol/login step, the client fetches the NHA public cert
(`GET /v3/profile/public/certificate`, cached 1h) and RSA-encrypts the sensitive
identifier. `lib/rsa-abdm-login-id.ts` uses **RSA-OAEP with SHA-1 / MGF1**
(`RSA/ECB/OAEPWithSHA-1AndMGF1Padding`, per the NHA integrator guide) — the Aadhaar
number, and later the 6-digit OTP, are each encrypted into the `loginId` / `otpValue`
field.

```code lang=ts file=use-cases/m1/enrol-aadhaar-otp-request.ts hl=2-3
const cert = await deps.gateway.getPublicCertificate();
const loginId = encryptLoginIdWithAbdmPublicKey(cert.publicKey, input.aadhaarNumber);
//              RSA-OAEP(SHA-1) → base64 ciphertext, the value NHA expects
const body = { txnId: "", scope: ["abha-enrol"], loginHint: "aadhaar", loginId, otpSystem: "aadhaar" };
```

## How the gateway authenticates callbacks to US

M1 needs none of this — but the same client also serves M2/M3, whose gateway
**callbacks** land on a separate `/api/v3` scope (outside the platform JWT gate) and are
verified by `lib/abdm-signature-verifier.ts`: the inbound `Authorization: Bearer <JWS>`
is validated (RS256) against the gateway's JWKS, with issuer/audience enforced.

```code lang=ts file=lib/abdm-signature-verifier.ts hl=1,6-10
if (allowInsecureAbdmCallbacks()) return true;   // dev/sandbox bypass
// ...
const issuer = process.env["ABDM_GATEWAY_JWT_ISSUER"]?.trim();
const audience = process.env["ABDM_GATEWAY_JWT_AUDIENCE"]?.trim();
if (isNonDevNodeEnv() && (!issuer || !audience)) return false; // prod MUST set both
await jwtVerify(token, getGatewayJwks(), {
  algorithms: ["RS256"],
  ...(issuer ? { issuer } : {}),
  ...(audience ? { audience } : {}),
});
```

```callout tone=risk title="allowInsecureAbdmCallbacks — a dev-only bypass with a prod gate"
`allowInsecureAbdmCallbacks()` returns **true whenever `NODE_ENV` is not `production`/`staging`**,
short-circuiting JWS verification so sandbox callbacks work without gateway keys. In prod/staging
it flips off *unless* `ABDM_ALLOW_INSECURE_CALLBACKS=true` (or the `INTEGRATION_HUB_*` alias) is
set, and JWS verify then **hard-fails** if `ABDM_GATEWAY_JWT_ISSUER` / `_AUDIENCE` are missing. Never
set the insecure flag in a real deployment. (M1 routes are unaffected — they carry no callbacks.)
```

**Two auth planes on one service** — worth internalising:

| Plane | Applies to | Mechanism | Where |
|---|---|---|---|
| **Inbound platform** | all `/api/abdm/v1/*` (M1/M2/M3) | our platform **JWT** (identity plugin) + tenant header; M2/M3 add a Cerbos PEP | `main.ts` identityPlugin, `router.ts` |
| **Outbound to gateway** | M1/M2/M3 egress | client-credentials **bearer** + RSA field encryption | `HttpGatewayClient` |
| **Inbound gateway callback** | `/api/v3/*` (M2/M3 only) | gateway **JWS** via JWKS | `abdm-signature-verifier.ts` |

<!-- chapter: M1 flows -->

## (a) Create ABHA via Aadhaar OTP — the enrolment chain

The headline M1 flow. `sessionId` from step 1 threads through every later call. The
tricky branch is **mobile verification**: NHA only requires it when the patient's
primary mobile differs from the Aadhaar-linked one.

```diagram title="ABHA creation (abdm.m1.aadhaar-otp.v1)"
sequenceDiagram
  participant W as Web wizard
  participant H as integration-hub (/m1)
  participant G as NHA gateway
  W->>H: POST /m1/enrol/aadhaar/otp {aadhaarNumber}
  H->>G: GET /v3/profile/public/certificate
  H->>G: POST /v3/enrollment/request/otp (RSA loginId)
  G-->>H: {txnId}
  Note over H: create session, state AADHAAR_OTP_REQUESTED
  H-->>W: {sessionId, txnId}
  W->>H: POST /m1/enrol/aadhaar/verify {sessionId, otp, mobile, useAadhaarLinkedMobile?}
  H->>G: POST /v3/enrollment/enrol/byAadhaar (RSA otpValue)
  G-->>H: {healthIdNumber, xToken, tToken, ABHAProfile.mobile}
  alt mobile linked OR flag=true
    Note over H: state MOBILE_OTP_VERIFIED (skip 4-5), mobileVerifySkipped=true
  else different mobile
    Note over H: state ABHA_CREATED
    W->>H: POST /m1/enrol/mobile-verify/otp then /verify
    Note over H: state MOBILE_OTP_VERIFIED
  end
  W->>H: GET /m1/abha-address/suggestions?sessionId
  H->>G: GET /v3/enrollment/enrol/suggestion (header Transaction_Id)
  W->>H: POST /m1/abha-address {sessionId, abhaAddress}
  H->>G: POST /v3/enrollment/enrol/abha-address
  Note over H: state ADDRESS_CREATED
  W->>H: GET /m1/profile?sessionId
  H->>G: GET /v3/profile/account (X-token: Bearer <profile JWT>)
  H-->>W: {profile}
```

The skip decision is data-driven: `resolveSkipEnrolMobileVerify(useAadhaarLinkedMobile, nha)`
honours an explicit flag, else infers from a non-null `ABHAProfile.mobile` in the NHA
response (`use-cases/m1/enrol-aadhaar-verify-request.ts`). The verify response echoes
`mobileVerifySkipped` so the wizard knows whether to render the mobile step.

## (b) Login / verify an existing ABHA

Three entry channels, one shared engine (`lib/m1-login-otp-flow.ts`). "Login"
(`abdm.m1.login.v1`) and "verify-existing" (`abdm.m1.verify-existing.v1`) are distinct
flow kinds but share the `INIT → OTP_REQUESTED → OTP_VERIFIED → LINKED` state set.

```diagram title="Existing-ABHA login (mobile / abha-number / abha-address OTP)"
sequenceDiagram
  participant W as Web wizard
  participant H as integration-hub (/m1)
  participant G as NHA gateway
  W->>H: POST /m1/login/otp or /login/mobile/otp or /login/aadhaar/otp
  H->>G: GET /v3/profile/public/certificate
  H->>G: POST login request/otp (RSA loginId)
  G-->>H: {txnId}
  Note over H: create session, state OTP_REQUESTED
  H-->>W: {sessionId, txnId}
  W->>H: POST /m1/login/verify {sessionId, otp}
  H->>G: POST login verify (RSA otpValue)
  alt single account
    G-->>H: {xToken, tToken}
    Note over H: state OTP_VERIFIED, needsUserSelection=false
  else multiple accounts
    G-->>H: {accounts[], token}
    Note over H: state OTP_VERIFIED, stash transferToken, needsUserSelection=true
    W->>H: POST /m1/login/verify/user {sessionId, abhaNumber}
  end
  H-->>W: {accounts?, xToken issued to session}
```

`m1LoginOtpVerify` branches three ways after verify: **PHR abha-address** login gets
profile tokens straight back; a **multi-account** profile login stashes a transfer token
and demands `verify/user` selection; a **single-account** login stores tokens directly.
The `verify-existing` variants (`/m1/verify/abha-number/*`, `/m1/verify/abha-address/*`)
reuse the exact same helper with `expectedFlowKind = "abdm.m1.verify-existing.v1"`.

## (c) Profile / ABHA card / QR fetch

Once a session holds an `xToken`, the profile reads are thin pass-throughs. The token is
sent as an `X-token: Bearer <profile JWT>` header — **per session**, not a global adapter
credential.

```diagram title="Profile & card reads (session xToken required)"
sequenceDiagram
  participant W as Web wizard
  participant H as integration-hub (/m1)
  participant G as NHA gateway
  W->>H: GET /m1/profile?sessionId
  Note over H: load session, require xToken
  H->>G: GET /v3/profile/account (X-token Bearer)
  G-->>H: {ABHAProfile}
  H-->>W: {sessionId, profile}
  W->>H: GET /m1/profile/abha-card?sessionId
  H->>G: GET /v3/profile/account/abha-card (X-token Bearer)
  G-->>H: PNG / base64 card
  H-->>W: {card}
```

`/m1/profile/phr-card` and `/m1/profile/qr-code` follow the identical shape. The
GET-retry-once-on-401 behaviour of `HttpGatewayClient` covers a stale *gateway* bearer,
but a stale **session** `xToken` surfaces as an upstream error to the caller.

<!-- chapter: Session state machine -->

## `abdm_sessions` — one row per flow

Every M1 interaction is anchored to a session row keyed on `(iq_tenant_id, session_id)`.
The row carries the FSM `state`, the NHA `txn_id`, and the profile tokens (`x_token` /
`t_token`). `context` is a JSON scratchpad (masked Aadhaar, enrol snapshot, login
scopes, selected accounts…).

```data-model title="integration_hub.abdm_sessions (M1 columns)"
. abdm_sessions
.   iq_tenant_id uuid PK — Citus distribution key; matches tenant header
.   session_id uuid PK — returned to the client, threads the chain
.   flow_kind text — abdm.m1.aadhaar-otp.v1 | login.v1 | verify-existing.v1
.   state text — FSM state (see below)
.   txn_id text — NHA transaction id for the current step
.   request_id text — correlation id
.   x_token text — NHA profile JWT (encrypted at rest unless dev-plaintext flag)
.   t_token text — NHA transfer token
.   context jsonb — per-flow scratchpad (masked Aadhaar, snapshots, accounts)
.   created_at timestamptz
.   updated_at timestamptz
```

The Aadhaar-OTP creation flow has the richest lifecycle (`fsm-states.ts`
`M1_AADHAAR_OTP_STATES`). Note the two paths into `MOBILE_OTP_VERIFIED` — the direct
"bypass" edge is the linked-mobile case:

```diagram title="abdm.m1.aadhaar-otp.v1 lifecycle"
stateDiagram-v2
  [*] --> INIT
  INIT --> AADHAAR_OTP_REQUESTED: enrol/aadhaar/otp
  AADHAAR_OTP_REQUESTED --> ABHA_CREATED: verify (different mobile)
  AADHAAR_OTP_REQUESTED --> MOBILE_OTP_VERIFIED: verify (linked mobile, bypass)
  ABHA_CREATED --> MOBILE_OTP_REQUESTED: mobile-verify/otp
  MOBILE_OTP_REQUESTED --> MOBILE_OTP_VERIFIED: mobile-verify/verify
  MOBILE_OTP_VERIFIED --> ADDRESS_CREATED: abha-address
  ADDRESS_CREATED --> LINKED
  AADHAAR_OTP_REQUESTED --> FAILED
  ABHA_CREATED --> FAILED
  LINKED --> [*]
```

The login and verify-existing flows share the simpler `M1_SIMPLE_OTP_STATES`:

```diagram title="abdm.m1.login.v1 / verify-existing.v1 lifecycle"
stateDiagram-v2
  [*] --> INIT
  INIT --> OTP_REQUESTED: login/otp
  OTP_REQUESTED --> OTP_VERIFIED: login/verify
  OTP_VERIFIED --> LINKED: verify/user (multi-account) or direct
  OTP_REQUESTED --> FAILED
  LINKED --> [*]
```

State names are **not** string-typed at call sites — they come from
`packages/ts-sdk-abha/src/constants/fsm-states.ts`, the single source shared by
telemetry, frontend status pills, and the session domain union in `domain/session.ts`.

<!-- chapter: Our API -->

## Endpoints a frontend dev calls

Base path **`/api/abdm/v1`** (outer `/api` + inner `/abdm/v1` scope in `main.ts`).
Every route requires **both** a platform JWT (identity plugin) and a tenant header
(`x-tenant-id` or `iq_tenant_id`). M1 routes are **identity-only** — no Cerbos PEP (that
is reserved for M2/M3 in a nested child scope, per `router.ts`).

```api-endpoint method=POST path=/api/abdm/v1/m1/enrol/aadhaar/otp title="Step 1 — request Aadhaar OTP (creates the session)"
. auth Platform JWT (Bearer) — identity plugin
. header x-tenant-id uuid — or iq_tenant_id
. body aadhaarNumber string — 12 digits; RSA-encrypted server-side before it reaches NHA
request:
{ "aadhaarNumber": "999999990019" }
response 200:
{ "sessionId": "3f1c…-uuid", "txnId": "nha-txn-id", "message": "OTP sent" }
response 502:
{ "error": "Upstream", "message": "NHA: …", "code": "ABDM-XXXX" }
```

```api-endpoint method=POST path=/api/abdm/v1/m1/enrol/aadhaar/verify title="Step 2 — verify OTP, mint the ABHA"
. auth Platform JWT (Bearer)
. header x-tenant-id uuid
. body sessionId string — from step 1
. body otp string — 6 digits; RSA-encrypted server-side
. body mobile string — 10 digits, the primary number for the ABHA
. body useAadhaarLinkedMobile boolean — optional; true skips mobile-verify steps 4-5
request:
{ "sessionId": "3f1c…-uuid", "otp": "123456", "mobile": "9876543210", "useAadhaarLinkedMobile": true }
response 200:
{ "sessionId": "3f1c…-uuid", "txnId": "nha-txn-id", "healthIdNumber": "91-1234-5678-9012", "isNew": true, "mobileVerifySkipped": true, "message": "ABHA enrolment step completed" }
response 409:
{ "error": "CONFLICT", "message": "session state must be AADHAAR_OTP_REQUESTED, got ABHA_CREATED" }
```

```api-endpoint method=GET path=/api/abdm/v1/m1/sessions/{sessionId} title="Session state + nextStep hint (poll when unsure)"
. auth Platform JWT (Bearer)
. header x-tenant-id uuid
. path sessionId uuid — the session threading the chain
response 200:
{ "sessionId": "3f1c…-uuid", "flowKind": "abdm.m1.aadhaar-otp.v1", "state": "MOBILE_OTP_VERIFIED", "nextStep": "abha-address" }
response 400:
{ "error": "Bad Request", "message": "sessionId must be a UUID" }
```

The remaining `/m1/*` routes (`abha-address/suggestions`, `abha-address`, `profile`,
`profile/abha-card`, `profile/phr-card`, `profile/qr-code`, and all the `login/*`,
`verify/*`, `profile/*/update/*` variants) follow the same envelope: gateway errors →
`{error:"Upstream", message, code}` with the NHA HTTP status; use-case validation errors
→ `{error, message}` with a 4xx (`m1-routes.ts` `sendUpstream` / `sendUseCase`).

<!-- chapter: Config & running -->

## Environment & running

```callout tone=info title="Minimum env to exercise M1 against the NHA sandbox"
Credentials live in the service `.env`; base URLs default to the ABDM sandbox.
- **`ABDM_SANDBOX_CLIENT_ID` / `ABDM_SANDBOX_CLIENT_SECRET`** — NHA sandbox client creds (resolved via `secrets.resolve("env:…")`). **Required.**
- **`DATABASE_URL`** (or `ABDM_DATA_DATABASE_URL`) — Postgres holding `integration_hub.abdm_sessions`.
- **`JWKS_URL` / `JWT_ISSUER` / `JWT_AUDIENCE`** — platform identity; `validateAuthConfig()` throws at boot if unset (there is **no opt-out** — a service terminating ABHA APIs must verify tokens).
- **`ABDM_GATEWAY_BASE_URL`** (default `https://dev.abdm.gov.in`) and **`ABDM_ABHA_API_BASE_URL`** (default `https://abhasbx.abdm.gov.in/abha/api`).
- Callback JWS (M2/M3 only): `ABDM_GATEWAY_JWKS_URL`, `ABDM_GATEWAY_JWT_ISSUER`, `ABDM_GATEWAY_JWT_AUDIENCE`; dev bypass `ABDM_ALLOW_INSECURE_CALLBACKS`.
```

Smoke the gateway wiring before touching enrolment — this proves creds + cert without
creating a session row:

```code lang=bash file="M0 smoke"
curl -sS \
  -H 'x-tenant-id: 00000000-0000-4000-8000-0000000000aa' \
  -H 'Authorization: Bearer <platform-jwt>' \
  http://localhost:<port>/api/abdm/v1/m0/gateway/session
# → { ok:true, gateway:{tokenValidUntilApprox}, certificate:{encryptionAlgorithm, publicKeyFingerprint} }
```

```callout tone=decision title="Where to look next"
M2 (care-context linking) and M3 (consent + health-data exchange) build directly on this
session table and the same `HttpGatewayClient` — but add the **inbound callback** plane
(`/api/v3` + JWS verification) and a **Cerbos PEP** on their platform routes. Those are
covered in the M2 and M3 explainers. The FSM specs live in
`docs/architecture/lld/integration-platform/02-fsm-specifications.md`; the (stale-in-parts)
operational runbook is `docs/guides/abdm-adapter-m1-runbook.md`.
```
