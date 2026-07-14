import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";
import {
  InventoryValidationError,
  ItemNotFoundError,
  StoreNotFoundError,
  StoreValidationError,
} from "../errors.js";

export type AdjustStockDeps = {
  stockRepo: DrizzleInventoryStockRepository;
  storeRepo: StoreRepo;
};

export type AdjustStockInput = {
  stock_id: string;
  delta: number;
  reason: string;
  created_by?: string | null;
};

async function assertActiveStore(deps: AdjustStockDeps, tenantId: string, storeId: string) {
  const store = await deps.storeRepo.findById(tenantId, storeId);
  if (!store) throw new StoreNotFoundError();
  if (!store.is_active) throw new StoreValidationError("Store must be active");
}

export async function adjustStock(
  deps: AdjustStockDeps,
  tenantId: string,
  input: AdjustStockInput,
) {
  const reason = input.reason?.trim() ?? "";
  if (!reason) {
    throw new InventoryValidationError("Reason is required");
  }
  if (!Number.isFinite(input.delta) || input.delta === 0) {
    throw new InventoryValidationError("Adjustment quantity must be a non-zero number");
  }
  if (reason.length > 500) {
    throw new InventoryValidationError("Reason must be at most 500 characters");
  }

  const stockRow = await deps.stockRepo.findStockRow(tenantId, input.stock_id);
  if (!stockRow) {
    throw new ItemNotFoundError();
  }

  await assertActiveStore(deps, tenantId, stockRow.inventory_store_id);

  try {
    const result = await deps.stockRepo.adjustStockQuantity(tenantId, {
      stockId: input.stock_id,
      delta: input.delta,
      reason,
      createdBy: input.created_by ?? null,
    });
    return {
      data: {
        stock_id: input.stock_id,
        item_id: result.item_id,
        inventory_store_id: result.inventory_store_id,
        quantity_after: result.quantity_after,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NEGATIVE_STOCK") {
        throw new InventoryValidationError("Adjustment would result in negative stock");
      }
      if (error.message === "INVALID_DELTA") {
        throw new InventoryValidationError("Adjustment quantity must be a non-zero number");
      }
      if (error.message === "REASON_REQUIRED") {
        throw new InventoryValidationError("Reason is required");
      }
    }
    throw error;
  }
}
