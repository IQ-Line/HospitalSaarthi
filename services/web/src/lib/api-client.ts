import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const MAX_CATALOG_TENANT_INT = 2_147_483_647;

/**
 * Master-data catalog routes `iq_tenant_id` only when it is a positive integer (digits only).
 * UI tenant slugs (e.g. tenant-001) stay in the tenant store but are not sent here — the API
 * then uses the shared global catalog (public schema). Send a numeric id when you need
 * tenant_master overrides.
 */
function catalogIqTenantHeaderValue(tenantId: string | null | undefined): string | null {
  if (tenantId == null) return null;
  const s = tenantId.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_CATALOG_TENANT_INT) return null;
  return s;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const tenantId = useTenantStore.getState().tenantId;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const catalogTenant = catalogIqTenantHeaderValue(tenantId);
  if (catalogTenant) {
    headers.set('iq_tenant_id', catalogTenant);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}
