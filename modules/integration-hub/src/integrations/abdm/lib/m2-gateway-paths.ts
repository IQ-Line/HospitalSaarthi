/** Outbound HIE-CM paths (gateway base URL). */
export const M2_GATEWAY_PATHS = {
  generateToken: '/api/hiecm/v3/token/generate-token',
  linkCareContext: '/api/hiecm/hip/v3/link/carecontext',
  onDiscover: '/api/hiecm/user-initiated-linking/v3/patient/care-context/on-discover',
  onLinkInit: '/api/hiecm/user-initiated-linking/v3/link/care-context/on-init',
  onLinkConfirm: '/api/hiecm/user-initiated-linking/v3/link/care-context/on-confirm',
  contextNotify: '/api/hiecm/hip/v3/link/context/notify',
  consentOnNotify: '/api/hiecm/consent/v3/request/hip/on-notify',
  smsNotify: '/api/hiecm/hip/v3/link/patient/links/sms/notify2',
  hipHiAck: '/api/hiecm/data-flow/v3/health-information/hip/on-request',
  hipDataNotify: '/api/hiecm/data-flow/v3/health-information/notify',
} as const;
