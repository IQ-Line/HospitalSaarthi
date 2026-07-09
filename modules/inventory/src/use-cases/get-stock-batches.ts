import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";
import {
  ItemNotFoundError,
  StoreNotFoundError,
  StoreValidationError,
} from "../errors.js";
import {
  computeBatchExpiryStatus,
  computeStockStatus,
  toQtyNumber,
} from "../domain/stock-status.js";

export type GetStockBatchesDeps = {
  stockRepo: DrizzleInventoryStockRepository;
  storeRepo: StoreRepo;
};

export type GetStockBatchesQuery = {
  store_id: string;
};

async function assertActiveStore(deps: GetStockBatchesDeps, tenantId: string, storeId: string) {
  const store = await deps.storeRepo.findById(tenantId, storeId);
  if (!store) throw new StoreNotFoundError();
  if (!store.is_active) throw new StoreValidationError("Store must be active");
  return store;
}

export async function getStockBatches(
  deps: GetStockBatchesDeps,
  tenantId: string,
  itemId: string,
  query: GetStockBatchesQuery,
) {
  await assertActiveStore(deps, tenantId, query.store_id);

  const itemExists = await deps.stockRepo.isActiveItem(tenantId, itemId);
  if (!itemExists) throw new ItemNotFoundError();

  const batchRows = await deps.stockRepo.listBatchesForStoreItem(
    tenantId,
    query.store_id,
    itemId,
  );

  const availableQty = batchRows.reduce((sum, row) => sum + toQtyNumber(row.quantity), 0);

  return {
    data: batchRows.map((row) => ({
      id: row.stock_id,
      lot_number: row.lot_number ?? "—",
      expiry_date: row.expiry_date ?? "",
      received_date: row.received_date ?? "",
      quantity: toQtyNumber(row.quantity),
      expiry_status: computeBatchExpiryStatus(row.expiry_date),
    })),
    summary: {
      available_qty: availableQty,
      status: computeStockStatus(availableQty, 0),
      batch_count: batchRows.length,
    },
  };
}
