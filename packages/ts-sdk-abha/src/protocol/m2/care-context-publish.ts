/**
 * M2 — Proactive care-context publish (HIP → gateway).
 *
 * Outbound: HIP notifies the gateway that new care contexts exist for a
 * previously-linked patient (e.g., a new visit was recorded). Gateway
 * forwards to the patient's consent manager and replies via `on-add-contexts`.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md` §"Add contexts"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/links/context/notify`,
 *      `/api/v3/links/context/on-notify`)
 *
 * TODO: dev to populate `AddContextsRequest` (outbound) and
 * `OnAddContextsCallback` (gateway → HIP ack).
 */

export {};
