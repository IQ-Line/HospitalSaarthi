/**
 * M3 — HIU side: health-information request + receive.
 *
 * After consent is `GRANTED`, HIU exchanges keyMaterial with the gateway,
 * requests data via `health-information/cm/request`, and receives encrypted
 * bundles via the platform's `dataPushUrl`. Acknowledges via
 * `health-information/notify`.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md` §"Data fetch"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/hiu/health-information/cm/request`,
 *      `/api/v3/hiu/health-information/on-request`,
 *      `/api/v3/hiu/health-information/transfer`,
 *      `/api/v3/hiu/health-information/notify`)
 *
 * TODO: dev to populate `HiuHealthInfoRequest`, `OnHealthInfoCallback`,
 * `DataTransferPayload` (encrypted bundle delivery), `HealthInfoNotify`.
 */

export {};
