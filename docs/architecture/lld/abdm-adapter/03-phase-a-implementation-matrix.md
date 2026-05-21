# ABDM Adapter — Phase A implementation matrix (M1 Aadhaar enrolment chain)

This document ties together three sources of truth:

1. **NHA / Postman** — [`Milestone_1_Postman_Collection_18_08_2025_postman_collection_d202ddf09a.json`](../../../../Milestone_1_Postman_Collection_18_08_2025_postman_collection_d202ddf09a.json) (URLs and bodies in the collection).
2. **Platform contract** — [`specs/openapi/abdm-adapter.v1.yaml`](../../../../specs/openapi/abdm-adapter.v1.yaml).
3. **Runtime** — `modules/abdm-adapter` + `services/abdm-adapter-svc`.

## Security

- **Never commit** real `DATABASE_URL`, `ABDM_DATA_DATABASE_URL`, `ABDM_SANDBOX_CLIENT_SECRET`, or any password to git. Use a **local** `.env` only.
- If credentials were pasted in chat or tickets, treat them as **exposed** and **rotate** them in NHA / Azure when possible.

## Postman base URLs (collection `raw` URLs)

These match the **defaults** in `services/abdm-adapter-svc/src/main.ts` (`ABDM_GATEWAY_BASE_URL`, `ABDM_ABHA_API_BASE_URL`):

| Purpose | Base URL (sandbox) |
|---------|---------------------|
| Gateway client-credentials session | `https://dev.abdm.gov.in` → `POST /api/hiecm/gateway/v3/sessions` |
| ABHA API (enrolment, profile, cert) | `https://abhasbx.abdm.gov.in/abha/api` → paths like `/v3/enrollment/...`, `/v3/profile/...` |

Override with env if your Postman environment uses different hosts.

## Node service: database URL

- Config: repo **`.env`** (Nx `envFile`) + **`services/abdm-adapter-svc/.env`** (layered in `load-env.ts`), same as other TS services.
- Variable: **`DATABASE_URL`** from root, or explicit **`ABDM_DATA_DATABASE_URL`** in service `.env` (migration and runtime prefer the latter when set).
- Migrate: `make db-migrate` or `npx nx run abdm-adapter-svc:db-migrate` (Nx loads root `.env`; `scripts/migrate.mjs` layers service `.env`).

## Phase A — implemented platform routes ↔ NHA (Aadhaar enrolment chain)

| Status | Platform route | NHA path (under ABHA base unless noted) | Notes |
|--------|----------------|----------------------------------------|--------|
| Done | `POST /api/abdm/v1/m1/enrol/aadhaar/otp` | `POST /v3/enrollment/request/otp` | `txnId` empty on first send |
| Done | `POST /api/abdm/v1/m1/enrol/aadhaar/otp/resend` | Same | `txnId` from session |
| Done | `POST /api/abdm/v1/m1/enrol/aadhaar/verify` | `POST /v3/enrollment/enrol/byAadhaar` | Stores `x_token`, `t_token`, new `txn_id` |
| Done | `POST /api/abdm/v1/m1/enrol/mobile-verify/otp` | `POST /v3/enrollment/request/otp` | Scopes `abha-enrol` + `mobile-verify`; **enrolment chain**, see below |
| Done | `POST /api/abdm/v1/m1/enrol/mobile-verify/verify` | `POST /v3/enrollment/auth/byAbdm` | |
| Done | `GET /api/abdm/v1/m1/abha-address/suggestions` | `GET /v3/enrollment/enrol/suggestion` | Header `Transaction_Id` = session `txn_id` (Postman + `milestone1.md`) |
| Done | `POST /api/abdm/v1/m1/abha-address` | `POST /v3/enrollment/enrol/abha-address` | |
| Done | `GET /api/abdm/v1/m1/profile` | `GET /v3/profile/account` | Gateway bearer + `X-token: Bearer <session x_token>` |
| Done | `GET /api/abdm/v1/m1/profile/abha-card` | `GET /v3/profile/account/abha-card` | Same headers |
| Done | `GET /api/abdm/v1/m1/profile/phr-card` | `GET /v3/profile/account/phr-card` | §4 |
| Done | `GET /api/abdm/v1/m1/profile/qr-code` | `GET /v3/profile/account/qrCode` | §4 |
| Done | `POST …/m1/profile/mobile/update/otp` etc. | `profile/account/request/otp` + `verify` | §5 — **not** enrolment-chain mobile verify |
| Done | Login + verify-existing platform routes | `profile/login/*` | §6–§7 |

