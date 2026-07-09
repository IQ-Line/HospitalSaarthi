import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import { IndentNotFoundError } from "../errors.js";
import { getIndent } from "./get-indent.js";

export type GetIndentByNumberDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function getIndentByNumber(
  deps: GetIndentByNumberDeps,
  tenantId: string,
  indentNumber: string,
) {
  const normalized = indentNumber.trim();
  if (!normalized) throw new IndentNotFoundError();

  const row = await deps.indentRepo.findByNumber(tenantId, normalized);
  if (!row) throw new IndentNotFoundError();

  return getIndent({ indentRepo: deps.indentRepo }, tenantId, row.id);
}
