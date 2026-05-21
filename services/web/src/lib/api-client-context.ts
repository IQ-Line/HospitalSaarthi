/** Optional per-request overrides for {@link apiClient}. */
export type ApiClientContext = {
  /** When set, sent as `iq_tenant_id` (platform super-admin cross-tenant operations). */
  tenantIdOverride?: string | null;
};
