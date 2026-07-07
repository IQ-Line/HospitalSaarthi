import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import { IndentNotFoundError, IndentValidationError } from "../errors.js";

export type CancelIndentDraftDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function cancelIndentDraft(
  deps: CancelIndentDraftDeps,
  tenantId: string,
  indentId: string,
): Promise<{ id: string }> {
  const cancelled = await deps.indentRepo.cancelDraft(tenantId, indentId);
  if (!cancelled) {
    const existing = await deps.indentRepo.findById(tenantId, indentId);
    if (!existing) throw new IndentNotFoundError();
    throw new IndentValidationError("Only draft indents can be cancelled");
  }
  return { id: indentId };
}
