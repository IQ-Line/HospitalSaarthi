import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { IndentRow } from "../domain/indent.types.js";

export type IndentStoreRef = {
  store_id: string;
  store_code: string;
  store_name: string;
};

type StoreLabelRow = { id: string; store_code: string; store_name: string };

export function indentStoreRef(store: StoreLabelRow | undefined): IndentStoreRef | null {
  if (!store) return null;
  return {
    store_id: store.id,
    store_code: store.store_code,
    store_name: store.store_name,
  };
}

export function attachIndentStoreRefs<T extends ReturnType<typeof wireIndent>>(
  wired: T,
  row: Pick<IndentRow, "from_store_id" | "to_store_id">,
  storeMap: Map<string, StoreLabelRow>,
) {
  return {
    ...wired,
    from_store: indentStoreRef(storeMap.get(row.from_store_id)),
    to_store: row.to_store_id ? indentStoreRef(storeMap.get(row.to_store_id)) : null,
  };
}

export function wireIndent(row: IndentRow | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    tenant_id: row.iq_tenant_id,
    indent_number: row.indent_number,
    indent_date: row.indent_date,
    from_store_id: row.from_store_id,
    to_store_id: row.to_store_id,
    indent_type: row.indent_type,
    priority: row.priority,
    remarks: row.remarks,
    status: row.status,
    fulfillment_route: row.fulfillment_route,
    purchase_indent_number: row.purchase_indent_number,
    rejection_reason: row.rejection_reason,
    approval_remarks: row.approval_remarks,
    inventory_stock_transfer_id: row.inventory_stock_transfer_id,
    inventory_purchase_request_id: row.inventory_purchase_request_id,
    inventory_grn_id: row.inventory_grn_id,
    created_by: row.created_by,
    submitted_at: row.submitted_at?.toISOString() ?? null,
    approved_at: row.approved_at?.toISOString() ?? null,
    approved_by: row.approved_by,
    fulfilled_at: row.fulfilled_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export type ListIndentsDeps = {
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function listIndents(
  deps: ListIndentsDeps,
  tenantId: string,
  query: Parameters<DrizzleInventoryIndentRepository["list"]>[1],
) {
  const result = await deps.indentRepo.list(tenantId, query);
  const storeIds = [
    ...new Set(
      result.rows.flatMap((row) => [row.from_store_id, row.to_store_id].filter((id): id is string => Boolean(id))),
    ),
  ];
  const storeRows = await deps.indentRepo.findStoresByIds(tenantId, storeIds);
  const storeMap = new Map(storeRows.map((store) => [store.id, store]));

  const items = await Promise.all(
    result.rows.map(async (row) => {
      const wired = attachIndentStoreRefs(wireIndent(row)!, row, storeMap);
      if (!query.include_lines) return wired;
      const lines = await deps.indentRepo.listLinesWithItems(tenantId, row.id);
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
    }),
  );

  return { items, total: result.total };
}