### LLD vs Postman (important)

- **[02-m1-flows.md](./02-m1-flows.md) §3** historically referenced `…/abha-address/suggestion`. The **Postman collection** and **adapter** use **`GET /v3/enrollment/enrol/suggestion`** — §02 is updated to match.
- **Standalone mobile-only enrol** and **DL enrolment** are **out of M1 scope** (require `dl-flow` on NHA). Phase A **Aadhaar chain** uses `…/mobile-verify/…`; ABHA address steps require session state **`MOBILE_OTP_VERIFIED`** after mobile-verify confirm.

## Staging / production checklist (PR review)

| Item | Status |
|------|--------|
| `ENABLE_AUTH=true` in staging/prod | **Required** — service logs error when `NODE_ENV` is production/staging and auth is off |
| Encrypt `x_token` / `t_token` at rest | **Done** — AES-256-GCM via `ABDM_TOKEN_ENCRYPTION_KEY` (required staging/prod) |
| Whitelist `context` JSONB (no full NHA bodies) | **Done** |
| `fetch` timeout to NHA | **Done** — `ABDM_GATEWAY_TIMEOUT_MS` (default 30s) |
| Aadhaar resend mask check | **Done** — fail closed |
| AJV on Aadhaar chain + address + profile GETs | **Done** — `m1-route-schemas.ts` on routes |
| OTP body `timeStamp` in IST | **Done** — `abdmOtpTimestampIst()` (UTC+5:30, not server TZ) |
| FSM state names (aadhaar vs mobile-verify) | **Done** — `M1_AADHAAR_OTP_STATES` in `ts-sdk-abha` |
| Enrol state machine (mobile before address) | **Done** — `MOBILE_OTP_VERIFIED` required for address APIs |
| Session TTL | **Done** — `context.expiresAt`; cleanup: `services/abdm-adapter-svc/scripts/cleanup-expired-sessions.mjs` |
| Full sandbox e2e | **Done** — gated `m1-aadhaar-chain.sandbox.integration.test.ts` (`pnpm -F @hims/abdm-adapter test:sandbox`) |
| Rate limiting on OTP | **Done** — `assertM1OtpRateLimit` on all OTP-dispatch paths (in-process; Redis later) |
| Mobile-verify unit tests | **Done** — send + confirm use-case tests |
| `ts-sdk-abha` build before serve | **Done** — `abdm-adapter-svc:serve` → `dependsOn: ts-sdk-abha:build` |

## Types and ports (robust layering)

| Layer | Location | Role |
|-------|----------|------|
| NHA / HIMS wire DTOs | `packages/ts-sdk-abha/src/protocol/m1/*.ts` | Serializable request/response shapes |
| Session aggregate | `modules/abdm-adapter/src/domain/session.ts` | `AbdmSession`, `AbdmFlowKind`, `AbdmSessionState` |
| Ports | `modules/abdm-adapter/src/ports.ts` | `AbdmSessionsPort`, `GatewayClient`, `SecretsClient`, `AbdmAdapterDeps` |
| Use-cases | `modules/abdm-adapter/src/use-cases/m1/*.ts` | One exported function per file; `(input & { iqTenantId }, deps)` |
| HTTP | `modules/abdm-adapter/src/rest-handlers/m1/m1-routes.ts` | Fastify registrations |

## Next phase

- Email verification link (enrol chain) — optional enrol step; see Postman / `milestone1.md` §3.

Phase B (verification) is tracked in [04-phase-b-implementation-matrix.md](./04-phase-b-implementation-matrix.md).

## Related

- Operator runbook: [`docs/guides/abdm-adapter-m1-runbook.md`](../../../guides/abdm-adapter-m1-runbook.md)
- Overview: [01-overview.md](./01-overview.md)
- M1 flow catalogue: [02-m1-flows.md](./02-m1-flows.md)
