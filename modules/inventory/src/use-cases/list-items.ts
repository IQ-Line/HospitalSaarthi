import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";

export type ListItemsDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export type ListItemsQuery = {
  search?: string;
  is_active?: boolean;
  category_id?: string;
  item_classification?: "inventory" | "medicine";
  limit: number;
  offset: number;
};

export async function listItems(
  deps: ListItemsDeps,
  tenantId: string,
  query: ListItemsQuery,
) {
  const { rows, total } = await deps.itemRepo.list(tenantId, {
    search: query.search,
    isActive: query.is_active,
    categoryId: query.category_id,
    itemClassification: query.item_classification,
    limit: query.limit,
    offset: query.offset,
  });

  return {
    data: rows.map((row) => ({
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
    })),
    total,
  };
}
