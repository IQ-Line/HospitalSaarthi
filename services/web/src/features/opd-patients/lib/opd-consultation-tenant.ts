import { jwtIqTenantHeaderValue, serviceIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

/** Tenant id for OPD API calls (store, home tenant, or JWT). */
export function resolveOpdConsultationTenantId(): string | null {
  const { tenantId, homeTenantId } = useTenantStore.getState();
  const fromStore = tenantId?.trim() || homeTenantId?.trim();
  if (fromStore) return fromStore;

  const jwtTenant = jwtIqTenantHeaderValue(useAuthStore.getState().accessToken);
  if (jwtTenant) return jwtTenant;

  return serviceIqTenantHeaderValue(null);
}
