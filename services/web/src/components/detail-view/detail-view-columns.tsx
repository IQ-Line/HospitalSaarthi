import type { ReactNode } from 'react';
import { cn } from '@pulse/utils';

export interface DetailViewColumnsProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}

/** Two-column read-only detail layout (reference HIMS patient modal). */
export function DetailViewColumns({ left, right, className }: DetailViewColumnsProps) {
  return (
    <div className={cn('grid min-w-0 gap-8 md:grid-cols-2', className)}>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
