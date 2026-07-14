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

  const stockByItem = new Map<
    string,
    { item_id: string; item_code: string; item_name: string; quantity: number }
  >();
  for (const row of response.data) {
    const qty = Number(row.quantity) || 0;
    if (qty <= 0) continue;
    const existing = stockByItem.get(row.item_id);
    if (existing) {
      existing.quantity += qty;
    } else {
      stockByItem.set(row.item_id, {
        item_id: row.item_id,
        item_code: row.item_code,
        item_name: row.item_name,
        quantity: qty,
      });
    }
  }

  const priced = await Promise.all(
    [...stockByItem.values()].map(async (row) => {
      const pricing = await fetchDispenseItemPricingByItemId(row.item_id);
      const code = (pricing?.item_code?.trim() || row.item_code || '').trim();
      const mrp = pricing?.mrp?.trim() && pricing.mrp.trim() !== '0'
        ? pricing.mrp.trim()
        : '0';
      const gst =
        pricing?.gst_percent?.trim() && pricing.gst_percent.trim() !== '0'
          ? pricing.gst_percent.trim()
          : '0';
      return {
        id: row.item_id,
        code,
        name: row.item_name,
        available: row.quantity,
        batch: '',
        mrp,
        gst_percent: gst,
      } satisfies DispenseStoreStockOption;
    }),
  );

  return priced;
}
