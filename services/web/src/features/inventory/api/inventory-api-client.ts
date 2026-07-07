import { apiClient } from '@/lib/api-client';
import type { InventorySvcListResponse } from './api-types';
import { INVENTORY_API_BASE } from './query-keys';

type QueryParamValue = string | number | boolean | undefined;

function buildQueryString(params: Record<string, QueryParamValue>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    q.set(key, String(value));
  }
  const query = q.toString();
  return query ? `?${query}` : '';
}

export async function inventorySvcGetList<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<InventorySvcListResponse<T>> {
  return apiClient<InventorySvcListResponse<T>>(`${INVENTORY_API_BASE}${path}${buildQueryString(params)}`);
}

export async function inventorySvcGet<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  return apiClient<T>(`${INVENTORY_API_BASE}${path}${buildQueryString(params)}`);
}

export async function inventorySvcPost<T>(path: string, body: unknown): Promise<T> {
  return apiClient<T>(`${INVENTORY_API_BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function inventorySvcPatch<T>(path: string, body: unknown): Promise<T> {
  return apiClient<T>(`${INVENTORY_API_BASE}${path}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function inventorySvcPut<T>(path: string, body: unknown): Promise<T> {
  return apiClient<T>(`${INVENTORY_API_BASE}${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
