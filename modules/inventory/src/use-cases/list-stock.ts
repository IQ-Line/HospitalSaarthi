import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";
import { StoreNotFoundError, StoreValidationError } from "../errors.js";
import type { ListStockQuery } from "../domain/stock.types.js";
import { computeStockStatus, toQtyNumber } from "../domain/stock-status.js";

export type ListStockDeps = {
  stockRepo: DrizzleInventoryStockRepository;
  storeRepo: StoreRepo;
};

async function assertActiveStore(deps: ListStockDeps, tenantId: string, storeId: string) {
  const store = await deps.storeRepo.findById(tenantId, storeId);
  if (!store) throw new StoreNotFoundError();
  if (!store.is_active) throw new StoreValidationError("Store must be active");
  return store;
}

function wireStockRow(
  row: Awaited<ReturnType<DrizzleInventoryStockRepository["listAggregated"]>>[number],
  storeId: string,
) {
  const availableQty = toQtyNumber(row.available_qty);
  const reorderPoint = toQtyNumber(row.reorder_point);
  const status = computeStockStatus(availableQty, reorderPoint);
  return {
    id: row.item_id,
    item_id: row.item_id,
    item_code: row.item_code,
    item_name: row.item_name,
    quantity: availableQty,
    uom: row.unit_of_measure,
    reorder_at: reorderPoint,
    min_reorder: reorderPoint,
    status,
    store_id: storeId,
    batches: row.batch_count,
  };
}

export async function listStock(deps: ListStockDeps, tenantId: string, query: ListStockQuery) {
  await assertActiveStore(deps, tenantId, query.store_id);

  const page = query.page ?? 1;
  const pageSize = query.page_size ?? 200;
  const filters = {
    storeId: query.store_id,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { search: query.search } : {}),
  };

  const [total, rows, summary] = await Promise.all([
    deps.stockRepo.countAggregated(tenantId, filters),
    deps.stockRepo.listAggregated(tenantId, filters, { page, pageSize }),
    deps.stockRepo.listSummaryCounts(tenantId, query.store_id, query.search),
  ]);

  return {
    data: rows.map((row) => wireStockRow(row, query.store_id)),
    total,
    summary,
  };
}
