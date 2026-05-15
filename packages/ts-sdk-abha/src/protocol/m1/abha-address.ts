/**
 * M1 — ABHA Address suggestions + creation.
 *
 * Flow: after OTP verification the gateway returns suggested addresses; the
 * patient selects one (or proposes a custom) and the platform calls
 * `enrol/abha-address` to register it.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md` §"ABHA Address"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/enrollment/enrol/abha-address/suggestion`,
 *      `/api/v3/enrollment/enrol/abha-address`)
 *
 * TODO: dev to populate:
 *   - `AbhaAddressSuggestionsRequest` / `Response`
 *   - `CreateAbhaAddressRequest` / `Response`
 *
 * Domain type for the address string itself lives at
 * `@hims/ts-sdk-abha/types/abha-address` — re-use, don't redefine.
 */

export {};
