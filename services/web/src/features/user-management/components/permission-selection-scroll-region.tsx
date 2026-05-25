import type { ReactNode } from 'react';
import { cn } from '@pulse/utils';

/**
 * Scrollable permission tree panel for role / user dialogs.
 * Parent must be a flex column with `min-h-0` and a bounded height (e.g. dialog body `flex-1`).
 */
export function PermissionSelectionScrollRegion({
  children,
  className,
  scrollClassName,
}: {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
}) {
  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col', className)}>
      <div
        className={cn(
          'min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-muted/10 p-2',
          scrollClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
