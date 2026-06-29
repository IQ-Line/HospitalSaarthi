import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@pulse/ui/skeleton';
import { cn } from '@pulse/utils';

interface InventoryKpiCardProps {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export function InventoryKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  isLoading,
}: InventoryKpiCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <p className="text-3xl font-bold tabular-nums">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

interface InventoryPanelProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function InventoryPanel({ title, action, children, className }: InventoryPanelProps) {
  return (
    <div className={cn('rounded-lg border bg-card shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
