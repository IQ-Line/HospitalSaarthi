import { cn } from '@pulse/utils';
import type { InventoryStockStatus } from '../types';

const STATUS_LABELS: Record<InventoryStockStatus, string> = {
  critical: 'Critical',
  low: 'Low',
  normal: 'Normal',
};

const STATUS_CLASS: Record<InventoryStockStatus, string> = {
  critical: 'text-destructive',
  low: 'text-amber-600',
  normal: 'text-emerald-600',
};

export function InventoryStockStatusLabel({ status }: { status: InventoryStockStatus }) {
  return <span className={cn('text-sm font-medium', STATUS_CLASS[status])}>{STATUS_LABELS[status]}</span>;
}
