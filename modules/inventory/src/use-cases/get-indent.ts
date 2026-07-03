import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import { IndentNotFoundError } from "../errors.js";
import { wireIndent } from "./list-indents.js";

export type GetIndentDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function getIndent(deps: GetIndentDeps, tenantId: string, indentId: string) {
  const row = await deps.indentRepo.findById(tenantId, indentId);
  if (!row) throw new IndentNotFoundError();

  const stores = await deps.indentRepo.findStoresWithIndentMeta(tenantId, [
    row.from_store_id,
    row.to_store_id,
  ]);
  const storeMap = new Map(stores.map((store) => [store.id, store]));

  const lines = await deps.indentRepo.listLinesWithItems(tenantId, indentId);
  const wired = wireIndent(row)!;

  return {
    ...wired,
    from_store: storeMap.get(row.from_store_id)
      ? {
          store_id: storeMap.get(row.from_store_id)!.id,
          store_code: storeMap.get(row.from_store_id)!.store_code,
          store_name: storeMap.get(row.from_store_id)!.store_name,
        }
      : null,
    to_store: storeMap.get(row.to_store_id)
      ? {
          store_id: storeMap.get(row.to_store_id)!.id,
          store_code: storeMap.get(row.to_store_id)!.store_code,
          store_name: storeMap.get(row.to_store_id)!.store_name,
        }
      : null,
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
