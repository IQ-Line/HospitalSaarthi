import { and, eq, sql } from "drizzle-orm";
import { TransferValidationError } from "../errors.js";
import { inventoryLots, inventoryStock, inventoryStockTransferAllocations } from "../schema/tables.js";
import type { StockTx } from "./deduct-stock-fefo.js";
import { qtyGreaterThan } from "./qty-math.js";

export type StockAllocation = {
  allocationId: string;
  sourceStockId: string;
  lotId: string | null;
  qty: number;
  acceptedQty: number;
  returnedQty: number;
};

export function mapStockAllocation(row: {
  id: string;
  source_stock_id: string;
  lot_id: string | null;
  qty: string;
  accepted_qty: string | null;
  returned_qty: string | null;
}): StockAllocation {
  return {
    allocationId: row.id,
    sourceStockId: row.source_stock_id,
    lotId: row.lot_id,
    qty: Number(row.qty),
    acceptedQty: Number(row.accepted_qty ?? 0),
    returnedQty: Number(row.returned_qty ?? 0),
  };
}

export function allocationRemainingQty(allocation: StockAllocation): number {
  return Math.max(0, allocation.qty - allocation.acceptedQty - allocation.returnedQty);
}

type CreditStockParams = {
  tenantId: string;
  storeId: string;
  itemId: string;
  qty: number;
  lotId?: string | null;
};

/** Credits stock at a store, preserving lot identity when provided. */
export async function creditStockToStore(tx: StockTx, params: CreditStockParams): Promise<void> {
  const { tenantId, storeId, itemId, qty, lotId = null } = params;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new TransferValidationError("Accepted quantity must be greater than zero");
  }

  const lotFilter =
    lotId != null ? eq(inventoryStock.lot_id, lotId) : sql`${inventoryStock.lot_id} IS NULL`;

  const [existing] = await tx
    .select({ id: inventoryStock.id, quantity: inventoryStock.quantity })
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.iq_tenant_id, tenantId),
        eq(inventoryStock.inventory_store_id, storeId),
        eq(inventoryStock.item_id, itemId),
        lotFilter,
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
    lot_id: lotId,
    quantity: String(qty),
  });
}

/** Returns quantity to the original source stock row deducted at dispatch. */
export async function returnStockToSource(
  tx: StockTx,
  tenantId: string,
  sourceStockId: string,
  qty: number,
): Promise<void> {
  if (!Number.isFinite(qty) || qty <= 0) return;

  const [existing] = await tx
    .select({ id: inventoryStock.id, quantity: inventoryStock.quantity })
    .from(inventoryStock)
    .where(
      and(eq(inventoryStock.iq_tenant_id, tenantId), eq(inventoryStock.id, sourceStockId)),
    )
    .limit(1);

  if (!existing) {
    throw new TransferValidationError("Source stock row not found for rejection return");
  }

  await tx
    .update(inventoryStock)
    .set({
      quantity: String(Number(existing.quantity) + qty),
      updated_at: new Date(),
    })
    .where(and(eq(inventoryStock.iq_tenant_id, tenantId), eq(inventoryStock.id, existing.id)));
}

/** Finds or creates a matching lot at the destination store from a source lot. */
export async function resolveDestinationLot(
  tx: StockTx,
  tenantId: string,
  sourceLotId: string,
  destStoreId: string,
  itemId: string,
  transferDate: string,
): Promise<string> {
  const [sourceLot] = await tx
    .select({
      lot_number: inventoryLots.lot_number,
      expiry_date: inventoryLots.expiry_date,
      unit_cost: inventoryLots.unit_cost,
    })
    .from(inventoryLots)
    .where(and(eq(inventoryLots.iq_tenant_id, tenantId), eq(inventoryLots.id, sourceLotId)))
    .limit(1);

  if (!sourceLot) {
    throw new TransferValidationError("Source lot not found for transfer receive");
  }

  const normalizedLot = sourceLot.lot_number.trim().toLowerCase();
  const [existingLot] = await tx
    .select({ id: inventoryLots.id })
    .from(inventoryLots)
    .where(
      and(
        eq(inventoryLots.iq_tenant_id, tenantId),
        eq(inventoryLots.item_id, itemId),
        eq(inventoryLots.inventory_store_id, destStoreId),
        sql`lower(btrim(${inventoryLots.lot_number})) = ${normalizedLot}`,
      ),
    )
    .limit(1);

  if (existingLot) return existingLot.id;

  const [created] = await tx
    .insert(inventoryLots)
    .values({
      iq_tenant_id: tenantId,
      item_id: itemId,
      inventory_store_id: destStoreId,
      lot_number: sourceLot.lot_number,
      expiry_date: sourceLot.expiry_date,
      received_date: transferDate,
      initial_qty: "0",
      unit_cost: sourceLot.unit_cost,
    })
    .returning({ id: inventoryLots.id });

  if (!created) {
    throw new TransferValidationError("Failed to create destination lot for transfer receive");
  }

  return created.id;
}

