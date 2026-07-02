import type { InventoryIndentStatus } from '../types';

const STATUS_LABELS: Record<InventoryIndentStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  partially_approved: 'Partially approved',
  rejected: 'Rejected',
  in_fulfillment: 'In fulfillment',
  fulfilled: 'Fulfilled',
};

export function indentStatusLabel(status: InventoryIndentStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export const INDENT_STATUS_FILTER_OPTIONS: Array<{ value: 'all' | InventoryIndentStatus; label: string }> =
  [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'partially_approved', label: 'Partially approved' },
    { value: 'in_fulfillment', label: 'In fulfillment' },
    { value: 'fulfilled', label: 'Fulfilled' },
    { value: 'rejected', label: 'Rejected' },
  ];

export function indentStatusBadgeVariant(
  status: InventoryIndentStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'approved' || status === 'fulfilled') return 'default';
  if (status === 'draft') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
}
