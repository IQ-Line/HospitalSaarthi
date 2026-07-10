import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";

export type ListIndentStoresDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
  storeRepo: StoreRepo;
};

export async function listIndentStores(
  deps: ListIndentStoresDeps,
  tenantId: string,
  options: { role?: "from" | "to" | "all"; from_store_id?: string },
) {
  const stores = await deps.indentRepo.findStoresWithIndentMeta(tenantId);

  if (options.role === "from") {
    // Sending / approving stores (typically hubs without indent authority).
    return {
      stores: stores
        .filter((store) => !store.indent_authority)
        .map((store) => ({
          store_id: store.id,
          store_code: store.store_code,
          store_name: store.store_name,
          indent_authority: store.indent_authority,
          indent_target_store_id: store.indent_target_store_id,
        })),
    };
  }

  if (options.role === "to") {
    // Receiving stores that can raise indents against a target hub.
    if (options.from_store_id) {
      return {
        stores: stores
          .filter(
            (store) =>
              store.indent_authority && store.indent_target_store_id === options.from_store_id,
          )
          .map((store) => ({
            store_id: store.id,
            store_code: store.store_code,
            store_name: store.store_name,
            indent_authority: store.indent_authority,
            indent_target_store_id: store.indent_target_store_id,
          })),
      };
    }
    return {
      stores: stores
        .filter((store) => store.indent_authority)
        .map((store) => ({
          store_id: store.id,
          store_code: store.store_code,
          store_name: store.store_name,
          indent_authority: store.indent_authority,
          indent_target_store_id: store.indent_target_store_id,
        })),
    };
  }

  return {
    stores: stores.map((store) => ({
      store_id: store.id,
      store_code: store.store_code,
      store_name: store.store_name,
      indent_authority: store.indent_authority,
      indent_target_store_id: store.indent_target_store_id,
    })),
  };
}

export type ListIndentItemsDeps = {
  stockRepo: DrizzleInventoryStockRepository;
  itemRepo: import("../data-access/items.repo.js").DrizzleInventoryItemRepository;
};

export async function listIndentItems(
  deps: ListIndentItemsDeps,
  tenantId: string,
  query: {
    from_store_id: string;
    search?: string;
    classification?: "inventory" | "medicine";
    active_only?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const limit = query.limit ?? 100;
  const page = Math.floor((query.offset ?? 0) / limit) + 1;
  const filters = {
    storeId: query.from_store_id,
    ...(query.search ? { search: query.search } : {}),
  };

  const [total, rows] = await Promise.all([
    deps.stockRepo.countAggregated(tenantId, filters),
    deps.stockRepo.listAggregated(tenantId, filters, { page, pageSize: limit }),
  ]);

  return {
    items: rows.map((row) => ({
      item_id: row.item_id,
      item_code: row.item_code,
      name: row.item_name,
      unit_of_measure: row.unit_of_measure,
      is_lot_tracked: row.batch_count > 0,
      available_qty: Number(row.available_qty),
    })),
    pagination: {
      page,
      page_size: limit,
      total,
    },
  };
}

export async function checkActiveIndents(
  deps: { indentRepo: DrizzleInventoryIndentRepository },
  tenantId: string,
  query: {
    from_store_id: string;
    to_store_id?: string;
    item_id: string;
    exclude_indent_id?: string;
  },
) {
  const matches = await deps.indentRepo.listActiveIndentsForItem(
    tenantId,
    query.from_store_id,
    query.item_id,
    query.exclude_indent_id,
    query.to_store_id,
  );
  return { matches };
}
