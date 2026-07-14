import { DispenseInsufficientStockError, DispenseValidationError } from "./save-dispense-for-visit.js";
import { InventoryDispenseStockError } from "../lib/http-inventory-gateway.js";
import type { InventoryGatewayPort } from "../ports.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ManualDispenseStockLine = {
  inventory_item_id: string;
  quantity: string | number;
};

export type IssueManualDispenseStockInput = {
  inventory_store_id: string;
  lines: ManualDispenseStockLine[];
};

/**
 * Counter / walk-in stock issue — deduct FEFO qty at the selected store.
 * Does not persist a pharmacy bill (walk-in order persistence is separate).
 */
export async function issueManualDispenseStock(
  deps: { inventoryGateway: InventoryGatewayPort },
  tenantId: string,
  input: IssueManualDispenseStockInput,
): Promise<{ inventory_store_id: string; line_count: number }> {
  const storeId = input.inventory_store_id?.trim();
  if (!storeId || !UUID_RE.test(storeId)) {
    throw new DispenseValidationError("inventory_store_id must be a valid UUID");
  }

  if (!input.lines?.length) {
    throw new DispenseValidationError("lines must contain at least one item");
  }

  const qtyByItem = new Map<string, number>();
  input.lines.forEach((line, index) => {
    const itemId = line.inventory_item_id?.trim();
    if (!itemId || !UUID_RE.test(itemId)) {
      throw new DispenseValidationError(`lines[${index}].inventory_item_id must be a valid UUID`);
    }
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new DispenseValidationError(`lines[${index}].quantity must be greater than zero`);
    }
    qtyByItem.set(itemId, (qtyByItem.get(itemId) ?? 0) + qty);
  });

  const deductLines = [...qtyByItem.entries()].map(([item_id, quantity]) => ({
    item_id,
    quantity,
  }));

  try {
    await deps.inventoryGateway.issueDispenseStock(tenantId, {
      store_id: storeId,
      lines: deductLines,
    });
  } catch (error) {
    if (error instanceof InventoryDispenseStockError) {
      throw new DispenseInsufficientStockError(error.message);
    }
    throw error;
  }

  return { inventory_store_id: storeId, line_count: deductLines.length };
}
