# ABDM Adapter — LLD §02 M1 Flows

The first sprint covers M1 (ABHA identity). All flows are request-response from server side; the gateway issues no asynchronous callbacks in M1, so no inbound callback dispatcher is needed yet.

**Source spec:** [`docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md`](../../../external/abdm/v3-m1-abha-v3-apis-creation-verification.md) + [`docs/external/abdm-wrapper/docs/wrapperV3.yaml`](../../../external/abdm-wrapper/).

**Reference impl:** `hims/abdi-lims-backed/src/services/milestone1CreationService.ts` and `milestone1LoginService.ts` in the production HIMS. Useful for *what state to persist*; not useful for *code structure* — translate, do not copy.

---

## M1 endpoint groups

Each group corresponds to one file under `packages/ts-sdk-abha/src/protocol/m1/` (DTOs), one file under `modules/abdm-adapter/src/use-cases/m1/` (orchestration), and one Fastify route under `modules/abdm-adapter/src/rest-handlers/m1/`.

### 1. Enrol via Aadhaar OTP — `abdm.m1.aadhaar-otp.v1`

| Step | Platform endpoint                            | Gateway endpoint                          | State transition                       |
|------|----------------------------------------------|-------------------------------------------|----------------------------------------|
| 1    | `POST /api/abdm/v1/m1/enrol/aadhaar/otp`     | `POST /v3/enrollment/request/otp`          | `INIT` → `AADHAAR_OTP_REQUESTED`       |
| 1b   | `POST /api/abdm/v1/m1/enrol/aadhaar/otp/resend` | Same NHA path with **non-empty** `txnId` (Postman) | stays `AADHAAR_OTP_REQUESTED`, new `txn_id` |
| 2    | `POST /api/abdm/v1/m1/enrol/aadhaar/verify`  | `POST /v3/enrollment/enrol/byAadhaar`      | `AADHAAR_OTP_REQUESTED` → `ABHA_CREATED` (tokens persisted) |
| 2b   | `POST /api/abdm/v1/m1/enrol/mobile-verify/otp` | `POST /v3/enrollment/request/otp` (mobile) | `ABHA_CREATED` → `MOBILE_OTP_REQUESTED` |
| 2c   | `POST /api/abdm/v1/m1/enrol/mobile-verify/verify` | `POST /v3/enrollment/auth/byAbdm`     | `MOBILE_OTP_REQUESTED` → `MOBILE_OTP_VERIFIED` |

State written: `txn_id` (step 1 / resend response), `x_token` + `t_token` + new `txn_id` (step 2 response), `context` snapshot (NHA profile fields).

### 2. ABHA Address suggestions + creation

| Platform endpoint                            | Gateway endpoint (NHA / Postman)                    |
|----------------------------------------------|-----------------------------------------------------|
| `GET /api/abdm/v1/m1/abha-address/suggestions?sessionId=…` | `GET /v3/enrollment/enrol/suggestion` + header **`Transaction_Id`** |
| `POST /api/abdm/v1/m1/abha-address`          | `POST /v3/enrollment/enrol/abha-address`            |

Suggestions use **gateway** `Authorization` and **`Transaction_Id`** (session `txn_id`). After **create**, session moves **`ABHA_CREATED` → `ADDRESS_CREATED`** and `context` is updated with NHA response fields.

**Out of M1 scope:** standalone mobile-only ABHA creation and DL enrolment (`dl-flow`); use the Aadhaar chain below for mobile verify during enrolment.

### 3. Profile fetch + cards

Gateway calls: **`Authorization: Bearer <gateway access token>`** plus **`X-token: Bearer <session x_token>`** (values from `HttpGatewayClient` + session row).

| Platform endpoint                            | Gateway endpoint                          | Notes                              |
|----------------------------------------------|-------------------------------------------|------------------------------------|
| `GET /api/abdm/v1/m1/profile`                | `GET /v3/profile/account`                 | Reads `x_token` from session.      |
| `GET /api/abdm/v1/m1/profile/abha-card`      | `GET /v3/profile/account/abha-card`       | Returns base64 PDF.                |
| `GET /api/abdm/v1/m1/profile/phr-card`       | `GET /v3/profile/account/phr-card`        | Returns base64 PDF.                |
| `GET /api/abdm/v1/m1/profile/qr-code`        | `GET /v3/profile/account/qrCode`          | Returns base64 PNG.                |

