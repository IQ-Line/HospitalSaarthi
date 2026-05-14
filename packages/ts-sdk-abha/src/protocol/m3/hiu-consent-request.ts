/**
 * M3 — HIU side: consent request initiation.
 *
 * Outbound: HIU asks the gateway to seek consent from a specific patient
 * for named careContext + hiTypes. Gateway returns 202 + `consentRequest.id`
 * and later calls `consent/request/on-init` with status.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md` §"HIU consent"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/hiu/consent/request/init`,
 *      `/api/v3/hiu/consent/request/on-init`)
 *
 * TODO: dev to populate `HiuConsentInitRequest` (outbound) and
 * `OnConsentInitCallback` (gateway → HIU).
 */

export {};
