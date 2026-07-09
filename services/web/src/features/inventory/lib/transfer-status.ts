import type { InventoryTransferStatus } from '../types';

const STATUS_LABELS: Record<InventoryTransferStatus, string> = {
  Draft: 'Draft',
  Dispatched: 'Dispatched',
  'Partially received': 'Partially received',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
};

export function transferStatusLabel(status: InventoryTransferStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export const TRANSFER_STATUS_FILTER_OPTIONS: Array<{
  value: 'all' | InventoryTransferStatus;
  label: string;
}> = [
  { value: 'all', label: 'All statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Dispatched', label: 'Dispatched' },
  { value: 'Partially received', label: 'Partially received' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export function transferStatusBadgeClass(status: InventoryTransferStatus): string {
  switch (status) {
    case 'Completed':
      return 'border-emerald-600/80 text-emerald-800 dark:border-emerald-500/60 dark:text-emerald-400';
    case 'Dispatched':
      return 'border-amber-500/80 text-amber-800 dark:border-amber-500/60 dark:text-amber-400';
    case 'Partially received':
      return 'border-orange-500/80 text-orange-800 dark:border-orange-500/60 dark:text-orange-400';
    case 'Rejected':
    case 'Cancelled':
      return 'border-destructive text-destructive';
    default:
      return 'border-muted-foreground text-muted-foreground';
  }
}
