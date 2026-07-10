import type { InventoryTransferRow } from '../types';

export type TransferListDirection = 'outgoing' | 'incoming';

export function shouldShowOutgoingTransfersTab(): boolean {
  return true;
}

export function shouldShowIncomingTransfersTab(): boolean {
  return true;
}

export function defaultTransferDirection(): TransferListDirection {
  return 'outgoing';
}

/** Outgoing = source store dispatching stock. */
export function outgoingTransferStoreFilter(storeId: string) {
  return { from_store_id: storeId };
}

/** Incoming = destination store receiving stock. */
export function incomingTransferStoreFilter(storeId: string) {
  return { to_store_id: storeId };
}

export const INCOMING_TRANSFER_STATUSES: InventoryTransferRow['status'][] = [
  'Dispatched',
  'Partially received',
];

export const OUTGOING_DISPATCHABLE_STATUSES: InventoryTransferRow['status'][] = ['Draft'];

export function transferAwaitsReceipt(
  transfer: Pick<InventoryTransferRow, 'status'>,
): boolean {
  return transfer.status === 'Dispatched' || transfer.status === 'Partially received';
}

export function transferAwaitsDispatch(
  transfer: Pick<InventoryTransferRow, 'status'>,
): boolean {
  return transfer.status === 'Draft';
}

/** Draft cancel — sending store. In-transit cancel — receiving store closes unsettled qty. */
export function transferSupportsCancel(
  transfer: Pick<InventoryTransferRow, 'status'>,
  direction: TransferListDirection,
): boolean {
  if (transfer.status === 'Draft') return direction === 'outgoing';
  if (transfer.status === 'Dispatched' || transfer.status === 'Partially received') {
    return direction === 'incoming';
  }
  return false;
}

export function transferHasUnsettledQty(
  transfer: Pick<InventoryTransferRow, 'lines'>,
): boolean {
  return transfer.lines.some((line) => {
    const dispatched = line.dispatched_qty ?? line.quantity;
    const received = line.received_qty ?? 0;
    return received + 0.0005 < dispatched;
  });
}
