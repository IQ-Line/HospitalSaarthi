import { apiClient } from '@/lib/api-client';
import { mockTariffStore } from './mock-tariff-store';
import type {
  ServiceCreateInput,
  ServiceSingleResponse,
  ServicesListParams,
  ServicesListResponse,
  ServiceUpdateInput,
} from '../types';

const BASE = '/api/billing/v1/services';

/** Dev UI without billing-svc — set VITE_BILLING_USE_MOCK=false to call the API. */
export const billingUseMock =
  import.meta.env.VITE_BILLING_USE_MOCK === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_BILLING_USE_MOCK !== 'false');

function listQueryString(params: ServicesListParams): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.category?.trim()) sp.set('category', params.category.trim());
  if (params.department?.trim()) sp.set('department', params.department.trim());
  if (params.is_active !== undefined) sp.set('is_active', String(params.is_active));
  sp.set('limit', '200');
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function listTariffServices(params: ServicesListParams): Promise<ServicesListResponse> {
  if (billingUseMock) return Promise.resolve(mockTariffStore.list(params));
  return apiClient<ServicesListResponse>(`${BASE}${listQueryString(params)}`);
}

export function createTariffService(input: ServiceCreateInput): Promise<ServiceSingleResponse> {
  if (billingUseMock) return Promise.resolve(mockTariffStore.create(input));
  return apiClient<ServiceSingleResponse>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTariffService(
  id: string,
  input: ServiceUpdateInput,
): Promise<ServiceSingleResponse> {
  if (billingUseMock) return Promise.resolve(mockTariffStore.update(id, input));
  return apiClient<ServiceSingleResponse>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