export type AllocationSplit = { allocation: StockAllocation; qty: number };

/**
 * Splits a quantity across unconsumed dispatch allocations.
 * Forward = FEFO (accept at destination). Reverse = LIFO (return to source).
 */
export function splitQtyAcrossAllocations(
  allocations: StockAllocation[],
  amount: number,
  reverse = false,
): AllocationSplit[] {
  if (!Number.isFinite(amount) || amount <= 0) return [];
  if (!allocations.length) {
    throw new TransferValidationError("No dispatch allocations found for transfer line");
  }

  const ordered = reverse ? [...allocations].reverse() : allocations;
  let remaining = amount;
  const result: AllocationSplit[] = [];

  for (const allocation of ordered) {
    if (!qtyGreaterThan(remaining, 0)) break;
    const available = allocationRemainingQty(allocation);
    if (!qtyGreaterThan(available, 0)) continue;
    const take = Math.min(remaining, available);
    result.push({ allocation, qty: take });
    remaining -= take;
  }

  if (qtyGreaterThan(remaining, 0)) {
    throw new TransferValidationError("Dispatch allocations do not cover the requested quantity");
  }

  return result;
}

async function recordAllocationConsumption(
  tx: StockTx,
  tenantId: string,
  splits: AllocationSplit[],
  field: "accepted" | "returned",
): Promise<void> {
  for (const { allocation, qty } of splits) {
    if (field === "accepted") {
      await tx
        .update(inventoryStockTransferAllocations)
        .set({
          accepted_qty: sql`${inventoryStockTransferAllocations.accepted_qty} + ${String(qty)}`,
        })
        .where(
          and(
            eq(inventoryStockTransferAllocations.iq_tenant_id, tenantId),
            eq(inventoryStockTransferAllocations.id, allocation.allocationId),
          ),
        );
      allocation.acceptedQty += qty;
      continue;
    }

    await tx
      .update(inventoryStockTransferAllocations)
      .set({
        returned_qty: sql`${inventoryStockTransferAllocations.returned_qty} + ${String(qty)}`,
      })
      .where(
        and(
          eq(inventoryStockTransferAllocations.iq_tenant_id, tenantId),
          eq(inventoryStockTransferAllocations.id, allocation.allocationId),
        ),
      );
    allocation.returnedQty += qty;
  }
}

export async function creditAcceptedFromAllocations(
  tx: StockTx,
  params: {
    tenantId: string;
    destStoreId: string;
    itemId: string;
    transferDate: string;
    allocations: StockAllocation[];
    acceptedQty: number;
  },
): Promise<void> {
  const splits = splitQtyAcrossAllocations(params.allocations, params.acceptedQty);
  for (const { allocation, qty } of splits) {
    let destLotId: string | null = null;
    if (allocation.lotId) {
      destLotId = await resolveDestinationLot(
        tx,
        params.tenantId,
        allocation.lotId,
        params.destStoreId,
        params.itemId,
        params.transferDate,
      );
    }
    await creditStockToStore(tx, {
      tenantId: params.tenantId,
      storeId: params.destStoreId,
      itemId: params.itemId,
      qty,
      lotId: destLotId,
    });
  }
  await recordAllocationConsumption(tx, params.tenantId, splits, "accepted");
}

export async function returnRejectedFromAllocations(
  tx: StockTx,
  tenantId: string,
  allocations: StockAllocation[],
  rejectedQty: number,
): Promise<void> {
  const splits = splitQtyAcrossAllocations(allocations, rejectedQty, true);
  for (const { allocation, qty } of splits) {
    await returnStockToSource(tx, tenantId, allocation.sourceStockId, qty);
  }
  await recordAllocationConsumption(tx, tenantId, splits, "returned");
}

/** Returns in-transit / unsettled quantity back to the source store on cancel. */
export async function returnUnsettledFromAllocations(
  tx: StockTx,
  tenantId: string,
  allocations: StockAllocation[],
  unsettledQty: number,
): Promise<void> {
  await returnRejectedFromAllocations(tx, tenantId, allocations, unsettledQty);
}
