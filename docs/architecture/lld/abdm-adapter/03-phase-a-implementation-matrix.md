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

- Config file: **`services/abdm-adapter-svc/.env`** only (loaded at boot).
- Variable: **`ABDM_DATA_DATABASE_URL`** — `postgresql://…` or `postgresql+psycopg://…` (dialect suffix stripped for Node `pg`).
- Migrate: `pnpm --filter @hims/abdm-adapter-svc db:migrate` (uses same `.env`).

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
| Done | `POST /api/abdm/v1/m1/enrol/mobile/otp` + verify | Standalone mobile enrol (`auth/byAbdm`) | **Not** Phase A Aadhaar chain — separate `abdm.m1.mobile-otp.v1` |
| Done | Login + verify-existing platform routes | `profile/login/*` | §6–§7 |

### LLD vs Postman (important)

- **[02-m1-flows.md](./02-m1-flows.md) §3** historically referenced `…/abha-address/suggestion`. The **Postman collection** and **adapter** use **`GET /v3/enrollment/enrol/suggestion`** — §02 is updated to match.
- **§2 “Enrol via Mobile OTP”** (`abdm.m1.mobile-otp.v1`) is **standalone** (`POST …/m1/enrol/mobile/otp`). Phase A **Aadhaar chain** uses `…/mobile-verify/…`; ABHA address steps require session state **`OTP_VERIFIED`** after mobile-verify confirm.

## Staging / production checklist (PR review)

| Item | Status |
|------|--------|
| `ENABLE_AUTH=true` in staging/prod | **Required** — service logs error when `NODE_ENV` is production/staging and auth is off |
| Encrypt `x_token` / `t_token` at rest | **Open** — document in schema; implement before prod |
| Whitelist `context` JSONB (no full NHA bodies) | **Done** |
| `fetch` timeout to NHA | **Done** — `ABDM_GATEWAY_TIMEOUT_MS` (default 30s) |
| Aadhaar resend mask check | **Done** — fail closed |
| Enrol state machine (mobile before address) | **Done** — `OTP_VERIFIED` required for address APIs |
| Session TTL | **Partial** — `context.expiresAt`; DB cleanup job **open** |
| Full sandbox e2e | **Open** |
| Rate limiting on OTP | **Open** |
| `ts-sdk-abha` build before serve | **Done** — `abdm-adapter-svc:serve` → `dependsOn: ts-sdk-abha:build` |

## Types and ports (robust layering)

| Layer | Location | Role |
|-------|----------|------|
| NHA / HIMS wire DTOs | `packages/ts-sdk-abha/src/protocol/m1/*.ts` | Serializable request/response shapes |
| Session aggregate | `modules/abdm-adapter/src/domain/session.ts` | `AbdmSession`, `AbdmFlowKind`, `AbdmSessionState` |
| Ports | `modules/abdm-adapter/src/ports.ts` | `AbdmSessionsPort`, `GatewayClient`, `SecretsClient`, `AbdmAdapterDeps` |
| Use-cases | `modules/abdm-adapter/src/use-cases/m1/*.ts` | One exported function per file; `(input, deps, iqTenantId)` |
| HTTP | `modules/abdm-adapter/src/rest-handlers/m1/m1-routes.ts` | Fastify registrations |

## Next phase

- Email verification link (enrol chain); Verify User (mobile login); AJV on all Aadhaar handlers; full gated sandbox e2e; OTP rate limits; token encryption at rest; session cleanup job.

## Related

- Operator runbook: [`docs/guides/abdm-adapter-m1-runbook.md`](../../../guides/abdm-adapter-m1-runbook.md)
- Overview: [01-overview.md](./01-overview.md)
- M1 flow catalogue: [02-m1-flows.md](./02-m1-flows.md)
