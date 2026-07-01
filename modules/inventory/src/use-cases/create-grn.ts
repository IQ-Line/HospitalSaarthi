import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import type { StoreRepo } from "../ports.js";
import { GrnNotFoundError, GrnValidationError } from "../errors.js";
import type { CreateGrnInput } from "../domain/grn.types.js";
import { wireGrn } from "./list-grns.js";
import { validateCreateGrnInput } from "./validate-grn-input.js";

export type CreateGrnDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
  storeRepo: StoreRepo;
  itemRepo: DrizzleInventoryItemRepository;
};

export async function createGrn(
  deps: CreateGrnDeps,
  tenantId: string,
  input: CreateGrnInput,
  actorId: string | null,
) {
  const store = await deps.storeRepo.findById(tenantId, input.store_id);
  if (!store?.is_active) {
    throw new GrnValidationError("Store must be active");
  }

  await validateCreateGrnInput({ itemRepo: deps.itemRepo }, tenantId, input);

  const row = await deps.grnRepo.create(tenantId, input, actorId);
  const wired = wireGrn(row);
  if (!wired) throw new GrnNotFoundError();
  return wired;
}
