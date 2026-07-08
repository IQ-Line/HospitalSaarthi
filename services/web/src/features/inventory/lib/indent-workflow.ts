import type { InventoryIndentRow, InventoryIndentStoreOption } from '../types';

export type IndentListDirection = 'outgoing' | 'incoming';

export function canShowOutgoingTab(_store: InventoryIndentStoreOption | undefined): boolean {
  return true;
}

/** Any store can receive stock and must see indents addressed to it. */
export function canShowIncomingTab(store: InventoryIndentStoreOption | undefined): boolean {
  return store != null;
}

export function defaultIndentDirection(
  store: InventoryIndentStoreOption | undefined,
): IndentListDirection {
  if (store?.indent_authority === false) return 'incoming';
  return 'outgoing';
}

/** Stock that backs approval qty — always the sending (From) store. */
export function indentStockSupplyStoreId(
  indent: Pick<InventoryIndentRow, 'from_store_id' | 'to_store_id' | 'route'>,
): string {
  return indent.from_store_id;
}

/**
 * Approval is role-based (higher authority), not tied to incoming/outgoing store tabs.
 * Wire Cerbos `inventory:indent:approve` here when available.
 */
export function canApproveIndent(
  indent: Pick<InventoryIndentRow, 'status'>,
  _activeStoreId?: string,
  hasApprovePermission = true,
): boolean {
  if (!hasApprovePermission) return false;
  return indent.status === 'submitted';
}

/**
 * After approval, authorized users initiate transfer / procurement from the indent detail.
 */
export function canFulfillIndent(
  indent: Pick<
    InventoryIndentRow,
    'status' | 'inventory_stock_transfer_id' | 'inventory_grn_id'
  >,
  _activeStoreId?: string,
  hasApprovePermission = true,
): boolean {
  if (!hasApprovePermission) return false;
  if (indent.status !== 'approved' && indent.status !== 'partially_approved') return false;
  if (indent.inventory_stock_transfer_id || indent.inventory_grn_id) return false;
  return true;
}

export function resolveIndentDetailDirection(
  indent: Pick<InventoryIndentRow, 'from_store_id' | 'to_store_id'>,
  activeStoreId: string | undefined,
): IndentListDirection {
  // Outgoing = receiving store that raised the request (To).
  if (activeStoreId && indent.to_store_id === activeStoreId) return 'outgoing';
  // Incoming = sending store dispatch queue (From).
  if (activeStoreId && indent.from_store_id === activeStoreId) return 'incoming';
  return 'outgoing';
}

/** Transfer ships stock From → To (same direction as the indent). */
export function indentTransferFromStoreId(
  indent: Pick<InventoryIndentRow, 'from_store_id' | 'to_store_id'>,
): string {
  return indent.from_store_id;
}

export function indentTransferToStoreId(
  indent: Pick<InventoryIndentRow, 'from_store_id' | 'to_store_id'>,
): string {
  return indent.to_store_id;
}

export function canCreateTransferFromIndent(
  indent: Pick<InventoryIndentRow, 'status' | 'inventory_stock_transfer_id' | 'route'>,
): boolean {
  if (indent.route !== 'stock_transfer') return false;
  if (indent.inventory_stock_transfer_id) return false;
  return indent.status === 'approved' || indent.status === 'partially_approved';
}

export function isPartialApproval(
  lines: Array<{ id: string; requested_qty: number; approved_qty?: number | null }>,
  approvedByLine: Record<string, string>,
): boolean {
  return lines.some((line) => {
    const approved = Number(approvedByLine[line.id] ?? line.approved_qty ?? line.requested_qty);
    return approved > 0 && approved < Number(line.requested_qty);
  });
}

export const INDENT_INSUFFICIENT_STOCK_MESSAGE =
  'Insufficient stock at the source store — no batch has enough quantity for the approved amount. Receive stock via GRN, lower the approved quantity, or use procurement.';

export function validateApprovalStock(
  lines: Array<{
    id: string;
    item_id?: string;
    item_code?: string;
    item_name?: string;
    uom?: string;
  }>,
  approvedByLine: Record<string, string>,
  availableQtyByItemCode: Map<string, number>,
  availableQtyByItemId?: Map<string, number>,
): string | null {
  for (const line of lines) {
    const approved = Number(approvedByLine[line.id] ?? 0);
    if (approved <= 0) continue;

    const available =
      (line.item_id ? availableQtyByItemId?.get(line.item_id) : undefined) ??
      (line.item_code ? availableQtyByItemCode.get(line.item_code) : undefined) ??
      0;

    if (approved > available) {
      const name = line.item_name ?? line.item_code ?? line.item_id ?? 'Item';
      const codeSuffix = line.item_code ? ` (${line.item_code})` : '';
      const uomSuffix = line.uom ? ` ${line.uom}` : '';
      return `${name}${codeSuffix}: approved qty ${approved} exceeds available stock (${available}${uomSuffix}). ${INDENT_INSUFFICIENT_STOCK_MESSAGE}`;
    }
  }
  return null;
}
