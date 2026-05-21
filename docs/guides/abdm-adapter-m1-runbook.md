# ABDM Adapter — M1 runbook (local dev)

This document describes **Milestone 1 (M1)** behaviour implemented in the `abdm-adapter` module and **`abdm-adapter-svc`** service: how to run it, which environment variables matter, how the database is used, and which HTTP APIs exist.

**Authoritative API contract (spec-first):** [`specs/openapi/abdm-adapter.v1.yaml`](../../specs/openapi/abdm-adapter.v1.yaml).

**Full sandbox E2E (M1 → M2 link → consent → records) and production cutover:** [`abdm-adapter-e2e-and-production.md`](./abdm-adapter-e2e-and-production.md).

**Architecture context:** [`docs/architecture/lld/abdm-adapter/02-m1-flows.md`](../architecture/lld/abdm-adapter/02-m1-flows.md) and [**Phase A matrix**](../architecture/lld/abdm-adapter/03-phase-a-implementation-matrix.md) (Postman ↔ NHA ↔ code).

---

## Phase A (M1 enrolment chain) — what is implemented

The following platform → NHA flow is implemented for **`abdm.m1.aadhaar-otp.v1`**:

| Step | Platform (this service) | NHA (ABHA API, gateway bearer) |
|------|-------------------------|--------------------------------|
| M0 smoke | `GET /api/abdm/v1/m0/gateway/session` | Client-credentials session + `GET /v3/profile/public/certificate` |
| 1 | `POST /api/abdm/v1/m1/enrol/aadhaar/otp` | `POST /v3/enrollment/request/otp` (Aadhaar) |
| 2 | `POST /api/abdm/v1/m1/enrol/aadhaar/otp/resend` | Same OTP API with **non-empty** `txnId` |
| 3 | `POST /api/abdm/v1/m1/enrol/aadhaar/verify` | `POST /v3/enrollment/enrol/byAadhaar` |
| 4 | `POST /api/abdm/v1/m1/enrol/mobile-verify/otp` | `POST /v3/enrollment/request/otp` (mobile scope) |
| 5 | `POST /api/abdm/v1/m1/enrol/mobile-verify/verify` | `POST /v3/enrollment/auth/byAbdm` |
| 6 | `GET /api/abdm/v1/m1/abha-address/suggestions?sessionId=…` | `GET /v3/enrollment/enrol/suggestion` + header `Transaction_Id` |
| 7 | `POST /api/abdm/v1/m1/abha-address` | `POST /v3/enrollment/enrol/abha-address` |
| 8 | `GET /api/abdm/v1/m1/profile?sessionId=…` | `GET /v3/profile/account` + `X-token: Bearer <profile JWT>` |
| 9 | `GET /api/abdm/v1/m1/profile/abha-card?sessionId=…` | `GET /v3/profile/account/abha-card` + same `X-token` |

Session state is stored in **`abdm_adapter.abdm_sessions`** (`state`, `txn_id`, `x_token`, `t_token`, `context` JSON). Profile calls use the **per-session** `x_token` via merged headers (not a global adapter header).

**Gateway behaviour:** idempotent **GET** calls retry **once** on **401** after refreshing the cached gateway bearer (and certificate fetch has an extra invalidation path). **POST** OTP/verify calls are **not** blindly retried on 401.

---

## How to run `abdm-adapter-svc`

### Prerequisites

1. **Node.js** matching repo expectations (see root `package.json` engines).
2. **PostgreSQL** reachable with a URL in **`DATABASE_URL`** (same pattern as the rest of HIMS).
3. **Schema applied** for the adapter (once per database):

   ```bash
   psql "$DATABASE_URL" -f modules/abdm-adapter/migrations/0000_abdm_adapter_schema.sql
   ```

4. **NHA sandbox credentials** in your **local** `.env` (never commit secrets):
   - `ABDM_SANDBOX_CLIENT_ID`
   - `ABDM_SANDBOX_CLIENT_SECRET`

### Start the service

From the monorepo root:

```bash
pnpm install
npx nx run abdm-adapter-svc:serve
```

This runs `tsx watch src/main.ts` with `cwd` = `services/abdm-adapter-svc` (see `services/abdm-adapter-svc/project.json`).

- **Default HTTP port:** `3007` (override with **`ABDM_ADAPTER_SVC_PORT`**).
- **Health:** `GET http://localhost:3007/healthz` or **`GET http://localhost:3007/api/abdm/v1/healthz`** (no tenant header).

