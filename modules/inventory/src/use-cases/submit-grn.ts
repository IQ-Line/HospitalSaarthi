import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import type { IndentRepo } from "../ports.js";
import { GrnNotFoundError, GrnValidationError } from "../errors.js";
import { assertIndentLinkedForSubmit, assertPurchaseHeader } from "../domain/grn.validation.js";
import { wireGrn } from "./list-grns.js";
import { validateGrnLinesAgainstItems } from "./validate-grn-input.js";

export type SubmitGrnDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
  itemRepo: DrizzleInventoryItemRepository;
  indentRepo: IndentRepo;
};

export async function submitGrn(
  deps: SubmitGrnDeps,
  tenantId: string,
  grnId: string,
  actorId: string | null,
) {
  if (!actorId) {
    throw new GrnValidationError("User context is required to submit GRN");
  }

  const existing = await deps.grnRepo.findById(tenantId, grnId);
  if (!existing) throw new GrnNotFoundError();
  if (existing.status !== "draft") {
    throw new GrnValidationError("GRN is already submitted");
  }

  const lines = await deps.grnRepo.listLines(tenantId, grnId);
  if (lines.length === 0) {
    throw new GrnValidationError("Add at least one line before submitting");
  }

  assertIndentLinkedForSubmit(existing.inventory_indent_id);
  assertPurchaseHeader(existing.grn_type, existing.manufacturer_id, existing.voucher_invoice_no);

  await validateGrnLinesAgainstItems(
    { itemRepo: deps.itemRepo },
    tenantId,
    lines.map((line) => ({
      item_id: line.item_id,
      grn_qty: Number(line.grn_qty),
      base_uom: line.base_uom,
      purchase_rate: Number(line.purchase_rate),
      lot_number: line.lot_number,
      expiry_date: line.expiry_date,
      storage_location: line.storage_location,
      line_remarks: line.line_remarks,
      requested_qty:
        line.requested_qty != null && line.requested_qty !== ""
          ? Number(line.requested_qty)
          : null,
    })),
  );

  const row = await deps.grnRepo.submit(tenantId, grnId, actorId);
  if (!row) throw new GrnNotFoundError();

  if (row.inventory_indent_id) {
    await deps.indentRepo.linkGrn(tenantId, row.inventory_indent_id, row.id);
  }

  return wireGrn(row)!;
}
