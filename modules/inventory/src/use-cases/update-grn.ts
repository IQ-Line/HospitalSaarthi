import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { StoreRepo } from "../ports.js";
import { GrnNotFoundError, GrnValidationError } from "../errors.js";
import type { UpdateGrnInput } from "../domain/grn.types.js";
import { assertGrnDateNotFuture, assertPurchaseManufacturer } from "../domain/grn.validation.js";
import { wireGrn } from "./list-grns.js";

export type UpdateGrnDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
  storeRepo: StoreRepo;
};

export async function updateGrn(
  deps: UpdateGrnDeps,
  tenantId: string,
  grnId: string,
  input: UpdateGrnInput,
) {
  const existing = await deps.grnRepo.findById(tenantId, grnId);
  if (!existing) throw new GrnNotFoundError();
  if (existing.status !== "draft") {
    throw new GrnValidationError("Only draft GRNs can be edited");
  }

  if (input.store_id) {
    const store = await deps.storeRepo.findById(tenantId, input.store_id);
    if (!store?.is_active) {
      throw new GrnValidationError("Store must be active");
    }
  }

  const grnType = input.grn_type ?? existing.grn_type;
  const grnDate = input.grn_date ?? existing.grn_date;
  const manufacturerId =
    input.manufacturer_id !== undefined ? input.manufacturer_id : existing.manufacturer_id;

  assertGrnDateNotFuture(grnDate);
  assertPurchaseManufacturer(grnType, manufacturerId);

  const row = await deps.grnRepo.updateDraft(tenantId, grnId, input);
  if (!row) throw new GrnNotFoundError();
  return wireGrn(row)!;
}
