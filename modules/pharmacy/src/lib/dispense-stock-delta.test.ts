import { describe, expect, it } from "vitest";
import { computeDispenseStockIssueDeltas } from "./dispense-stock-delta.js";

describe("computeDispenseStockIssueDeltas", () => {
  it("returns full qty on first issue", () => {
    expect(
      computeDispenseStockIssueDeltas(
        [],
        [{ inventory_item_id: "item-1", quantity_dispensed: "5" }],
      ),
    ).toEqual([{ item_id: "item-1", quantity: 5 }]);
  });

  it("returns only positive delta on partial re-save", () => {
    expect(
      computeDispenseStockIssueDeltas(
        [{ inventory_item_id: "item-1", quantity_dispensed: "3" }],
        [{ inventory_item_id: "item-1", quantity_dispensed: "5" }],
      ),
    ).toEqual([{ item_id: "item-1", quantity: 2 }]);
  });

  it("returns empty when qty unchanged", () => {
    expect(
      computeDispenseStockIssueDeltas(
        [{ inventory_item_id: "item-1", quantity_dispensed: "5" }],
        [{ inventory_item_id: "item-1", quantity_dispensed: "5" }],
      ),
    ).toEqual([]);
  });

  it("aggregates duplicate item lines", () => {
    expect(
      computeDispenseStockIssueDeltas(
        [{ inventory_item_id: "item-1", quantity_dispensed: "1" }],
        [
          { inventory_item_id: "item-1", quantity_dispensed: "2" },
          { inventory_item_id: "item-1", quantity_dispensed: "3" },
        ],
      ),
    ).toEqual([{ item_id: "item-1", quantity: 4 }]);
  });

  it("ignores lines without inventory_item_id", () => {
    expect(
      computeDispenseStockIssueDeltas(
        [],
        [{ inventory_item_id: null, quantity_dispensed: "5" }],
      ),
    ).toEqual([]);
  });
});
