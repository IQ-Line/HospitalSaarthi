import { apiClient } from '@/lib/api-client';
import { INVENTORY_ITEMS_API_BASE } from '@/features/inventory-masters/api/query-keys';

export type ItemCodePreview = {
  item_code: string;
};

export async function previewNextItemCode(itemTypeId: string): Promise<ItemCodePreview> {
  const params = new URLSearchParams({ item_type_id: itemTypeId });
  return apiClient<ItemCodePreview>(`${INVENTORY_ITEMS_API_BASE}/next-code?${params}`);
}
