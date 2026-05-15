/**
 * M2 — Consent notification (HIP side).
 *
 * After the patient grants consent via the consent manager, gateway →
 * HIP `consent/request/hip/notify` with the consent artefact. HIP persists
 * the artefact and acknowledges via `consent/request/hip/on-notify`.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md` §"Consent"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/consent/request/hip/notify`,
 *      `/api/v3/consent/request/hip/on-notify`)
 *
 * TODO: dev to populate `ConsentNotifyRequest` (inbound, carries
 * `consentArtefact` array per granted CCs) and `OnConsentNotifyAck`.
 */

export {};
