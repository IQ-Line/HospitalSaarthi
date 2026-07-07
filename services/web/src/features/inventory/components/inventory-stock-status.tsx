import { Badge } from '@pulse/ui/badge';
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

const STATUS_BADGE_CLASS: Record<InventoryStockStatus, string> = {
  critical: 'border-destructive/40 bg-destructive/5 text-destructive',
  low: 'border-amber-500/40 bg-amber-500/5 text-amber-700',
  normal: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700',
};

export function InventoryStockStatusLabel({ status }: { status: InventoryStockStatus }) {
  return <span className={cn('text-sm font-medium', STATUS_CLASS[status])}>{STATUS_LABELS[status]}</span>;
}

export function InventoryStockStatusBadge({ status }: { status: InventoryStockStatus }) {
  return (
    <Badge variant="outline" className={cn('shrink-0 font-medium', STATUS_BADGE_CLASS[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