No state transition — these are read-only against an existing session.

### 4. Profile update (mobile / email)

| Step | Platform endpoint                                  | Gateway endpoint                                                    |
|------|----------------------------------------------------|---------------------------------------------------------------------|
| 1    | `POST /api/abdm/v1/m1/profile/mobile/update/otp`   | `/api/v3/profile/account/mobile/update/request/otp`                |
| 2    | `POST /api/abdm/v1/m1/profile/mobile/update/verify`| `/api/v3/profile/account/mobile/update/verify/otp`                 |

Mirror flow for `email` swapping the path segment.

### 5. Login (existing ABHA) — `abdm.m1.login.v1`

| Step | Platform endpoint                            | Gateway endpoint                              |
|------|----------------------------------------------|-----------------------------------------------|
| 1    | `POST /api/abdm/v1/m1/login/otp`             | `POST /v3/profile/login/request/otp`          |
| 1b   | `POST /api/abdm/v1/m1/login/aadhaar/otp`     | Same (Aadhaar `loginHint`)                    |
| 1c   | `POST /api/abdm/v1/m1/login/mobile/otp`      | Same (mobile `loginHint`)                     |
| 2    | `POST /api/abdm/v1/m1/login/verify`          | `POST /v3/profile/login/verify`               |
| 2b   | `POST /api/abdm/v1/m1/login/verify/user`     | `POST /v3/profile/login/verify/user` + `T-token` |

Step 2 stores `x_token` when NHA returns a single token. **Mobile login** may return `accounts[]` — then step 2b selects ABHA and stores `x_token`. See [04-phase-b-implementation-matrix.md](./04-phase-b-implementation-matrix.md).

### 6. Verify existing ABHA — `abdm.m1.verify-existing.v1`

Used at frontdesk to confirm a patient's claimed ABHA before EMPI linkage. Uses the **same NHA login OTP paths** as §6 with `flowKind: abdm.m1.verify-existing.v1`.

| Step | Platform endpoint                                 | Gateway endpoint                    |
|------|---------------------------------------------------|-------------------------------------|
| 1    | `POST /api/abdm/v1/m1/verify/abha-number/otp`     | `POST /v3/profile/login/request/otp` |
| 2    | `POST /api/abdm/v1/m1/verify/abha-number/verify`| `POST /v3/profile/login/verify`      |
| 2b   | `POST /api/abdm/v1/m1/verify/abha-number/verify/user` | `POST /v3/profile/login/verify/user` |

Identical mirror exists for `abha-address` (`abha-address-login` scopes).

---

## Acceptance for M1 sprint completion

- All in-scope flow groups have populated DTO types in `@hims/ts-sdk-abha/protocol/m1/` — Phase A: [03-phase-a-implementation-matrix.md](./03-phase-a-implementation-matrix.md); Phase B verification: [04-phase-b-implementation-matrix.md](./04-phase-b-implementation-matrix.md).
- Use-case functions in `modules/abdm-adapter/src/use-cases/m1/` orchestrate gateway calls + session updates with no `console.log`-driven side effects.
- REST handlers wired in `rest-handlers/m1/` with request schema validation (Zod or AJV).
- `0000_abdm_adapter_schema.sql` migration applied locally; integration test exercises an Aadhaar-OTP enrolment end-to-end against the sandbox.
- Telemetry counters per `state` transition (deferred to Phase 1 — record the counter call sites as TODO markers now).
- Event publisher: emit `abdm.session.state-changed` on every `patch` that changes `state`. Payload includes `iqTenantId`, `sessionId`, `flowKind`, `prevState`, `newState`. (Consumed by EMPI for `patient.abha-linked` projection later.)

## What's NOT in scope for this sprint

- M2 callback registration (inbound HIP endpoints).
- M3 HIP push or HIU consent.
- Fidelius (deferred until M2/M3).
- Bulk telemetry / dashboards.
- Tenant onboarding UI for ABDM gateway credentials.