### Environment file location

**Configuration** follows the same layering as other TS services: repo root [`.env`](../../.env) (cross-cutting, via Nx `envFile`) plus [`services/abdm-adapter-svc/.env`](../../services/abdm-adapter-svc/.env) (service-specific, via [`load-env.ts`](../../services/abdm-adapter-svc/src/load-env.ts)).

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes* | Postgres for `abdm_adapter.abdm_sessions` (usually from root `.env`) |
| `ABDM_DATA_DATABASE_URL` | No | Optional dedicated DB override (runtime + migrate prefer this when set) |
| `ABDM_SANDBOX_CLIENT_ID` | Yes | NHA sandbox client id (alias: `clientId`) — service `.env` |
| `ABDM_SANDBOX_CLIENT_SECRET` | Yes | NHA sandbox secret (alias: `clientSecret`) — service `.env` |
| `ABDM_ADAPTER_SVC_PORT` | No | Default `3007` |
| `ABDM_GATEWAY_BASE_URL` | No | Default `https://dev.abdm.gov.in` (Postman) |
| `ABDM_ABHA_API_BASE_URL` | No | Default `https://abhasbx.abdm.gov.in/abha/api` (Postman) |

\* Or set only `ABDM_DATA_DATABASE_URL` in service `.env` when using a dedicated ABDM Postgres.

Reference template: [`services/abdm-adapter-svc/.env.example`](../../services/abdm-adapter-svc/.env.example).

### Database migration

From monorepo root (requires `psql` on PATH):

```bash
pnpm install
pnpm --filter @hims/abdm-adapter-svc db:migrate
```

Or manually (use a `postgresql://` URL — strip `+psycopg` if needed; add `?sslmode=require` for Azure):

```bash
psql "postgresql://USER:PASS@HOST:6432/temp-abdm?sslmode=require" \
  -f modules/abdm-adapter/migrations/0000_abdm_adapter_schema.sql
```

---

## Database: which URL and what M1 stores

### Connection string

The service reads **`ABDM_DATA_DATABASE_URL`** (if set in service `.env`) or root
**`DATABASE_URL`** (see `load-env.ts`, `resolve-database-url.ts`, and `scripts/migrate.mjs`).
SQLAlchemy-style `postgresql+psycopg://…` is normalised to `postgresql://…` for Node `pg`.

For local docker-compose dev you can still use:

```text
postgresql://hims:hims@localhost:5433/hims_dev
```

That is **not** “added by M1” specifically — it is the **shared HIMS dev database** convention. Point `DATABASE_URL` at whichever Postgres instance has had the **`abdm_adapter`** migration applied.

### Schema and table

| Item | Value |
|------|--------|
| Schema | `abdm_adapter` |
| Table | `abdm_adapter.abdm_sessions` |
| Primary key | `(iq_tenant_id, session_id)` |
| M1 columns you care about | `flow_kind` (e.g. `abdm.m1.aadhaar-otp.v1`), `state`, `txn_id`, `x_token`, `t_token`, `context` (JSON) |

`iq_tenant_id` must match the tenant header on every `/api/...` call (see below). This aligns with Citus-style multi-tenancy (`iq_tenant_id` on every table).

---

## Troubleshooting (common mistakes)

### `GET /api/abdm/v1/healthz` returned **404**

Previously only **`GET /healthz`** existed at the **root** (no `/api` prefix). The service now also exposes **`GET /api/abdm/v1/healthz`** with the same `{ "status": "ok" }` body — **no tenant header** on either health route.

### `GET /api/abdm/v1/m0/gateway/session` returned **400**

Almost always **missing tenant**. Every route under **`/api`** runs after `@hims/ts-sdk-tenant`, which requires **`x-tenant-id`** or **`iq_tenant_id`** (a UUID string).

```bash
curl -sS -H 'x-tenant-id: 00000000-0000-4000-8000-0000000000aa' \
  http://localhost:3007/api/abdm/v1/m0/gateway/session
```

If the body says `Missing tenant id (iq_tenant_id header or x-tenant-id header)`, add that header in Swagger **Authorize** / per-request parameters (depending on your UI).

**Note:** `GET /api/abdm/v1/m0/gateway/session` does **not** create an `abdm_sessions` row — it only checks NHA gateway + certificate. Session rows are created by **`POST /api/abdm/v1/m1/enrol/aadhaar/otp`** (which also requires the same tenant header).

---

## Calling the API (tenant header)

