/**
 * M3 — HIP side: health-information data request + push.
 *
 * Triggered after M2 consent notify lands. Gateway → HIP
 * `health-information/hip/request` asks for bundles for granted careContexts;
 * HIP encrypts bundles via Fidelius and pushes to the `dataPushUrl` carried
 * in the request, then acknowledges via `health-information/hip/on-request`.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md` §"HIP transfer"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/hip/health-information/request`,
 *      `/api/v3/hip/health-information/on-request`)
 *
 * TODO: dev to populate `HipHealthInfoRequest` (inbound carries
 * `keyMaterial` + `consent.id`), `DataPushPayload` (encrypted bundles
 * pushed to `dataPushUrl`), and `OnHealthInfoAck`.
 */

export {};
