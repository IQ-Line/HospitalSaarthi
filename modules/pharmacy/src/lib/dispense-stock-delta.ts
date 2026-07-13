export type DispenseStockQtyLine = {
  inventory_item_id?: string | null;
  quantity_dispensed: string;
};

/**
 * Positive qty deltas by inventory item id (next − previous).
 * Used so partial re-saves only deduct newly issued quantity.
 */
export function computeDispenseStockIssueDeltas(
  previousLines: readonly DispenseStockQtyLine[],
  nextLines: readonly DispenseStockQtyLine[],
): Array<{ item_id: string; quantity: number }> {
  const previousByItem = aggregateQtyByInventoryItem(previousLines);
  const nextByItem = aggregateQtyByInventoryItem(nextLines);
  const deltas: Array<{ item_id: string; quantity: number }> = [];

  for (const [itemId, nextQty] of nextByItem) {
    const prevQty = previousByItem.get(itemId) ?? 0;
    const delta = nextQty - prevQty;
    if (delta > 0) {
      deltas.push({ item_id: itemId, quantity: delta });
    }
  }

  return deltas;
}

function aggregateQtyByInventoryItem(
  lines: readonly DispenseStockQtyLine[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const itemId = line.inventory_item_id?.trim();
    if (!itemId) continue;
    const qty = Number(line.quantity_dispensed);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    totals.set(itemId, (totals.get(itemId) ?? 0) + qty);
  }
  return totals;
}
