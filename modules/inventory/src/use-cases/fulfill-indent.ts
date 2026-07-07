import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import { IndentNotFoundError, IndentValidationError } from "../errors.js";
import { getIndent } from "./get-indent.js";

export type FulfillIndentDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
  grnRepo: DrizzleInventoryGrnRepository;
  itemRepo: DrizzleInventoryItemRepository;
};

export async function fulfillIndent(
  deps: FulfillIndentDeps,
  tenantId: string,
  indentId: string,
  actorId: string | null,
) {
  const existing = await deps.indentRepo.findById(tenantId, indentId);
  if (!existing) throw new IndentNotFoundError();

  if (existing.fulfillment_route === "stock_transfer") {
    const row = await deps.indentRepo.fulfillStockTransfer(tenantId, indentId);
    if (!row) throw new IndentNotFoundError();
    return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
  }

  if (!existing.purchase_indent_number?.trim()) {
    throw new IndentValidationError("Purchase indent number is required for procurement fulfillment");
  }

  const lines = await deps.indentRepo.listLinesWithItems(tenantId, indentId);
  const approvedLines = lines.filter((line) => Number(line.approved_qty ?? 0) > 0);
  if (approvedLines.length === 0) {
    throw new IndentValidationError("No approved lines to fulfill");
  }

  const grn = await deps.grnRepo.create(
    tenantId,
    {
      grn_type: "purchase",
      grn_date: existing.indent_date,
      store_id: existing.to_store_id ?? existing.from_store_id,
      voucher_invoice_no: existing.purchase_indent_number ?? "",
      remarks: `From indent ${existing.indent_number}`,
      lines: await Promise.all(
        approvedLines.map(async (line, index) => {
          const item = line.item ?? (await deps.itemRepo.findById(tenantId, line.item_id));
          return {
            item_id: line.item_id,
            grn_qty: 0,
            base_uom: item?.unit_of_measure ?? "unit",
            purchase_rate: 0,
            line_remarks: line.line_remarks,
            requested_qty: Number(line.approved_qty),
            sort_order: index,
          };
        }),
      ),
    },
    actorId,
  );

  const row = await deps.indentRepo.linkProcurementFulfillment(tenantId, indentId, grn.id);
  if (!row) throw new IndentNotFoundError();
  return getIndent({ indentRepo: deps.indentRepo }, tenantId, indentId);
}
