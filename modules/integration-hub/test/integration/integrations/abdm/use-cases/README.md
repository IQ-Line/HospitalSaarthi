# ABDM sandbox suites (`*.sandbox.integration.test.ts`) — manual-only, NOT CI coverage

The 7 suites under `m1/`, `m2/`, `m3/` exercise ABDM flows against real infrastructure
(Postgres, and for some, the live NHA sandbox). They never run in CI or in the default
test target — see the three gates below. Do not read them as automated coverage.

## What each suite covers

| Suite | Covers |
|---|---|
| `m1/enrol-aadhaar-otp-request.sandbox…` | Aadhaar-enrol OTP dispatch against live NHA SBX gateway |
| `m1/m1-aadhaar-chain.sandbox…` | Full M1 Aadhaar registration chain vs NHA SBX: enrol OTP → verify → mobile OTP send → confirm (needs real Aadhaar/mobile/OTP values) |
| `m2/m2-user-initiated-link.sandbox…` | M2 user-initiated care-context link: discover → link-init → link-confirm callback chain, real Drizzle repos on Postgres |
| `m2/m2-consent-notify.sandbox…` | M2 consent-notify callback: persists consent artefacts + care-context link state to Postgres |
| `m3/m3-hiu-consent-request.sandbox…` | M3 HIU consent init POSTed to the **live** NHA gateway |
| `m3/m3-hiu-data-fetch.sandbox…` | M3 HIU data-fetch leg: consent granted → data request → bundle push → `ACKNOWLEDGED` (mock gateway, real Postgres) |
| `m3/m3-hip-data-response.sandbox…` | M3 HIP HI-request handling + FHIR bundle encrypt/push (mock `dataPush` client, real Postgres) |

## The three gates (each independently blocks a CI run)

1. **Vitest exclude** — the repo-wide base config (`/vitest.base.ts`) sets
   `exclude: [...configDefaults.exclude, "**/*.sandbox.integration.test.ts"]`, spread
   into `modules/integration-hub/vitest.config.ts`. Verified: `npx vitest list` in this
   module collects zero `*.sandbox.integration.test.ts` files.
2. **Env flag** — every suite is wrapped in `describe.skipIf(!RUN || !DB_URL …)` where
   `RUN = process.env["RUN_ABDM_SANDBOX_TESTS"] === "1"` and `DB_URL` comes from
   `resolveSandboxDatabaseUrl()` (`DATABASE_URL` or `ABDM_DATA_DATABASE_URL`; must be a
   real `postgres(ql)://` URL — see `src/integrations/abdm/test-utils/sandbox-env.ts`).
3. **Live credentials** — NHA sandbox creds (`ABDM_SANDBOX_CLIENT_ID` /
   `ABDM_SANDBOX_CLIENT_SECRET`), loaded from `.env` / `services/integration-hub-svc/.env`
   by `vitest.sandbox.setup.ts`. Extra per-suite gates: both M1 suites require
   `hasSandboxAadhaarEnv()` (`ABDM_SANDBOX_TEST_AADHAAR` = 12 digits);
   `m3-hiu-consent-request` additionally requires `ABDM_RUN_LIVE_NHA_SANDBOX=1`.

## Manual run

```sh
pnpm -F @hims/ts-sdk-db build
cd modules/integration-hub
RUN_ABDM_SANDBOX_TESTS=1 DATABASE_URL=postgresql://... pnpm test:sandbox
# M1 chain additionally needs ABDM_SANDBOX_TEST_{AADHAAR,MOBILE,AADHAAR_OTP,MOBILE_OTP}
# m3-hiu-consent-request additionally needs ABDM_RUN_LIVE_NHA_SANDBOX=1
```

> **Known breakage (2026-07):** `vitest.sandbox.config.ts` still has
> `include: ["src/**/*.sandbox.integration.test.ts"]`, but commit `ef89c7a8` relocated
> these suites to `test/**` — so `pnpm test:sandbox` currently collects **0 files**
> (verified with `npx vitest list --config vitest.sandbox.config.ts`). Until the include
> glob is updated to `test/**/*.sandbox.integration.test.ts`, the command above runs nothing.

## What CI actually covers

Automated coverage of these ABDM flows is limited to the **fully mocked in-process loop**
`m3/m3-hiu-mock-loop.integration.test.ts` (collected by the default `nx run
integration-hub:test`), plus per-use-case mocked unit tests under
`test/unit/integrations/abdm/`. No CI job talks to the NHA sandbox.
