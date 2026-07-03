import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { IndentRepo } from "../ports.js";
import { GrnNotFoundError } from "../errors.js";
import { wireGrn } from "./list-grns.js";

export type GetGrnDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
  indentRepo: IndentRepo;
};

export async function getGrn(deps: GetGrnDeps, tenantId: string, grnId: string) {
  const row = await deps.grnRepo.findById(tenantId, grnId);
  if (!row) throw new GrnNotFoundError();

  const indent = row.inventory_indent_id
    ? await deps.indentRepo.findById(tenantId, row.inventory_indent_id)
    : undefined;

  const lines = await deps.grnRepo.listLinesWithItems(tenantId, grnId);
  return {
    ...wireGrn(row)!,
    indent_number: indent?.indent_number ?? null,
    lines: lines.map((line) => ({
      id: line.id,
      item_id: line.item_id,
      grn_qty: Number(line.grn_qty),
      base_uom: line.base_uom,
      purchase_uom: line.purchase_uom,
      purchase_rate: Number(line.purchase_rate),
      requested_qty:
        line.requested_qty != null && line.requested_qty !== ""
          ? Number(line.requested_qty)
          : null,
      lot_number: line.lot_number,
      expiry_date: line.expiry_date,
      storage_location: line.storage_location,
      line_remarks: line.line_remarks,
      sort_order: line.sort_order,
      item: line.item,
    })),
  };
}
