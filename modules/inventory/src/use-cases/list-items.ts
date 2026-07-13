import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import { extractItemMasterPricing } from "../lib/item-master-pricing.js";

export type ListItemsDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export type ListItemsQuery = {
  search?: string;
  is_active?: boolean;
  category_id?: string;
  item_classification?: "inventory" | "medicine";
  /** Pharmacy dispense picker — medicine items linked to tenant formulary only. */
  for_dispense?: boolean;
  /** Required for for_dispense — only items with stock at this store. */
  store_id?: string;
  limit: number;
  offset: number;
};

export type DispenseMedicineItemListRow = {
  id: string;
  item_code: string;
  display_name: string;
  tenant_formulary_id: string;
  mrp: string;
  gst_percent: string;
  /** Sum of on-hand qty at the requested store (for_dispense only). */
  available_qty: string;
};

function mapDispenseMedicineItemRow(
  row: Awaited<ReturnType<DrizzleInventoryItemRepository["list"]>>["rows"][number],
): DispenseMedicineItemListRow | null {
  const tenantFormularyId = row.tenant_formulary_id?.trim();
  if (!tenantFormularyId) return null;

  const pricing = extractItemMasterPricing(row);
  const availableRaw = row.available_qty != null ? Number(row.available_qty) : 0;
  return {
    id: row.id,
    item_code: pricing.item_code,
    display_name: row.display_name.trim() || row.name.trim(),
    tenant_formulary_id: tenantFormularyId,
    mrp: pricing.mrp,
    gst_percent: pricing.gst_percent,
    available_qty: Number.isFinite(availableRaw) ? String(availableRaw) : "0",
  };
}

export async function listItems(
  deps: ListItemsDeps,
  tenantId: string,
  query: ListItemsQuery,
) {
  const forDispense = query.for_dispense === true;
  const storeId = query.store_id?.trim() || undefined;

  if (forDispense && !storeId) {
    return { data: [] as DispenseMedicineItemListRow[], total: 0 };
  }

  const { rows, total } = await deps.itemRepo.list(tenantId, {
    search: query.search,
    isActive: query.is_active ?? (forDispense ? true : undefined),
    categoryId: query.category_id,
    itemClassification: forDispense ? "medicine" : query.item_classification,
    linkedToFormulary: forDispense ? true : undefined,
    storeId: forDispense ? storeId : undefined,
    limit: query.limit,
    offset: query.offset,
  });

  if (forDispense) {
    const data = rows.flatMap((row) => {
      const mapped = mapDispenseMedicineItemRow(row);
      return mapped ? [mapped] : [];
    });
    return { data, total };
  }

  return {
    data: rows.map((row) => {
      const tenantFormularyId = row.tenant_formulary_id?.trim() || null;
      const base = {
        id: row.id,
        item_code: row.item_code,
        name: row.name,
        display_name: row.display_name,
        item_classification: row.item_classification,
        item_type_id: row.item_type_id,
        category_id: row.category_id,
        manufacturer_id: row.manufacturer_id,
        is_active: row.is_active,
        unit_of_measure: row.unit_of_measure,
        tracking_mode: row.tracking_mode as "lot" | "serial" | "none",
        is_expirable: row.is_expirable,
        tenant_formulary_id: tenantFormularyId,
      };

      if (row.item_classification !== "medicine") {
        return base;
      }

      const pricing = extractItemMasterPricing(row);
      return {
        ...base,
        mrp: pricing.mrp,
        gst_percent: pricing.gst_percent,
      };
    }),
    total,
  };
}
