import { and, eq, isNull } from "drizzle-orm";
import { TransferValidationError } from "../errors.js";
import { inventoryStock } from "../schema/tables.js";
import type { StockTx } from "./deduct-stock-fefo.js";

type CreditStockParams = {
  tenantId: string;
  storeId: string;
  itemId: string;
  qty: number;
};

/** Credits stock at a store (item-level, no lot) — used when receiving transfers. */
export async function creditStockToStore(tx: StockTx, params: CreditStockParams): Promise<void> {
  const { tenantId, storeId, itemId, qty } = params;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new TransferValidationError("Accepted quantity must be greater than zero");
  }

  const [existing] = await tx
    .select({ id: inventoryStock.id, quantity: inventoryStock.quantity })
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.iq_tenant_id, tenantId),
        eq(inventoryStock.inventory_store_id, storeId),
        eq(inventoryStock.item_id, itemId),
        isNull(inventoryStock.lot_id),
      ),
    )
    .limit(1);

  if (existing) {
    await tx
      .update(inventoryStock)
      .set({
        quantity: String(Number(existing.quantity) + qty),
        updated_at: new Date(),
      })
      .where(and(eq(inventoryStock.iq_tenant_id, tenantId), eq(inventoryStock.id, existing.id)));
    return;
  }

  await tx.insert(inventoryStock).values({
    iq_tenant_id: tenantId,
    item_id: itemId,
    inventory_store_id: storeId,
    lot_id: null,
    quantity: String(qty),
  });
}