All routes registered **inside** the `/api` Fastify scope use the **tenant plugin** (`@hims/ts-sdk-tenant`). Each request must include **one** of:

- `x-tenant-id: <uuid>`  
- `iq_tenant_id: <uuid>`

**Exceptions (no tenant):** `GET /healthz` and `GET /api/abdm/v1/healthz` are registered on the root app so probes and prefix-consistent checks work without headers.

Example:

```bash
curl -sS -H 'x-tenant-id: 00000000-0000-4000-8000-0000000000aa' \
  http://localhost:3007/api/abdm/v1/m0/gateway/session
```

---

## Full API list (this service)

Base URL (default): **`http://localhost:3007`**

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/healthz` | Liveness at **root**; **no** tenant header |
| `GET` | `/api/abdm/v1/healthz` | Same as `/healthz`; **no** tenant (for API-prefix clients) |
| `GET` | `/api/abdm/v1/m0/gateway/session` | Gateway + cert smoke — **requires** `x-tenant-id` or `iq_tenant_id` |
| `POST` | `/api/abdm/v1/m1/enrol/aadhaar/otp` | Body: `{ "aadhaarNumber": "12 digits" }` |
| `POST` | `/api/abdm/v1/m1/enrol/aadhaar/otp/resend` | Body: `{ "sessionId", "aadhaarNumber" }` |
| `POST` | `/api/abdm/v1/m1/enrol/aadhaar/verify` | Body: `{ "sessionId", "otp", "mobile?" }` |
| `POST` | `/api/abdm/v1/m1/enrol/mobile-verify/otp` | Body: `{ "sessionId", "mobile" }` |
| `POST` | `/api/abdm/v1/m1/enrol/mobile-verify/verify` | Body: `{ "sessionId", "otp" }` |
| `GET` | `/api/abdm/v1/m1/abha-address/suggestions?sessionId=<uuid>` | |
| `POST` | `/api/abdm/v1/m1/abha-address` | Body: `{ "sessionId", "abhaAddress", "preferred?" }` |
| `GET` | `/api/abdm/v1/m1/profile?sessionId=<uuid>` | Needs session `x_token` |
| `GET` | `/api/abdm/v1/m1/profile/abha-card?sessionId=<uuid>` | Needs session `x_token` |

Optional auth: set **`ENABLE_AUTH=true`** and configure **`JWKS_URL`** for JWT identity (see `main.ts`).

---

## Swagger / OpenAPI URLs

Docs registration is via **`registerOpenApiDocs`** (`@hims/ts-sdk-openapi`), with default UI prefix **`/docs`**.

When docs are **enabled** (see below):

| What | URL (default port 3007) |
|------|-------------------------|
| **Swagger UI** | `http://localhost:3007/docs` |
| **OpenAPI JSON** | `http://localhost:3007/docs/json` |

Swagger serves the **full Phase A M1 spec** from [`specs/openapi/abdm-adapter.v1.yaml`](../../specs/openapi/abdm-adapter.v1.yaml) (all enrolment + profile routes, ordered in the API description).

**Before trying M1 routes:** open **Authorize** and set **`x-tenant-id`** to your tenant UUID (e.g. `00000000-0000-4000-8000-0000000000aa`). Health routes do not need it.

### When is Swagger enabled?

From `@hims/ts-sdk-openapi` / `isApiDocsExposureEnabled`:

- `ENABLE_API_DOCS=true` → always on  
- `ENABLE_API_DOCS=false` → always off  
- **unset** → on when **`NODE_ENV` is not `production`**

In local dev, leave `NODE_ENV=development` (or set `ENABLE_API_DOCS=true`) to see `/docs`.

**Important:** The **canonical** contract checked into git for reviews and codegen is  
[`specs/openapi/abdm-adapter.v1.yaml`](../../specs/openapi/abdm-adapter.v1.yaml).  
The live `/docs` view reflects what Fastify + `@fastify/swagger` expose from registered route schemas; keep the YAML and handlers aligned (spec-first rule).

---

## Gated sandbox tests (optional)

From `modules/abdm-adapter/package.json`:

```bash
pnpm -F @hims/ts-sdk-db build
pnpm -F @hims/abdm-adapter test:sandbox
```

Requires `RUN_ABDM_SANDBOX_TESTS=1` and sandbox env vars (see root `.env.example`).

---

## Security reminder

Never commit **real** `ABDM_SANDBOX_CLIENT_SECRET` (or any production secret). Use a local `.env` only; rotate sandbox credentials if they were exposed.
