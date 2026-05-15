/**
 * M2 — Care-context discovery (HIP side).
 *
 * Inbound callback: ABDM gateway → platform asking "do you hold records for
 * this patient?". Platform matches against EMPI and replies via the gateway's
 * `on-discover` endpoint.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/hip/patient/care-context/discover`,
 *      `/api/v3/hiu/patient/care-context/on-discover`)
 *
 * TODO: dev to populate `DiscoveryRequest` (inbound) and `OnDiscoverPayload`
 * (our reply pushed to gateway). Inbound matches the v3 spec's discovery
 * request; the reply lists `careContexts[]` with reference numbers.
 */

export {};
