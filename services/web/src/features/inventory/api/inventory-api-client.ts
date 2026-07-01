import { apiClient } from '@/lib/api-client';
import type { InventorySvcListResponse } from './api-types';
import { INVENTORY_API_BASE } from './query-keys';

export async function inventorySvcGetList<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<InventorySvcListResponse<T>> {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    q.set(key, String(value));
  }
  const query = q.toString();
  const url = `${INVENTORY_API_BASE}${path}${query ? `?${query}` : ''}`;
  return apiClient<InventorySvcListResponse<T>>(url);
}
