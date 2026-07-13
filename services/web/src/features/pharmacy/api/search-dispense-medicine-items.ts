import { apiClient } from '@/lib/api-client';
import { INVENTORY_ITEMS_API_BASE } from '@/features/inventory-masters/api/query-keys';
import { inventoryMastersApiContext } from '@/features/inventory-masters/lib/inventory-catalog-api-context';

export type DispenseMedicineItemOption = {
  id: string;
  item_code: string;
  display_name: string;
  tenant_formulary_id: string;
  mrp: string;
  gst_percent: string;
};

type DispenseMedicineItemListResponse = {
  data: Array<Record<string, unknown>>;
  total: number;
};

export const PHARMACY_DISPENSE_MEDICINE_SEARCH_PAGE = {
  limit: 50,
  offset: 0,
} as const;

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeDispenseMedicineItem(row: Record<string, unknown>): DispenseMedicineItemOption | null {
  if (row.item_classification === 'inventory') return null;

  const tenantFormularyId = asString(row.tenant_formulary_id);
  if (!tenantFormularyId) return null;

  const id = asString(row.id);
  if (!id) return null;

  return {
    id,
    item_code: asString(row.item_code),
    display_name: asString(row.display_name) || asString(row.name),
    tenant_formulary_id: tenantFormularyId,
    mrp: asString(row.mrp, '0'),
    gst_percent: asString(row.gst_percent, '0'),
  };
}

/** Active medicine item-master rows linked to tenant formulary medicines at a store. */
export async function searchDispenseMedicineItems(
  search = '',
  storeId: string,
): Promise<DispenseMedicineItemOption[]> {
  const trimmedStoreId = storeId.trim();
  if (!trimmedStoreId) {
    return [];
  }

  const params = new URLSearchParams({
    for_dispense: 'true',
    is_active: 'true',
    store_id: trimmedStoreId,
    limit: String(PHARMACY_DISPENSE_MEDICINE_SEARCH_PAGE.limit),
    offset: String(PHARMACY_DISPENSE_MEDICINE_SEARCH_PAGE.offset),
  });

  const trimmed = search.trim();
  if (trimmed) {
    params.set('search', trimmed);
  }

  const response = await apiClient<DispenseMedicineItemListResponse>(
    `${INVENTORY_ITEMS_API_BASE}?${params.toString()}`,
    { method: 'GET' },
    inventoryMastersApiContext(),
  );

  return response.data.flatMap((row) => {
    const normalized = normalizeDispenseMedicineItem(row);
    return normalized ? [normalized] : [];
  });
}
