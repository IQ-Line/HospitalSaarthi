import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { ApproveIndentLineInput } from "../domain/indent.types.js";
import { IndentNotFoundError, IndentValidationError } from "../errors.js";
import { getIndent } from "./get-indent.js";

export type ApproveIndentDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function approveIndent(
  deps: ApproveIndentDeps,
  tenantId: string,
  indentId: string,
  lines: ApproveIndentLineInput[],
  actorId: string | null,
) {
  if (!actorId) {
    throw new IndentValidationError("User context is required to approve indent");
  }
  if (!lines.length) {
    throw new IndentValidationError("Approval lines are required");
  }

  const row = await deps.indentRepo.approve(tenantId, indentId, lines, actorId);
  if (!row) throw new IndentNotFoundError();
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
}

export async function rejectIndent(
  deps: ApproveIndentDeps,
  tenantId: string,
  indentId: string,
  reason: string,
) {
  const row = await deps.indentRepo.reject(tenantId, indentId, reason);
  if (!row) throw new IndentNotFoundError();
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
}
