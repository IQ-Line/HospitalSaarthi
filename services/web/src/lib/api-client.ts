import type { ApiClientContext } from '@/lib/api-client-context';
import { resolveBrowserApiBaseUrl } from '@/lib/api-base-url';
import { refreshAccessToken } from '@/lib/auth-session';
import {
  billingIqTenantHeaderValue,
  catalogIqTenantHeaderValue,
  serviceIqTenantHeaderValue,
} from '@/lib/catalog-tenant';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

const BASE_URL = resolveBrowserApiBaseUrl();

const VISITPAD_CATALOG_API_PREFIX = '/api/v1/master-data/visitpad/';
const EMPI_API_PREFIX = '/api/empi/v1/';
const REGISTRATION_API_PREFIX = '/api/registration/v1/';
const USER_MANAGEMENT_API_PREFIX = '/api/user-management/v1';
const CONFIGURATOR_API_PREFIX = '/api/configurator/v1';
const BILLING_API_PREFIX = '/api/billing/v1/';

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

/**
 * Tenant scope for this request.
 * - `tenantIdOverride: null` → omit tenant headers (platform catalog reads).
 * - `tenantIdOverride: "<uuid>"` → cross-tenant super-admin operations.
 * - omitted → active tenant from {@link useTenantStore}.
 */
export function resolveEffectiveTenantId(context?: ApiClientContext): string | null {
  if (context?.tenantIdOverride !== undefined) {
    const override = context.tenantIdOverride;
    if (override === null) return null;
    const trimmed = override.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return useTenantStore.getState().tenantId ?? null;
}

function pathRequiresTenantHeader(path: string): boolean {
  return (
    path.startsWith(USER_MANAGEMENT_API_PREFIX) ||
    path.startsWith(EMPI_API_PREFIX) ||
    isRegistrationApiPath(path) ||
    path.startsWith(CONFIGURATOR_API_PREFIX)
  );
}

/** Sets `iq_tenant_id` and `x-tenant-id` (both read by backend tenant plugins). */
function applyTenantHeaders(headers: Headers, path: string, tenantId: string | null): void {
  if (headers.has('iq_tenant_id')) {
    return;
  }

  const catalogTenant = catalogIqTenantHeaderValue(tenantId);
  if (catalogTenant) {
    headers.set('iq_tenant_id', catalogTenant);
    headers.set('x-tenant-id', catalogTenant);
    return;
  }

  if (pathRequiresTenantHeader(path)) {
    const serviceTenant = serviceIqTenantHeaderValue(tenantId);
    headers.set('iq_tenant_id', serviceTenant);
    headers.set('x-tenant-id', serviceTenant);
  }
}

function shouldOmitTenantHeaders(context?: ApiClientContext): boolean {
  return context?.tenantIdOverride === null;
}

function buildRequestHeaders(
  path: string,
  options: RequestInit,
  context?: ApiClientContext,
): Headers {
  const tenantId = resolveEffectiveTenantId(context);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!shouldOmitTenantHeaders(context) && !path.startsWith(BILLING_API_PREFIX)) {
    applyTenantHeaders(headers, path, tenantId);
  }

  if (
    isWriteHttpMethod(options.method) &&
    path.startsWith(VISITPAD_CATALOG_API_PREFIX) &&
    tenantId != null &&
    tenantId.trim() !== '' &&
    catalogIqTenantHeaderValue(tenantId) == null
  ) {
    throw new Error(
      'Visitpad catalog write blocked: a tenant is selected but its id is not a canonical UUID, so iq_tenant_id would be omitted and the change would apply to the global_master catalog. Use a UUID tenant id from the platform tenant registry or clear tenant selection before editing the platform catalog.',
    );
  }

  return headers;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  context?: ApiClientContext,
): Promise<T> {
  return parseJsonResponse<T>(
    await fetchWithAuthRetry(path, options, context, true),
  );
}

/** Master-data / UM / billing calls scoped to a specific tenant (configurator tenant detail). */
export async function apiClientWithIqTenant<T>(
  iqTenantId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const tid = iqTenantId.trim().toLowerCase();
  headers.set('iq_tenant_id', tid);
  headers.set('x-tenant-id', tid);
  return apiClient<T>(path, { ...options, headers });
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

function isInvalidOrExpiredTokenResponse(status: number, body: string): boolean {
  if (status !== 401) {
    return false;
  }

  const parsed = parseApiErrorBody(body);
  return parsed?.code === 'AUTH_INVALID_TOKEN';
}

async function fetchWithAuthRetry(
  path: string,
  options: RequestInit,
  context: ApiClientContext | undefined,
  canRetryWithFreshToken: boolean,
): Promise<Response> {
  const headers = buildRequestHeaders(path, options, context);
  const tenantId = resolveEffectiveTenantId(context);
  const accessToken = useAuthStore.getState().accessToken;
  const catalogTenant = catalogIqTenantHeaderValue(tenantId);
  const omitTenantHeaders = shouldOmitTenantHeaders(context);

  if (!omitTenantHeaders) {
    if (
      !path.startsWith(BILLING_API_PREFIX) &&
      catalogTenant &&
      !headers.has('iq_tenant_id')
    ) {
      headers.set('iq_tenant_id', catalogTenant);
      headers.set('x-tenant-id', catalogTenant);
    }
    /** EMPI and Registration require `iq_tenant_id` (or `x-tenant-id`). */
    if (
      (path.startsWith(EMPI_API_PREFIX) || isRegistrationApiPath(path)) &&
      !headers.has('iq_tenant_id')
    ) {
      headers.set('iq_tenant_id', serviceIqTenantHeaderValue(tenantId));
      headers.set('x-tenant-id', serviceIqTenantHeaderValue(tenantId));
    }
    /** Configurator tenantPlugin (legacy) rejects requests without a tenant header. */
    if (
      path.startsWith(CONFIGURATOR_API_PREFIX) &&
      !headers.has('iq_tenant_id') &&
      !headers.has('x-tenant-id')
    ) {
      headers.set('x-tenant-id', serviceIqTenantHeaderValue(tenantId));
    }
    /** Billing tariffs are tenant-scoped — JWT/home tenant; never stale EMPI placeholder. */
    if (path.startsWith(BILLING_API_PREFIX)) {
      const billingTenant = billingIqTenantHeaderValue(tenantId, accessToken);
      headers.set('iq_tenant_id', billingTenant);
      headers.set('x-tenant-id', billingTenant);
    }
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
    credentials: 'include',
  });

  if (response.ok || !canRetryWithFreshToken) {
    return response;
  }

  const body = await response.text();
  if (isInvalidOrExpiredTokenResponse(response.status, body)) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return fetchWithAuthRetry(path, options, context, false);
    }
  }

  throw new ApiError(response.status, body);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Read-only catalog fetch that **never** sends `iq_tenant_id`, so the global_master
 * library is always used — e.g. “Import from platform library” while a tenant UUID is active.
 */
export async function apiClientGlobalCatalogRead<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return parseJsonResponse<T>(
    await fetchWithAuthRetry(path, options, { tenantIdOverride: null }, true),
  );
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
