# ABDM Adapter — Dev Guide

> Self-contained checklist for the developer picking up the M1 sprint. Read this start-to-finish before opening a file.

## 0. Prerequisites

- ABDM Sandbox account + client credentials (request from the project lead — credentials live in `env:ABDM_SANDBOX_CLIENT_ID` / `env:ABDM_SANDBOX_CLIENT_SECRET` **or** literal `process.env` keys resolved by [`EnvSecretsClient`](../../../../modules/abdm-adapter/src/data-access/env-secrets.client.ts)).
- **Postgres URL for `abdm-adapter-svc`:** set **`DATABASE_URL`** (preferred) or **`ABDM_DATA_DATABASE_URL`** to a **`postgresql://…`** URI. If you only have SQLAlchemy’s `postgresql+psycopg://…`, the service normalises that at boot — still **never commit** the real URL.
- The reference impl at `hims/abdi-lims-backed/` cloned somewhere local. You will reference, **not copy**, its `milestone1CreationService.ts` and `tokenService.ts`.
- Read in order: [01-overview.md](./01-overview.md), [02-m1-flows.md](./02-m1-flows.md), [03-phase-a-implementation-matrix.md](./03-phase-a-implementation-matrix.md), then this file.
- **Postman:** repo file [`Milestone_1_Postman_Collection_18_08_2025_postman_collection_d202ddf09a.json`](../../../../Milestone_1_Postman_Collection_18_08_2025_postman_collection_d202ddf09a.json) — default sandbox hosts match `ABDM_GATEWAY_BASE_URL` / `ABDM_ABHA_API_BASE_URL` in `services/abdm-adapter-svc/src/main.ts`.

## 1. Familiarise with the spec

Before writing any code, read these spec docs end-to-end:

- `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md` — the M1 spec
- `docs/external/abdm-wrapper/docs/wrapperV3.yaml` — OpenAPI for the NHA wrapper (a facade over the gateway; types are mostly accurate, occasionally permissive)

For each of the seven M1 flow groups in [02-m1-flows.md](./02-m1-flows.md), find the request and response shapes in both docs. When they disagree, the v3 markdown wins — the wrapper YAML is a downstream facade.

## 2. Populate protocol DTOs (`packages/ts-sdk-abha/src/protocol/m1/`)

Order:

1. `enrol-aadhaar-otp.ts` — most-used flow, gives you the template.
2. `abha-address.ts` — exercises the `x_token` follow-up pattern.
3. `profile.ts` — read-only against an existing session.
4. `login.ts` — exercises the auth-method discriminated union.
5. `verify-existing.ts` — the frontdesk-side check.
6. `enrol-mobile-otp.ts` — provisional account path.
7. `profile-update.ts` — last; consistent shape with #1.

Each file should export both the request and response types per step. Examples follow the structure:

```ts
export interface EnrolAadhaarOtpRequest {
  aadhaarNumber: string;            // 12 digits
  iqTenantId: string;               // platform-only; not part of gateway payload
}

export interface EnrolAadhaarOtpResponse {
  sessionId: string;                // platform-issued
  txnId: string;                    // gateway-issued
  message: string;                  // gateway human-readable
}
```

Common types (Fidelius envelope, gateway headers, error codes) belong in `protocol/common/`. The error code constants already exist in `packages/ts-sdk-abha/src/constants/error-codes.ts` — extend that file, do not duplicate.

## 3. Implement data-access concretions (`modules/abdm-adapter/src/data-access/`)

In order:

1. **`abdm-sessions.repo.ts`** — Drizzle impl of `AbdmSessionsPort`. Mirror `modules/empi/src/data-access/patient.repo.ts` for constructor + import pattern. The `patch()` method **must merge into `context` JSONB** rather than replace it; use a raw `sql` fragment with `${abdmSessions.context} || ${newContextChunk}::jsonb`.

