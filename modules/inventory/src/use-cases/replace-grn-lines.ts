import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import { GrnNotFoundError, GrnValidationError } from "../errors.js";
import type { CreateGrnLineInput } from "../domain/grn.types.js";
import { validateReplaceGrnLines } from "./validate-grn-input.js";

export type ReplaceGrnLinesDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
  itemRepo: DrizzleInventoryItemRepository;
};

export async function replaceGrnLines(
  deps: ReplaceGrnLinesDeps,
  tenantId: string,
  grnId: string,
  lines: CreateGrnLineInput[],
) {
  const existing = await deps.grnRepo.findById(tenantId, grnId);
  if (!existing) throw new GrnNotFoundError();
  if (existing.status !== "draft") {
    throw new GrnValidationError("Only draft GRNs can be edited");
  }

  await validateReplaceGrnLines({ itemRepo: deps.itemRepo }, tenantId, lines);

  await deps.grnRepo.replaceLines(tenantId, grnId, lines);
  return { ok: true };
}
