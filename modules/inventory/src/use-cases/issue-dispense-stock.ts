import type { DbInstance } from "@hims/ts-sdk-db";
import { TransferValidationError } from "../errors.js";
import { deductStockFefo } from "../lib/deduct-stock-fefo.js";
import type { StoreRepo } from "../ports.js";

export type IssueDispenseStockLine = {
  item_id: string;
  quantity: number;
};

export type IssueDispenseStockInput = {
  store_id: string;
  lines: IssueDispenseStockLine[];
  /** ISO date (YYYY-MM-DD) used to skip expired lots — defaults to today UTC. */
  issue_date?: string;
};

export type IssueDispenseStockResult = {
  store_id: string;
  deductions: Array<{
    item_id: string;
    quantity: number;
    lots: Array<{ stock_id: string; lot_id: string | null; qty: number }>;
  }>;
};

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function aggregatePositiveQtyByItem(
  lines: readonly IssueDispenseStockLine[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const itemId = line.item_id?.trim();
    if (!itemId) continue;
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;
    totals.set(itemId, (totals.get(itemId) ?? 0) + line.quantity);
  }
  return totals;
}

/**
 * Deduct store stock for pharmacy dispense (FEFO). Service-to-service use.
 */
export async function issueDispenseStock(
  deps: { db: DbInstance; storeRepo: StoreRepo },
  tenantId: string,
  input: IssueDispenseStockInput,
): Promise<IssueDispenseStockResult> {
  const storeId = input.store_id?.trim();
  if (!storeId) {
    throw new TransferValidationError("store_id is required");
  }

  const store = await deps.storeRepo.findById(tenantId, storeId);
  if (!store || !store.is_active) {
    throw new TransferValidationError("Store not found or inactive");
  }
  if (!store.can_dispense) {
    throw new TransferValidationError("Store is not configured for dispensing");
  }

  const qtyByItem = aggregatePositiveQtyByItem(input.lines);
  if (qtyByItem.size === 0) {
    return { store_id: storeId, deductions: [] };
  }

  const issueDate = input.issue_date?.trim() || todayUtcDate();

  const deductions: IssueDispenseStockResult["deductions"] = [];

  await deps.db.transaction(async (tx) => {
    for (const [itemId, qty] of qtyByItem) {
      const lots = await deductStockFefo(tx, {
        tenantId,
        storeId,
        itemId,
        qty,
        transferDate: issueDate,
      });
      deductions.push({
        item_id: itemId,
        quantity: qty,
        lots: lots.map((lot) => ({
          stock_id: lot.stockId,
          lot_id: lot.lotId,
          qty: lot.qty,
        })),
      });
    }
  });

  return { store_id: storeId, deductions };
}
