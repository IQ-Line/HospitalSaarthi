import {
  billingIqTenantHeaderValue,
  catalogIqTenantHeaderValue,
} from '@/lib/catalog-tenant';
import { apiClient, apiClientWithIqTenant } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import type {
  ServiceCreateInput,
  ServiceSingleResponse,
  ServicesListParams,
  ServicesListResponse,
  ServiceUpdateInput,
} from '../types';

const BASE = '/api/billing/v1/services';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Explicit per-call tenant wins; else JWT, then session store (see billingIqTenantHeaderValue). */
function resolveBillingTenantId(explicit?: string): string {
  if (explicit) {
    const fromExplicit = catalogIqTenantHeaderValue(explicit);
    if (fromExplicit) return fromExplicit;
  }
  return billingIqTenantHeaderValue(
    useTenantStore.getState().tenantId,
    useAuthStore.getState().accessToken,
  );
}

function billingFetch<T>(
  iqTenantId: string | undefined,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const tid = resolveBillingTenantId(iqTenantId);
  if (iqTenantId) {
    return apiClientWithIqTenant<T>(tid, path, options);
  }
  return apiClient<T>(path, options);
}

function clampLimit(raw: number | undefined): number {
  const n = raw ?? DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
}

function listQueryString(params: ServicesListParams): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.category?.trim()) sp.set('category', params.category.trim());
  if (params.department?.trim()) sp.set('department', params.department.trim());
  if (params.is_active !== undefined) sp.set('is_active', String(params.is_active));
  sp.set('limit', String(clampLimit(params.limit)));
  if (params.cursor?.trim()) sp.set('cursor', params.cursor.trim());
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function listTariffServices(
  params: ServicesListParams,
  iqTenantId?: string,
): Promise<ServicesListResponse> {
  return billingFetch<ServicesListResponse>(
    iqTenantId,
    `${BASE}${listQueryString(params)}`,
  );
}

export function createTariffService(
  input: ServiceCreateInput,
  iqTenantId?: string,
): Promise<ServiceSingleResponse> {
  return billingFetch<ServiceSingleResponse>(iqTenantId, BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTariffService(
  id: string,
  input: ServiceUpdateInput,
  iqTenantId?: string,
): Promise<ServiceSingleResponse> {
  return billingFetch<ServiceSingleResponse>(iqTenantId, `${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
