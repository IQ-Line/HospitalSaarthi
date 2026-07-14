import { describe, expect, it, vi } from "vitest";
import { InventoryDispenseStockError } from "../lib/http-inventory-gateway.js";
import {
  DispenseInsufficientStockError,
  DispenseValidationError,
} from "./save-dispense-for-visit.js";
import { issueManualDispenseStock } from "./issue-manual-dispense-stock.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const STORE = "33333333-3333-4333-8333-333333333333";
const ITEM = "22222222-2222-4222-8222-222222222222";

describe("issueManualDispenseStock", () => {
  it("deducts aggregated qty via inventory gateway", async () => {
    const inventoryGateway = {
      issueDispenseStock: vi.fn(async () => undefined),
    };

    const result = await issueManualDispenseStock(
      { inventoryGateway },
      TENANT,
      {
        inventory_store_id: STORE,
        lines: [
          { inventory_item_id: ITEM, quantity: "2" },
          { inventory_item_id: ITEM, quantity: "3" },
        ],
      },
    );

    expect(result).toEqual({ inventory_store_id: STORE, line_count: 1 });
    expect(inventoryGateway.issueDispenseStock).toHaveBeenCalledWith(TENANT, {
      store_id: STORE,
      lines: [{ item_id: ITEM, quantity: 5 }],
    });
  });

  it("maps inventory stock conflicts to DispenseInsufficientStockError", async () => {
    const inventoryGateway = {
      issueDispenseStock: vi.fn(async () => {
        throw new InventoryDispenseStockError("Insufficient stock", 409);
      }),
    };

    await expect(
      issueManualDispenseStock(
        { inventoryGateway },
        TENANT,
        {
          inventory_store_id: STORE,
          lines: [{ inventory_item_id: ITEM, quantity: 1 }],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseInsufficientStockError);
  });

  it("rejects missing store id", async () => {
    await expect(
      issueManualDispenseStock(
        { inventoryGateway: { issueDispenseStock: vi.fn() } },
        TENANT,
        { inventory_store_id: "", lines: [{ inventory_item_id: ITEM, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(DispenseValidationError);
  });
});
