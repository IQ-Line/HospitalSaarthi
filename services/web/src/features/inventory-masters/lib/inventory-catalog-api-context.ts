import type { ApiClientContext } from '@/lib/api-client-context';
import {
  catalogIqTenantHeaderValue,
  jwtIqTenantHeaderValue,
} from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

/** Active hospital tenant for inventory master-data reads/writes (store, then JWT). */
export function resolveInventoryMastersTenantId(): string | undefined {
  const tenantId = useTenantStore.getState().tenantId;
  const accessToken = useAuthStore.getState().accessToken;
  return (
    catalogIqTenantHeaderValue(tenantId) ??
    jwtIqTenantHeaderValue(accessToken) ??
    undefined
  );
}

export function useInventoryMastersTenantId(): string | undefined {
  const tenantId = useTenantStore((s) => s.tenantId);
  const accessToken = useAuthStore((s) => s.accessToken);
  return (
    catalogIqTenantHeaderValue(tenantId) ??
    jwtIqTenantHeaderValue(accessToken) ??
    undefined
  );
}

/** Forces tenant-scoped inventory / visitpad-manufacturer catalog calls for super-admin principals. */
export function inventoryMastersApiContext(): ApiClientContext | undefined {
  const catalogTenant = resolveInventoryMastersTenantId();
  return catalogTenant ? { tenantIdOverride: catalogTenant } : undefined;
}
