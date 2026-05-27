import { isVisitpadTenantCatalogScopeForPrincipal } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

/** True when Visitpad APIs are tenant-scoped (`iq_tenant_id` sent). False for platform super-admin (global_master). */
export function useVisitpadTenantCatalog() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const roles = useAuthStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  return {
    tenantId,
    tenantCatalog: isVisitpadTenantCatalogScopeForPrincipal(tenantId, roles, accessToken),
  };
}
