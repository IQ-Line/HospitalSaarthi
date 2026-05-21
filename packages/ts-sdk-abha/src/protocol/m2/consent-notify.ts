/**
 * M2 — Consent notification (HIP side).
 *
 * After the patient grants consent via the consent manager, gateway →
 * HIP `consent/request/hip/notify` with the consent artefact. HIP persists
 * the artefact and acknowledges via `consent/request/hip/on-notify`.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *     §6.3.1-§6.3.2
 *
 * TODO: dev to populate `ConsentNotifyRequest` (inbound wrapper:
 * `notification.{status, consentId, consentDetail, signature,
 * grantAcknowledgement}`) and `OnConsentNotifyRequest` (outbound ack:
 * `acknowledgement.{status, consentId}` plus `response.requestId`).
 */

export {};
