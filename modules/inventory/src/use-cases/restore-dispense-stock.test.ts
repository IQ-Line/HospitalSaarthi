import { describe, expect, it, vi } from "vitest";
import { TransferValidationError } from "../errors.js";
import { restoreDispenseStock } from "./restore-dispense-stock.js";

describe("restoreDispenseStock", () => {
  it("rejects missing store_id", async () => {
    await expect(
      restoreDispenseStock(
        { db: { transaction: vi.fn() } as never, storeRepo: { findById: vi.fn() } as never },
        "tenant-1",
        { store_id: "", lines: [{ item_id: "item-1", quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(TransferValidationError);
  });

  it("returns empty restorations when no positive quantities", async () => {
    const storeRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "store-1",
        is_active: true,
        can_dispense: true,
      }),
    };
    const db = { transaction: vi.fn() };

    const result = await restoreDispenseStock(
      { db: db as never, storeRepo: storeRepo as never },
      "tenant-1",
      { store_id: "store-1", lines: [{ item_id: "item-1", quantity: 0 }] },
    );

    expect(result.restorations).toEqual([]);
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
      restoreDispenseStock(
        { db: { transaction: vi.fn() } as never, storeRepo: storeRepo as never },
        "tenant-1",
        { store_id: "store-1", lines: [{ item_id: "item-1", quantity: 2 }] },
      ),
    ).rejects.toThrow(/not configured for dispensing/i);
  });

  it("restores by lot when lot_id is provided and without lot when omitted", async () => {
    const storeRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "store-1",
        is_active: true,
        can_dispense: true,
      }),
    };

    const selectQueue: unknown[][] = [
      // creditStockToStore for lot-1
      [{ id: "stock-lot", quantity: "1" }],
      // restoreWithoutBatch for item-2
      [{ id: "stock-unlotted", quantity: "3" }],
    ];

    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            const next = selectQueue.shift() ?? [];
            return {
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => next),
              })),
              limit: vi.fn(async () => next),
            };
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => undefined),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: "stock-created" }]),
        })),
      })),
    };

    const db = {
      transaction: vi.fn(async (fn: (inner: typeof tx) => Promise<void>) => {
        await fn(tx);
      }),
    };

    const result = await restoreDispenseStock(
      { db: db as never, storeRepo: storeRepo as never },
      "tenant-1",
      {
        store_id: "store-1",
        lines: [
          { item_id: "item-1", quantity: 2, lot_id: "lot-1" },
          { item_id: "item-2", quantity: 4 },
        ],
      },
    );

    expect(result.restorations).toEqual([
      { item_id: "item-1", quantity: 2, stock_id: "stock-lot", lot_id: "lot-1" },
      { item_id: "item-2", quantity: 4, stock_id: "stock-unlotted", lot_id: null },
    ]);
    expect(db.transaction).toHaveBeenCalledOnce();
  });
});
