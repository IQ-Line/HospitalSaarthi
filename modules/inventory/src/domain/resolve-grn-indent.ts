import type { IndentRepo } from "../ports.js";
import { GrnValidationError } from "../errors.js";
import { assertIndentLinkableForGrn } from "./grn-indent.validation.js";

export async function resolveGrnIndentId(
  indentRepo: IndentRepo,
  tenantId: string,
  indentNumber: string | null | undefined,
  existingGrnId?: string,
): Promise<string | null> {
  const normalized = indentNumber?.trim();
  if (!normalized) return null;

  const indent = await indentRepo.findByNumber(tenantId, normalized);
  if (!indent) {
    throw new GrnValidationError(`No indent found with number ${normalized}.`);
  }

  assertIndentLinkableForGrn(indent, existingGrnId);
  return indent.id;
}
