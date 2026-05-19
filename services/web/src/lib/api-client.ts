import type { ApiClientContext } from '@/lib/api-client-context';
import { refreshAccessToken } from '@/lib/auth-session';
import { catalogIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const VISITPAD_CATALOG_API_PREFIX = '/api/v1/master-data/visitpad/';
const EMPI_API_PREFIX = '/api/empi/v1/';

function isWriteHttpMethod(method: string | undefined): boolean {
  const m = (method ?? 'GET').toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  context?: ApiClientContext,
): Promise<T> {
  return apiClientInternal<T>(path, options, true, context);
}

type ApiErrorBody = {
  code?: string;
  message?: string;
};

function parseApiErrorBody(body: string): ApiErrorBody | null {
  try {
    return JSON.parse(body) as ApiErrorBody;
  } catch {
    return null;
  }
}

function isInvalidOrExpiredTokenResponse(response: Response, body: string): boolean {
  if (response.status !== 401) {
    return false;
  }

  const parsed = parseApiErrorBody(body);
  return parsed?.code === 'AUTH_INVALID_TOKEN';
}

async function apiClientInternal<T>(
  path: string,
  options: RequestInit,
  canRetryWithFreshToken: boolean,
): Promise<T> {
  const tenantId = useTenantStore.getState().tenantId;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const catalogTenant = catalogIqTenantHeaderValue(tenantId);
  if (catalogTenant) {
    headers.set('iq_tenant_id', catalogTenant);
  }
  /** EMPI requires `iq_tenant_id` or `x-tenant-id` (non-UUID dev slugs are fine). */
  if (
    path.startsWith(EMPI_API_PREFIX) &&
    tenantId != null &&
    tenantId.trim() !== '' &&
    !headers.has('iq_tenant_id')
  ) {
    headers.set('iq_tenant_id', tenantId.trim());
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

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();

    if (canRetryWithFreshToken && isInvalidOrExpiredTokenResponse(response, body)) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        return apiClientInternal<T>(path, options, false, context);
      }
    }

    throw new ApiError(response.status, body);
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
