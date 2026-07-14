import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import { InventoryValidationError, ItemNotFoundError } from "../errors.js";

export type UpdateItemReorderDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export type UpdateItemReorderInput = {
  reorder_point: number;
};

export async function updateItemReorderPoint(
  deps: UpdateItemReorderDeps,
  tenantId: string,
  itemId: string,
  input: UpdateItemReorderInput,
) {
  if (!Number.isFinite(input.reorder_point) || input.reorder_point < 0) {
    throw new InventoryValidationError("Reorder point must be a non-negative number");
  }

  const existing = await deps.itemRepo.findById(tenantId, itemId);
  if (!existing) {
    throw new ItemNotFoundError();
  }

  const row = await deps.itemRepo.updateReorderPoint(tenantId, itemId, input.reorder_point);
  if (!row) {
    throw new ItemNotFoundError();
  }

  return {
    data: {
      id: row.id,
      reorder_point: Number(row.reorder_point),
    },
  };
}
