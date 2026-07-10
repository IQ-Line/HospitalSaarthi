import {
  findUomMasterOption,
  type UomMasterOption,
} from '@/features/inventory-masters/api/uom-lookup';
import { EMPTY_GRN_LINE } from '../mock/fixtures';
import type { InventoryGrnLineDraft, InventoryIndentRow, InventoryItemOption } from '../types';

const GRN_LINKABLE_STATUSES = new Set<InventoryIndentRow['status']>([
  'submitted',
  'approved',
  'partially_approved',
  'in_fulfillment',
]);

export type GrnIndentPrefillResult =
  | { ok: true; indent: InventoryIndentRow }
  | { ok: false; message: string };

export function validateIndentForGrnPrefill(
  indent: InventoryIndentRow,
  existingGrnId?: string | null,
): GrnIndentPrefillResult {
  if (indent.route !== 'procurement') {
    return { ok: false, message: 'GRN can only be linked to a procurement (PR) indent.' };
  }
  if (!GRN_LINKABLE_STATUSES.has(indent.status)) {
    return { ok: false, message: 'Indent is not in a state that allows GRN.' };
  }
  if (indent.inventory_grn_id && indent.inventory_grn_id !== existingGrnId) {
    return { ok: false, message: 'Indent is already linked to another GRN.' };
  }
  return { ok: true, indent };
}

export function mapIndentToGrnPrefill(
  indent: InventoryIndentRow,
  uoms: UomMasterOption[] = [],
  items: InventoryItemOption[] = [],
): {
  grnType: 'Purchase';
  grnDate: string;
  storeId: string;
  voucherNumber: string;
  remarks: string;
  lines: InventoryGrnLineDraft[];
} {
  const approvedLines = indent.lines.filter(
    (line) => Number(line.approved_qty ?? line.requested_qty) > 0,
  );

  const mapLine = (line: InventoryIndentRow['lines'][number]): InventoryGrnLineDraft => {
    const item = items.find((entry) => entry.id === line.item_id);
    const baseUom = findUomMasterOption(line.uom || item?.uom || '', uoms);
    const qty = Number(line.approved_qty ?? line.requested_qty);
    return {
      ...EMPTY_GRN_LINE(),
      item_id: line.item_id ?? '',
      item_code: line.item_code,
      item_name: line.item_name,
      uom: baseUom?.abbreviation ?? line.uom ?? item?.uom ?? '',
      purchase_uom: baseUom?.abbreviation ?? '',
      tracking_mode: item?.tracking_mode,
      is_expirable: item?.is_expirable,
      required_qty: qty,
      remaining_qty: qty,
      grn_qty: 0,
      remarks: line.remarks ?? '',
    };
  };

  return {
    grnType: 'Purchase',
    grnDate: indent.request_date,
    storeId: indent.to_store_id || indent.from_store_id,
    voucherNumber: indent.purchase_indent_number ?? '',
    remarks: indent.remarks
      ? `From indent ${indent.indent_number}: ${indent.remarks}`
      : `From indent ${indent.indent_number}`,
    lines: approvedLines.length > 0 ? approvedLines.map(mapLine) : [EMPTY_GRN_LINE()],
  };
}
