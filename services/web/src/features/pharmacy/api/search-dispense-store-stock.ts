import { inventorySvcGet } from '@/features/inventory/api/inventory-api-client';
import type { InventorySvcStockListResponse } from '@/features/inventory/api/api-types';
import { fetchDispenseItemPricingByItemId } from './dispense-item-pricing';

export type DispenseStoreStockOption = {
  id: string;
  code: string;
  name: string;
  available: number;
  batch: string;
  mrp: string;
  gst_percent: string;
};

/** Stocked items at the selected pharmacy store for the issued-item picker. */
export async function searchDispenseStoreStock(
  storeId: string,
  search = '',
): Promise<DispenseStoreStockOption[]> {
  const trimmedStoreId = storeId.trim();
  if (!trimmedStoreId) return [];

  const response = await inventorySvcGet<InventorySvcStockListResponse>('/stock', {
    store_id: trimmedStoreId,
    search: search.trim() || undefined,
    page_size: 50,
  });

  const stockRows = response.data.filter((row) => Number(row.quantity) > 0);

  const priced = await Promise.all(
    stockRows.map(async (row) => {
      const pricing = await fetchDispenseItemPricingByItemId(row.item_id);
      return {
        id: row.item_id,
        code: pricing?.item_code?.trim() || row.item_code,
        name: row.item_name,
        available: Number(row.quantity) || 0,
        batch: '',
        mrp: pricing?.mrp?.trim() || '0',
        gst_percent: pricing?.gst_percent?.trim() || '0',
      } satisfies DispenseStoreStockOption;
    }),
  );

  return priced;
}
