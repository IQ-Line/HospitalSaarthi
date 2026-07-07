import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryTransferRepository } from "../data-access/transfer.repo.js";
import type { StockTransferRow } from "../domain/transfer.types.js";
import { TransferNotFoundError } from "../errors.js";
import { indentStoreRef } from "./list-indents.js";

export function wireStockTransfer(row: StockTransferRow) {
  return {
    id: row.id,
    tenant_id: row.iq_tenant_id,
    transfer_number: row.transfer_number,
    transfer_date: row.transfer_date,
    from_store_id: row.from_store_id,
    to_store_id: row.to_store_id,
    transfer_type: row.transfer_type,
    status: row.status,
    remarks: row.remarks,
    inventory_indent_id: row.inventory_indent_id,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export type GetStockTransferDeps = {
  transferRepo: DrizzleInventoryTransferRepository;
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function getStockTransfer(
  deps: GetStockTransferDeps,
  tenantId: string,
  transferId: string,
) {
  const row = await deps.transferRepo.findById(tenantId, transferId);
  if (!row) throw new TransferNotFoundError();

  const storeRows = await deps.indentRepo.findStoresByIds(tenantId, [
    row.from_store_id,
    row.to_store_id,
  ]);
  const storeMap = new Map(storeRows.map((store) => [store.id, store]));

  const lines = await deps.transferRepo.listLinesWithItems(tenantId, transferId);
  const wired = wireStockTransfer(row);

  return {
    ...wired,
    from_store: indentStoreRef(storeMap.get(row.from_store_id)),
    to_store: indentStoreRef(storeMap.get(row.to_store_id)),
    lines: lines.map((line) => ({
      id: line.id,
      tenant_id: line.iq_tenant_id,
      stock_transfer_id: line.stock_transfer_id,
      item_id: line.item_id,
      transfer_qty: Number(line.transfer_qty),
      line_remarks: line.line_remarks,
      sort_order: line.sort_order,
      created_at: line.created_at.toISOString(),
      item: line.item,
    })),
  };
}
