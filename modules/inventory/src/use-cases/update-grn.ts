import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { StoreRepo, IndentRepo } from "../ports.js";
import { GrnNotFoundError, GrnValidationError } from "../errors.js";
import type { UpdateGrnInput } from "../domain/grn.types.js";
import { assertGrnDateNotFuture } from "../domain/grn.validation.js";
import { resolveGrnIndentId } from "../domain/resolve-grn-indent.js";
import { wireGrn } from "./list-grns.js";

export type UpdateGrnDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
  storeRepo: StoreRepo;
  indentRepo: IndentRepo;
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

  const grnDate = input.grn_date ?? existing.grn_date;

  assertGrnDateNotFuture(grnDate);

  let patch: UpdateGrnInput = { ...input };
  if (input.indent_number !== undefined) {
    patch = {
      ...patch,
      inventory_indent_id: await resolveGrnIndentId(
        deps.indentRepo,
        tenantId,
        input.indent_number,
        grnId,
      ),
    };
  }

  const row = await deps.grnRepo.updateDraft(tenantId, grnId, patch);
  if (!row) throw new GrnNotFoundError();
  return wireGrn(row)!;
}
