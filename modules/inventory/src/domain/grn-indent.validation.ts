import type { IndentRow } from "./indent.types.js";
import { GrnValidationError } from "../errors.js";

const GRN_LINKABLE_INDENT_STATUSES = new Set<IndentRow["status"]>([
  "submitted",
  "approved",
  "partially_approved",
  "in_fulfillment",
]);

/** A GRN may optionally reference a procurement indent by number. */
export function assertIndentLinkableForGrn(
  indent: IndentRow,
  existingGrnId?: string,
): void {
  if (indent.fulfillment_route !== "procurement") {
    throw new GrnValidationError("GRN can only be linked to a procurement (PR) indent.");
  }
  if (!GRN_LINKABLE_INDENT_STATUSES.has(indent.status)) {
    throw new GrnValidationError("Indent is not in a state that allows GRN.");
  }
  if (indent.inventory_grn_id && indent.inventory_grn_id !== existingGrnId) {
    throw new GrnValidationError("Indent is already linked to another GRN.");
  }
}
