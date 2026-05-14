/**
 * M3 — HIU side: consent status notifications + status polling.
 *
 * Two paths:
 *   - Gateway → HIU `consent/request/notify` when patient grants/denies.
 *   - HIU → gateway `consent/request/status` poll + `consent/request/on-status` reply.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md` §"Consent lifecycle"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/hiu/consent/request/notify`,
 *      `/api/v3/hiu/consent/request/status`,
 *      `/api/v3/hiu/consent/request/on-status`)
 *
 * TODO: dev to populate `ConsentNotifyPayload`, `ConsentStatusRequest`,
 * `OnConsentStatusCallback`. Reuse `ConsentLifecycleState` from
 * `@hims/ts-sdk-abha/constants/fsm-states` for status enums.
 */

export {};
