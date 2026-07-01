import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import type { ListGrnsQuery } from "../domain/grn.types.js";

export type ListGrnsDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
};

export function wireGrn(row: Awaited<ReturnType<DrizzleInventoryGrnRepository["findById"]>>) {
  if (!row) return null;
  return {
    id: row.id,
    grn_number: row.grn_number,
    status: row.status,
    grn_type: row.grn_type,
    grn_date: row.grn_date,
    store_id: row.inventory_store_id,
    manufacturer_id: row.manufacturer_id,
    purchase_request_id: row.purchase_request_id,
    voucher_invoice_no: row.voucher_invoice_no,
    register_page_no: row.register_page_no,
    remarks: row.remarks,
    submitted_at: row.submitted_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listGrns(deps: ListGrnsDeps, tenantId: string, query: ListGrnsQuery) {
  const result = await deps.grnRepo.list(tenantId, query);
  return {
    data: result.rows.map((row) => ({
      id: row.id,
      grn_number: row.grn_number,
      status: row.status,
      grn_type: row.grn_type,
      grn_date: row.grn_date,
      voucher_invoice_no: row.voucher_invoice_no || null,
      submitted_at: row.submitted_at?.toISOString() ?? null,
    })),
    total: result.total,
    summary: result.summary,
  };
}
