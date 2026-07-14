import { describe, expect, it, vi } from "vitest";
import { TransferValidationError } from "../errors.js";
import { issueDispenseStock } from "./issue-dispense-stock.js";

describe("issueDispenseStock", () => {
  it("rejects missing store_id", async () => {
    await expect(
      issueDispenseStock(
        { db: { transaction: vi.fn() } as never, storeRepo: { findById: vi.fn() } as never },
        "tenant-1",
        { store_id: "", lines: [{ item_id: "item-1", quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(TransferValidationError);
  });

  it("returns empty deductions when no positive quantities", async () => {
    const storeRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "store-1",
        is_active: true,
        can_dispense: true,
      }),
    };
    const db = { transaction: vi.fn() };

    const result = await issueDispenseStock(
      { db: db as never, storeRepo: storeRepo as never },
      "tenant-1",
      { store_id: "store-1", lines: [{ item_id: "item-1", quantity: 0 }] },
    );

    expect(result.deductions).toEqual([]);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects stores that cannot dispense", async () => {
    const storeRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "store-1",
        is_active: true,
        can_dispense: false,
      }),
    };

    await expect(
      issueDispenseStock(
        { db: { transaction: vi.fn() } as never, storeRepo: storeRepo as never },
        "tenant-1",
        { store_id: "store-1", lines: [{ item_id: "item-1", quantity: 2 }] },
      ),
    ).rejects.toThrow(/not configured for dispensing/i);
  });
});
