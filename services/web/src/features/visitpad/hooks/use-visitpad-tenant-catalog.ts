import { isVisitpadTenantCatalogScope } from '@/lib/catalog-tenant';
import { useTenantStore } from '@/stores/tenant.store';

/** True when the active tenant id is a UUID string — catalog APIs send `iq_tenant_id` (tenant schema). */
export function useVisitpadTenantCatalog() {
  const tenantId = useTenantStore((s) => s.tenantId);
  return {
    tenantId,
    tenantCatalog: isVisitpadTenantCatalogScope(tenantId),
  };
}
