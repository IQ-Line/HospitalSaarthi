import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import { IndentNotFoundError } from "../errors.js";
import { attachIndentStoreRefs, wireIndent } from "./list-indents.js";

export type GetIndentDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function getIndent(deps: GetIndentDeps, tenantId: string, indentId: string) {
  const row = await deps.indentRepo.findById(tenantId, indentId);
  if (!row) throw new IndentNotFoundError();

  const storeIds = [row.from_store_id, row.to_store_id].filter((id): id is string => Boolean(id));
  const storeRows = await deps.indentRepo.findStoresByIds(tenantId, storeIds);
  const storeMap = new Map(storeRows.map((store) => [store.id, store]));

  const lines = await deps.indentRepo.listLinesWithItems(tenantId, indentId);
  const wired = attachIndentStoreRefs(wireIndent(row)!, row, storeMap);

  return {
    ...wired,
    lines: lines.map((line) => ({
      id: line.id,
      tenant_id: line.iq_tenant_id,
      indent_id: line.indent_id,
      item_id: line.item_id,
      requested_qty: Number(line.requested_qty),
      approved_qty: line.approved_qty != null ? Number(line.approved_qty) : null,
      line_remarks: line.line_remarks,
      preferred_lot_id: line.preferred_lot_id,
      sort_order: line.sort_order,
      created_at: line.created_at.toISOString(),
      item: line.item,
    })),
  };
}
