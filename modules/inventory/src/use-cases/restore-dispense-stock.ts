import { and, asc, eq } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { TransferValidationError } from "../errors.js";
import { creditStockToStore } from "../lib/credit-stock.js";
import type { StockTx } from "../lib/deduct-stock-fefo.js";
import { inventoryStock } from "../schema/tables.js";
import type { StoreRepo } from "../ports.js";

export type RestoreDispenseStockLine = {
  item_id: string;
  quantity: number;
  /** When set, restore onto this lot/batch; otherwise restore to any stock row. */
  lot_id?: string | null;
};

export type RestoreDispenseStockInput = {
  store_id: string;
  lines: RestoreDispenseStockLine[];
};

export type RestoreDispenseStockResult = {
  store_id: string;
  restorations: Array<{
    item_id: string;
    quantity: number;
    stock_id: string;
    lot_id: string | null;
  }>;
};

type AggregatedRestore = {
  itemId: string;
  lotId: string | null;
  qty: number;
};

/**
 * Aggregates positive quantities.
 * Batch lines (lot_id set) key by item+lot; unbatched lines key by item only.
 */
function aggregateRestoreLines(
  lines: readonly RestoreDispenseStockLine[],
): AggregatedRestore[] {
  const totals = new Map<string, AggregatedRestore>();
  for (const line of lines) {
    const itemId = line.item_id?.trim();
    if (!itemId) continue;
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;
    const lotId = line.lot_id?.trim() || null;
    const key = lotId ? `${itemId}\0${lotId}` : itemId;
    const existing = totals.get(key);
    if (existing) {
      existing.qty += line.quantity;
    } else {
      totals.set(key, { itemId, lotId, qty: line.quantity });
    }
  }
  return [...totals.values()];
}

/** Credits any existing stock row for the item, or inserts an unlotted row. */
async function restoreWithoutBatch(
  tx: StockTx,
  params: {
    tenantId: string;
    storeId: string;
    itemId: string;
    qty: number;
  },
): Promise<string> {
  const [existing] = await tx
    .select({ id: inventoryStock.id, quantity: inventoryStock.quantity })
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.iq_tenant_id, params.tenantId),
        eq(inventoryStock.inventory_store_id, params.storeId),
        eq(inventoryStock.item_id, params.itemId),
      ),
    )
    .orderBy(asc(inventoryStock.created_at))
    .limit(1);

  if (existing) {
    await tx
      .update(inventoryStock)
      .set({
        quantity: String(Number(existing.quantity) + params.qty),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(inventoryStock.iq_tenant_id, params.tenantId),
          eq(inventoryStock.id, existing.id),
        ),
      );
    return existing.id;
  }

  const [created] = await tx
    .insert(inventoryStock)
    .values({
      iq_tenant_id: params.tenantId,
      item_id: params.itemId,
      inventory_store_id: params.storeId,
      lot_id: null,
      quantity: String(params.qty),
    })
    .returning({ id: inventoryStock.id });

  if (!created) {
    throw new TransferValidationError(`Failed to restore stock for item ${params.itemId}`);
  }
  return created.id;
}

/**
 * Credits store stock for pharmacy medicine returns.
 * When `lot_id` is present, restores onto that batch; otherwise restores onto
 * any existing stock row for the item (or a new unlotted row).
 */
export async function restoreDispenseStock(
  deps: { db: DbInstance; storeRepo: StoreRepo },
  tenantId: string,
  input: RestoreDispenseStockInput,
): Promise<RestoreDispenseStockResult> {
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

  const aggregated = aggregateRestoreLines(input.lines);
  if (aggregated.length === 0) {
    return { store_id: storeId, restorations: [] };
  }

  const restorations: RestoreDispenseStockResult["restorations"] = [];

  await deps.db.transaction(async (tx) => {
    for (const { itemId, lotId, qty } of aggregated) {
      const stockId = lotId
        ? await creditStockToStore(tx, {
            tenantId,
            storeId,
            itemId,
            qty,
            lotId,
          })
        : await restoreWithoutBatch(tx, {
            tenantId,
            storeId,
            itemId,
            qty,
          });

      restorations.push({
        item_id: itemId,
        quantity: qty,
        stock_id: stockId,
        lot_id: lotId,
      });
    }
  });

  return { store_id: storeId, restorations };
}
