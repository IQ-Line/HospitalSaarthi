# M3 Test Fixtures

Synthetic ABDM CM callback bodies for local M3 development. Use with the curl scripts in [`../scripts/m3/`](../../scripts/m3/). See [`docs/architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md`](../../../../docs/architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md) for the full walkthrough.

## Fixture map

| Fixture | Flow step | Spec § | Drives transition | Used by script |
|---|---|---|---|---|
| `hiu/on-init-success.json` | HIU consent request → on-init | §4.3.2 | `CONSENT_REQUEST_POSTED → ON_INIT_ACKED` | `inject-on-init.sh` |
| `hiu/on-init-error.json` | HIU consent request → on-init (error path) | §4.3.2 | `CONSENT_REQUEST_POSTED → FAILED` | (manual) |
| `hiu/notify-granted.json` | HIU consent request → notify (patient approves) | §4.3.3 | `ON_INIT_ACKED → NOTIFY_RECEIVED` | `inject-notify-granted.sh` |
| `hiu/notify-denied.json` | HIU consent request → notify (patient denies) | §4.3.3 | `ON_INIT_ACKED → DENIED` | `inject-notify-denied.sh` |
| `hiu/on-status.json` | HIU consent request → on-status (optional polling) | §4.3.6 | (no state change) | (manual) |
| `hiu/on-fetch-with-artefact.json` | HIU consent request → on-fetch (CM returns signed artefact) | §4.3.8 | `ARTEFACT_FETCH_REQUESTED → ARTEFACT_FETCHED` | `inject-on-fetch.sh` |
| `hiu/on-request-success.json` | HIU data fetch → on-request (CM acks data request) | §5.3.2 | `DATA_REQUEST_POSTED → ON_REQUEST_ACKED` | `inject-on-data-request.sh` |
| `hip/data-request-from-cm.json` | HIP data response → /hip/health-information/request | §5.3.1 (HIP perspective) | `→ DATA_REQUEST_RECEIVED` | `trigger-hip-data-flow.sh` |
| `push/encrypted-bundle-sample.json` | HIP → HIU push body shape (reference only) | §5 push body | (HIP scripts use the live HIU key from DB, not this fixture) | (reference only) |

## Placeholder values

All fixtures use:
- `consentRequestId`: `REQ-TEST-00000000-0000-0000-0000-000000000001`
- `consentId`: `CON-TEST-00000000-0000-0000-0000-000000000001`
- `transactionId`: `TXN-TEST-00000000-0000-0000-0000-000000000001`
- Patient ABHA address: `test.user@sbx`
- HIP id: `SBX_TEST_HIP_001`
- HIU id: `SBX_TEST_HIU_001`

The curl scripts override `consentRequestId` / `consentId` / `transferId` at runtime via `jq` substitution — you pass the real ID as the script's first argument.

## Signatures

`signature` fields in artefact fixtures are placeholders (`PLACEHOLDER_BASE64_JWS_SIGNATURE_NOT_VALID_IN_MOCK_MODE`). In mock mode (`ABDM_M3_MOCK_GATEWAY=true`), the adapter logs but accepts these (the verifier returns `signature_valid: false`). For real signature verification, fetch fresh fixtures from the ABDM sandbox.

## Crypto material

Public keys + nonces in `hip/data-request-from-cm.json` and `push/encrypted-bundle-sample.json` are placeholders. The `trigger-hip-data-flow.sh` script reads the **real HIU public key** from `abdm_m3_data_transfers` (populated when the HIU data-fetch flow's `start.ts` runs) and substitutes it into the body before POSTing. This is what makes loopback decryption actually work.

## `pageNumber` indexing

`push/encrypted-bundle-sample.json` uses `pageNumber: 1`. The M2 spec push body example (line 10393) shows `pageNumber: 0`. Both have been observed in the wild; the gateway accepts either. We use 1-indexed in our fixtures because it's friendlier to read in logs. If a real sandbox interaction surfaces an issue, switch to 0-indexed (the `entries` array index already is 0-based, so swapping is a one-line change in `assemble-and-push.ts`).

## Why these are checked in

Per [ADR-0031](../../../../docs/architecture/adr/0031-abdm-m3-mock-harness-strategy.md), the mock CM is part of the adapter so fixtures and adapter handler shapes stay aligned. Spec drift (e.g., ABDM publishes a v3.1 with a new field) is caught in PR review because the fixture and the DTO change together.

## When real services arrive

When real Record Foundation + a separate HIU service exist, flip `ABDM_M3_MOCK_GATEWAY=false` and `ABDM_M3_LOOPBACK_HIU=false`. The fixtures stay useful as **inputs to integration tests** — e.g., a Vitest integration test that POSTs `on-fetch-with-artefact.json` to the handler and asserts the state transition. The curl scripts stay useful as **smoke tests against deployed environments**.
