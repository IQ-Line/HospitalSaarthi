import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import { IndentNotFoundError, IndentValidationError } from "../errors.js";
import { assertProcurementReference } from "../domain/indent.validation.js";
import { getIndent } from "./get-indent.js";

export type SubmitIndentDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function submitIndent(deps: SubmitIndentDeps, tenantId: string, indentId: string) {
  const existing = await deps.indentRepo.findById(tenantId, indentId);
  if (!existing) throw new IndentNotFoundError();

  try {
    assertProcurementReference(existing.fulfillment_route, existing.purchase_indent_number);
  } catch (error) {
    throw new IndentValidationError(error instanceof Error ? error.message : "Invalid indent");
  }

  const row = await deps.indentRepo.submit(tenantId, indentId);
  if (!row) throw new IndentNotFoundError();
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
}
