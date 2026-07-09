import { and, asc, eq, sql } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { TransferValidationError } from "../errors.js";
import { inventoryLots, inventoryStock } from "../schema/tables.js";

export type StockTx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

export type StockDeduction = {
  stockId: string;
  lotId: string | null;
  qty: number;
};

type DeductStockFefoParams = {
  tenantId: string;
  storeId: string;
  itemId: string;
  qty: number;
  transferDate: string;
};

function isExpired(expiryDate: string | null, transferDate: string): boolean {
  if (!expiryDate) return false;
  return expiryDate < transferDate;
}

/**
 * Deducts stock from a single store using FEFO at the lot level internally.
 * Does not credit any destination store — used for transfer dispatch.
 */
export async function deductStockFefo(
  tx: StockTx,
  params: DeductStockFefoParams,
): Promise<StockDeduction[]> {
  const { tenantId, storeId, itemId, qty, transferDate } = params;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new TransferValidationError("Dispatch quantity must be greater than zero");
  }

  const deductions: StockDeduction[] = [];

  const stockRows = await tx
    .select({
      id: inventoryStock.id,
      lot_id: inventoryStock.lot_id,
      quantity: inventoryStock.quantity,
      expiry_date: inventoryLots.expiry_date,
    })
    .from(inventoryStock)
    .leftJoin(
      inventoryLots,
      and(
        eq(inventoryStock.iq_tenant_id, inventoryLots.iq_tenant_id),
        eq(inventoryStock.lot_id, inventoryLots.id),
      ),
    )
    .where(
      and(
        eq(inventoryStock.iq_tenant_id, tenantId),
        eq(inventoryStock.inventory_store_id, storeId),
        eq(inventoryStock.item_id, itemId),
        sql`${inventoryStock.quantity}::numeric > 0`,
      ),
    )
    .orderBy(asc(inventoryLots.expiry_date), asc(inventoryStock.created_at));

  let remaining = qty;
  for (const stock of stockRows) {
    if (remaining <= 0) break;
    if (isExpired(stock.expiry_date, transferDate)) continue;

    const available = Number(stock.quantity);
    if (available <= 0) continue;
    const move = Math.min(remaining, available);

    await tx
      .update(inventoryStock)
      .set({ quantity: String(available - move), updated_at: new Date() })
      .where(and(eq(inventoryStock.iq_tenant_id, tenantId), eq(inventoryStock.id, stock.id)));

    deductions.push({ stockId: stock.id, lotId: stock.lot_id, qty: move });
    remaining -= move;
  }

  if (remaining > 0) {
    throw new TransferValidationError(`Insufficient stock at source store for item ${itemId}`);
  }

  return deductions;
}
