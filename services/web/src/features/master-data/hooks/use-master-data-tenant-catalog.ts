import { isVisitpadTenantCatalogScopeForPrincipal } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

/** True when catalog APIs are tenant-scoped (`iq_tenant_id` sent). False for platform super-admin (`global_master`). */
export function useMasterDataTenantCatalog() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const roles = useAuthStore((s) => s.roles);
  return {
    tenantId,
    tenantCatalog: isVisitpadTenantCatalogScopeForPrincipal(tenantId, roles),
  };
}
