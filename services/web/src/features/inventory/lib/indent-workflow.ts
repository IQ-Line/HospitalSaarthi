import type { InventoryIndentRow, InventoryIndentStoreOption } from '../types';

export type IndentListDirection = 'outgoing' | 'incoming';

export function canShowOutgoingTab(_store: InventoryIndentStoreOption | undefined): boolean {
  return true;
}

export function canShowIncomingTab(store: InventoryIndentStoreOption | undefined): boolean {
  return store?.indent_authority === false;
}

export function defaultIndentDirection(
  store: InventoryIndentStoreOption | undefined,
): IndentListDirection {
  if (canShowIncomingTab(store)) return 'incoming';
  return 'outgoing';
}

export function resolveIndentDetailDirection(
  indent: Pick<InventoryIndentRow, 'from_store_id' | 'to_store_id'>,
  activeStoreId: string | undefined,
): IndentListDirection {
  if (activeStoreId && indent.to_store_id === activeStoreId) return 'incoming';
  if (activeStoreId && indent.from_store_id === activeStoreId) return 'outgoing';
  return 'outgoing';
}

/** Fulfilling store supplies stock (central); requesting store receives (pharmacy). */
export function indentTransferFromStoreId(
  indent: Pick<InventoryIndentRow, 'from_store_id' | 'to_store_id'>,
): string {
  return indent.to_store_id;
}

export function indentTransferToStoreId(
  indent: Pick<InventoryIndentRow, 'from_store_id' | 'to_store_id'>,
): string {
  return indent.from_store_id;
}

export function canCreateTransferFromIndent(
  indent: Pick<InventoryIndentRow, 'status' | 'inventory_stock_transfer_id' | 'route'>,
): boolean {
  if (indent.route !== 'stock_transfer') return false;
  if (indent.inventory_stock_transfer_id) return false;
  return indent.status === 'approved' || indent.status === 'partially_approved';
}

export function isPartialApproval(
  lines: Array<{ requested_qty: number; approved_qty?: number | null }>,
  approvedByLine: Record<string, string>,
): boolean {
  return lines.some((line) => {
    const approved = Number(approvedByLine[line.id] ?? line.approved_qty ?? line.requested_qty);
    return approved > 0 && approved < Number(line.requested_qty);
  });
}
