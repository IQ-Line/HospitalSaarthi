import { apiClientWithIqTenant } from '@/lib/api-client';
import { serviceIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useTenantStore } from '@/stores/tenant.store';

const ABDM_V1 = '/api/abdm/v1';

function abdmUrl(path: string): string {
  const origin = import.meta.env.VITE_ABDM_ADAPTER_ORIGIN?.trim().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return origin ? `${origin}${ABDM_V1}${suffix}` : `${ABDM_V1}${suffix}`;
}

export function abdmTenantId(): string {
  return serviceIqTenantHeaderValue(useTenantStore.getState().tenantId);
}

export function abdmFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiClientWithIqTenant<T>(abdmTenantId(), abdmUrl(path), options);
}
