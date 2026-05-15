import { catalogIqTenantHeaderValue, serviceIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const VISITPAD_CATALOG_API_PREFIX = '/api/v1/master-data/visitpad/';
const EMPI_API_PREFIX = '/api/empi/v1/';
const REGISTRATION_API_PREFIX = '/api/registration/v1/';

function isRegistrationApiPath(path: string): boolean {
  return (
    path.startsWith(REGISTRATION_API_PREFIX) || path.includes('/api/registration/v1/')
  );
}

function resolveRequestUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path}`;
}

function isWriteHttpMethod(method: string | undefined): boolean {
  const m = (method ?? 'GET').toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
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
  /** EMPI and Registration require `iq_tenant_id` (or `x-tenant-id`). */
  if (
    (path.startsWith(EMPI_API_PREFIX) || isRegistrationApiPath(path)) &&
    !headers.has('iq_tenant_id')
  ) {
    headers.set('iq_tenant_id', serviceIqTenantHeaderValue(tenantId));
  }

  if (
    isWriteHttpMethod(options.method) &&
    path.startsWith(VISITPAD_CATALOG_API_PREFIX) &&
    tenantId != null &&
    tenantId.trim() !== '' &&
    catalogTenant == null
  ) {
    throw new Error(
      'Visitpad catalog write blocked: a tenant is selected but its id is not a canonical UUID, so iq_tenant_id would be omitted and the change would apply to the global (public) catalog. Use a UUID tenant id from the platform tenant registry or clear tenant selection before editing the platform catalog.',
    );
  }

  const response = await fetch(resolveRequestUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json() as Promise<T>;
}

/**
 * Read-only catalog fetch that **never** sends `iq_tenant_id`, so the global (`public`)
 * library is always used — e.g. “Import from platform library” while a tenant UUID is active.
 */
export async function apiClientGlobalCatalogRead<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(resolveRequestUrl(path), {
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
