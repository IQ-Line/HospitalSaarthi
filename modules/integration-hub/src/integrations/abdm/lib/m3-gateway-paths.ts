/** Outbound HIE-CM paths for M3 (gateway base URL). */
export const M3_GATEWAY_PATHS = {
  consentRequestInit: "/api/hiecm/consent/v3/request/init",
  consentHiuOnNotify: "/api/hiecm/consent/v3/request/hiu/on-notify",
  consentFetch: "/api/hiecm/consent/v3/fetch",
  dataRequest: "/api/hiecm/data-flow/v3/health-information/request",
  dataFlowNotify: "/api/hiecm/data-flow/v3/health-information/notify",
} as const;
