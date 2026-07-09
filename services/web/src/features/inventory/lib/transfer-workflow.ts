import type { InventoryTransferRow } from '../types';

export type TransferListDirection = 'outgoing' | 'incoming';

export function canShowOutgoingTransfersTab(): boolean {
  return true;
}

export function canShowIncomingTransfersTab(): boolean {
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

export function canReceiveTransfer(
  transfer: Pick<InventoryTransferRow, 'status'>,
): boolean {
  return transfer.status === 'Dispatched' || transfer.status === 'Partially received';
}

export function canDispatchTransfer(
  transfer: Pick<InventoryTransferRow, 'status'>,
): boolean {
  return transfer.status === 'Draft';
}
