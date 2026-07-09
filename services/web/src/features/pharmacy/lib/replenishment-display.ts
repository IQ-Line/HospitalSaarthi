import type { IndentPriority, IndentRequestStatus } from '../types/replenishment-ui.types';

export const INDENT_STATUS_FILTER_OPTIONS: {
  value: IndentRequestStatus | '__all__';
  label: string;
}[] = [
  { value: '__all__', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'procurement_pending', label: 'Procurement Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
];

export function indentPriorityLabel(priority: IndentPriority): string {
  const map: Record<IndentPriority, string> = {
    normal: 'NORMAL',
    urgent: 'URGENT',
    stat: 'STAT',
  };
  return map[priority];
}

export function indentStatusLabel(status: IndentRequestStatus): string {
  const found = INDENT_STATUS_FILTER_OPTIONS.find((o) => o.value === status);
  return found?.label ?? status;
}

export function indentStatusBadgeClass(status: IndentRequestStatus): string {
  const map: Record<IndentRequestStatus, string> = {
    draft: 'border-slate-400/60 text-slate-700',
    submitted: 'border-sky-500/60 text-sky-800',
    procurement_pending: 'border-amber-500/60 text-amber-800',
    approved: 'border-blue-500/60 text-blue-800',
    fulfilled: 'border-violet-500/60 text-violet-800',
    rejected: 'border-red-500/60 text-red-700',
  };
  return map[status];
}

export function formatIndentRequestDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatIndentDisplayDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB');
}
