import { EMPTY_TRANSFER_LINE } from '../mock/fixtures';
import type { InventoryIndentRow, InventoryTransferLine } from '../types';

const TRANSFER_LINKABLE_STATUSES = new Set<InventoryIndentRow['status']>([
  'approved',
  'partially_approved',
]);

export type TransferIndentPrefillResult =
  | { ok: true; indent: InventoryIndentRow }
  | { ok: false; message: string };

export function validateIndentForTransferPrefill(
  indent: InventoryIndentRow,
): TransferIndentPrefillResult {
  if (indent.route !== 'stock_transfer') {
    return { ok: false, message: 'Only stock-transfer indents can create transfers.' };
  }
  if (!TRANSFER_LINKABLE_STATUSES.has(indent.status)) {
    return { ok: false, message: 'Indent must be approved before creating a transfer.' };
  }
  if (indent.inventory_stock_transfer_id) {
    return { ok: false, message: 'Indent already has a linked transfer.' };
  }
  if (!indent.to_store_id) {
    return { ok: false, message: 'Indent is missing the receiving store.' };
  }
  return { ok: true, indent };
}

export function mapIndentToTransferPrefill(
  indent: InventoryIndentRow,
  availableQtyByItemId: Map<string, number> = new Map(),
): {
  transferDate: string;
  fromStoreId: string;
  toStoreId: string;
  transferType: 'normal' | 'emergency';
  remarks: string;
  lines: InventoryTransferLine[];
} {
  const approvedLines = indent.lines.filter(
    (line) => line.item_id && Number(line.approved_qty ?? line.requested_qty) > 0,
  );

  const mapLine = (line: InventoryIndentRow['lines'][number]): InventoryTransferLine => {
    const approvedQty = Number(line.approved_qty ?? line.requested_qty);
    const availableQty = line.item_id ? (availableQtyByItemId.get(line.item_id) ?? 0) : 0;
    const dispatchQty = Math.min(approvedQty, availableQty > 0 ? availableQty : approvedQty);

    return {
      ...EMPTY_TRANSFER_LINE(),
      item_id: line.item_id,
      item_code: line.item_code,
      item_name: line.item_name,
      uom: line.uom,
      requested_qty: Number(line.requested_qty),
      approved_qty: approvedQty,
      available_qty: availableQty,
      quantity: dispatchQty,
    };
  };

  return {
    transferDate: new Date().toISOString().slice(0, 10),
    fromStoreId: indent.from_store_id,
    toStoreId: indent.to_store_id,
    transferType: indent.indent_type === 'emergency' ? 'emergency' : 'normal',
    remarks: indent.remarks
      ? `From indent ${indent.indent_number}: ${indent.remarks}`
      : `From indent ${indent.indent_number}`,
    lines: approvedLines.length > 0 ? approvedLines.map(mapLine) : [EMPTY_TRANSFER_LINE()],
  };
}
