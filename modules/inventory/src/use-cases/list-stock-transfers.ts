import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryTransferRepository } from "../data-access/transfer.repo.js";
import type { ListStockTransfersQuery } from "../domain/transfer.types.js";
import { indentStoreRef } from "./list-indents.js";
import { wireStockTransfer } from "./get-stock-transfer.js";

export type ListStockTransfersDeps = {
  transferRepo: DrizzleInventoryTransferRepository;
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function listStockTransfers(
  deps: ListStockTransfersDeps,
  tenantId: string,
  query: ListStockTransfersQuery,
) {
  const result = await deps.transferRepo.list(tenantId, query);
  const storeIds = [
    ...new Set(result.rows.flatMap((row) => [row.from_store_id, row.to_store_id])),
  ];
  const storeRows = await deps.indentRepo.findStoresByIds(tenantId, storeIds);
  const storeMap = new Map(storeRows.map((store) => [store.id, store]));

  const items = result.rows.map((row) => ({
    ...wireStockTransfer(row),
    from_store: indentStoreRef(storeMap.get(row.from_store_id)),
    to_store: indentStoreRef(storeMap.get(row.to_store_id)),
  }));

  return { items, total: result.total };
}