2. **`gateway-client.http.ts`** — HTTP impl of `GatewayClient`. Use `undici` (already a transitive dep) or `axios`. Three responsibilities:
   - Maintain a cached gateway bearer token from `/v0.5/sessions` (Phase 0 sandbox quirk: v3 doesn't replace the sessions endpoint — see [v3-faq](../../../external/abdm/v3-faq-integration-questions.md)).
   - Attach `Authorization`, `REQUEST-ID` (fresh UUID v4 per call), `TIMESTAMP` (ISO-8601), and the relevant `X-CM-ID` / `X-HIP-ID` / `X-HIU-ID` headers.
   - Map non-2xx responses to a typed error using `ABDM_ERROR_CODES` from `@hims/ts-sdk-abha/constants/error-codes`.

3. **`fidelius.ts`** — Skip for the M1 sprint. Add a one-line export `throw new Error("Fidelius required for M2/M3 only")` if a use-case accidentally imports it.

## 4. Implement use-cases (`modules/abdm-adapter/src/use-cases/m1/`)

One file per endpoint group. Function signature:

```ts
export async function enrolAadhaarOtpRequest(
  input: EnrolAadhaarOtpRequest,
  deps: AbdmAdapterDeps,
): Promise<EnrolAadhaarOtpResponse> { … }
```

Discipline:

- **No globals.** Every dependency from `deps`.
- **No direct DB writes** — only via `deps.sessions`.
- **No direct outbound HTTP** — only via `deps.gateway`.
- **Name your state transitions.** When you call `deps.sessions.patch({ ..., state: 'OTP_REQUESTED' })`, the string must come from `M1_AADHAAR_OTP_STATES` (re-export from `@hims/ts-sdk-abha/constants/fsm-states`), not a literal.

## 5. Wire REST handlers (`modules/abdm-adapter/src/rest-handlers/m1/`)

Each handler is one Fastify route registration:

```ts
app.post(
  "/m1/enrol/aadhaar/otp",
  {
    schema: { body: enrolAadhaarOtpRequestSchema, response: { 200: enrolAadhaarOtpResponseSchema } },
  },
  async (req) => enrolAadhaarOtpRequest(req.body, deps),
);
```

Schemas: use Zod (cheaper) and adapt via `fastify-type-provider-zod` if it's already a dep; otherwise hand-write JSON schemas mirroring the DTO types. Don't ship without input validation.

## 6. Tests

- Unit-test every use-case with a fake `AbdmAdapterDeps` (just objects implementing the ports — no mocking libraries needed).
- One integration test per flow against the **sandbox**, gated behind `RUN_ABDM_SANDBOX_TESTS=1` so it doesn't run in CI by default.
- Schema integrity: snapshot test the generated SQL from `drizzle-kit generate` matches the hand-written `0000_abdm_adapter_schema.sql`.

## 7. Local run

```bash
# Apply migrations (DATABASE_URL or ABDM_DATA_DATABASE_URL must be postgresql:// for psql;
# the Node service also accepts ABDM_DATA_DATABASE_URL with +psycopg and normalises it.)
psql "$DATABASE_URL" -f modules/abdm-adapter/migrations/0000_abdm_adapter_schema.sql

# Start the service
npx nx run abdm-adapter-svc:serve
# Listens on :3007 by default. Override with ABDM_ADAPTER_SVC_PORT.

# Smoke test
curl -X POST http://localhost:3007/api/abdm/v1/m1/enrol/aadhaar/otp \
  -H 'Content-Type: application/json' -H 'x-tenant-id: <tenant-uuid>' \
  -d '{"aadhaarNumber": "<12-digit sandbox Aadhaar>"}'
```

See also [`docs/guides/abdm-adapter-m1-runbook.md`](../../../guides/abdm-adapter-m1-runbook.md) for health checks, tenant headers, and Swagger URLs.

## 8. Commit checklist before opening the PR

- All seven M1 flow groups: DTO file populated + use-case file populated + REST handler wired.
- `pnpm -F @hims/ts-sdk-abha build` clean.
- `npx nx run abdm-adapter:lint` and `npx nx run abdm-adapter:test` clean.
- Migration applied against your local DB; smoke curl returns a `sessionId` and `txnId`.
- One end-to-end sandbox integration test passing locally (gated test, not in CI).
- PR description includes the sandbox-test command + expected output.

## 9. Open questions to surface in PR description, not silently resolve

- Tenant onboarding: how are `clientId` / `clientSecret` provisioned per tenant? (Currently env-only — call this out for the platform team.)
- Error code mapping: which ABDM error codes should surface as `400` vs `409` vs `503` to the BFF? Document your defaults; expect review.
- Telemetry shape: which counters fire per state transition? Add `// TODO(metrics): counter('abdm.m1.aadhaar-otp.transitions', { from, to }).inc()` markers; do not ship a metrics client yet.

## Port-out promise

When the Integration Platform's FSM engine ships (per [ADR-0027](../../adr/0027-fsm-orchestration-for-integration-hub.md)), this is what happens:

- Your use-case functions become FSM **side-effect handlers** — referenced by name from the state-machine spec, called with the same `(input, deps)` signature.
- Your `abdm_sessions` table rows port one-to-one into `integration_platform.integration_workflows` (one-time copy, no application change).
- Your REST handlers stay (they're the inbound boundary; the FSM is internal).
- The `data-access/` concretions stay — the FSM engine consumes them through the same `AbdmAdapterDeps` shape.

So: 90%+ of what you write here survives verbatim. The promise holds *only if* you keep use-cases pure, name your states, and don't take shortcuts through globals.
