import { apiClient } from '@/lib/api-client';
import { INVENTORY_ITEMS_API_BASE } from '@/features/inventory-masters/api/query-keys';
import { inventoryMastersApiContext } from '@/features/inventory-masters/lib/inventory-catalog-api-context';

export type DispenseItemMasterPricing = {
  item_id: string;
  item_code: string;
  mrp: string;
  gst_percent: string;
};

type DispenseItemPricingResponse = {
  data: DispenseItemMasterPricing;
};

const inventoryApiContext = () => inventoryMastersApiContext();

/** Authoritative MRP/GST for a medicine item-master row. */
export async function fetchDispenseItemPricingByItemId(
  itemId: string,
): Promise<DispenseItemMasterPricing | null> {
  const trimmed = itemId.trim();
  if (!trimmed) return null;

  try {
    const response = await apiClient<DispenseItemPricingResponse>(
      `${INVENTORY_ITEMS_API_BASE}/${encodeURIComponent(trimmed)}/dispense-pricing`,
      { method: 'GET' },
      inventoryApiContext(),
    );
    return response.data;
  } catch {
    return null;
  }
}

/** Loads MRP and GST from the inventory item master linked to a visitpad formulary medicine. */
export async function fetchDispenseItemPricingByFormularyId(
  formularyMedicineId: string,
): Promise<DispenseItemMasterPricing | null> {
  const trimmed = formularyMedicineId.trim();
  if (!trimmed) return null;

  try {
    const response = await apiClient<DispenseItemPricingResponse>(
      `${INVENTORY_ITEMS_API_BASE}/by-formulary/${encodeURIComponent(trimmed)}`,
      { method: 'GET' },
      inventoryApiContext(),
    );
    return response.data;
  } catch {
    return null;
  }
}

function preferPricingField(remote: string | undefined, fallback: string): string {
  const remoteTrimmed = remote?.trim() ?? '';
  if (remoteTrimmed !== '' && remoteTrimmed !== '0') return remoteTrimmed;
  const fallbackTrimmed = fallback.trim();
  return fallbackTrimmed !== '' ? fallbackTrimmed : '0';
}

export async function resolveDispenseItemPricing(
  item: { id: string; tenant_formulary_id: string; item_code: string; mrp: string; gst_percent: string },
): Promise<{ item_code: string; mrp: string; gst_percent: string }> {
  const listFallback = {
    item_code: item.item_code,
    mrp: item.mrp || '0',
    gst_percent: item.gst_percent || '0',
  };

  const fromItem = await fetchDispenseItemPricingByItemId(item.id);
  if (fromItem) {
    return {
      item_code: fromItem.item_code || listFallback.item_code,
      mrp: preferPricingField(fromItem.mrp, listFallback.mrp),
      gst_percent: preferPricingField(fromItem.gst_percent, listFallback.gst_percent),
    };
  }

  const fromFormulary = await fetchDispenseItemPricingByFormularyId(item.tenant_formulary_id);
  if (fromFormulary) {
    return {
      item_code: fromFormulary.item_code || listFallback.item_code,
      mrp: preferPricingField(fromFormulary.mrp, listFallback.mrp),
      gst_percent: preferPricingField(fromFormulary.gst_percent, listFallback.gst_percent),
    };
  }

  return listFallback;
}
