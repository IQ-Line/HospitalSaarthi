# M3 Mock Harness Scripts

Bash scripts that simulate ABDM CM callbacks against a locally-running adapter service. See [`docs/architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md`](../../../../docs/architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md) for the full walkthrough.

## Requirements

- `bash` 4+
- `curl`
- `jq`
- `uuidgen` (Linux: `apt install uuid-runtime`; mac: included)
- `integration-hub-svc` with `ABDM_M3_MOCK_GATEWAY=true` and `ABDM_M3_LOOPBACK_HIU=true`, **or** a spare mock instance: `INTEGRATION_HUB_M3_MOCK_SERVE=true npx tsx src/main.ts` in `services/integration-hub-svc` (listens on **:3008** by default)

## Scripts

| Script | What it does |
|---|---|
| `inject-on-init.sh <consentRequestId>` | POSTs synthetic `on-init` callback (CM acked our consent request) |
| `inject-notify-granted.sh <consentRequestId> [consentArtefactId]` | POSTs synthetic `notify` callback (patient granted; second arg is the artefact id to emit) |
| `inject-notify-denied.sh <consentRequestId>` | POSTs synthetic `notify` callback (patient denied) |
| `inject-on-fetch.sh <consentArtefactId>` | POSTs synthetic `on-fetch` callback with signed artefact |
| `inject-on-data-request.sh <transferId> [cmTransactionId]` | POSTs synthetic `on-request` callback for data flow |
| `trigger-hip-data-flow.sh <consentArtefactId> [transferId]` | POSTs synthetic CM data-request to the HIP side — kicks off bundle assembly + encryption + push |
| `full-loop.sh` | Drives the 8-step end-to-end smoke test; exits 0 on `COMPLETED` |

## Env overrides

| Var | Default | Purpose |
|---|---|---|
| `ABDM_ADAPTER_BASE_URL` | `http://localhost:3007` | Where the adapter service listens |
| `ABDM_TEST_TENANT_ID` | `00000000-0000-0000-0000-000000000001` | Tenant UUID used in `x-tenant-id` header |
| `ABDM_TEST_HIU_ID` | `SBX_TEST_HIU_001` | `X-HIU-ID` header value |
| `ABDM_TEST_HIP_ID` | `SBX_TEST_HIP_001` | `X-HIP-ID` header value |

## Failure modes

| Symptom | Likely cause |
|---|---|
| `curl: (7) Failed to connect to localhost port 3007` | Hub service isn't running. `npx nx run integration-hub-svc:serve` |
| `uuidgen: command not found` | Install `uuid-runtime` (Linux) or `coreutils` (mac) |
| `jq: error: ...` | Fixture file missing or malformed. Check `../test-fixtures/m3/` |
| HTTP 401 | Signature verification failed despite mock mode. Confirm `ABDM_M3_MOCK_GATEWAY=true` is set in the service's env (not just your shell) |
| HTTP 404 on push | Loopback URL mismatch. Confirm `ABDM_M3_LOOPBACK_HIU=true` and check the URL the HIP side logged |
| `full-loop.sh` fails at step 8 with state=`AWAITING_PUSH` | HIP push didn't actually run (logs would say "would-have-posted" instead of "encrypted and posted") — check `ABDM_M3_LOOPBACK_HIU` |
| `full-loop.sh` fails at step 8 with state=`FAILED` | Likely decryption error. Check service logs for "tag mismatch" — see [`10-m3-mock-harness-guide.md §7`](../../../../docs/architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md#7-troubleshooting) |

## CI integration

`full-loop.sh` is suitable for a Linux CI job that boots the adapter service against a temp PG database, applies the M3 migration, then runs the loop. Exit code 0 = green.

When real services arrive, these scripts become inputs to integration tests rather than dev harnesses — the test framework can `bash inject-on-fetch.sh $REAL_CONSENT_ID` to drive a leg of a flow against the deployed environment.
