import type { ReactNode } from 'react';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { cn } from '@pulse/utils';

const WIDE_DIALOG_CLASS =
  'max-w-[min(1200px,calc(100%-2rem))] gap-0 overflow-x-hidden p-0 sm:max-w-[min(1200px,calc(100%-2rem))]';

export interface WideDetailDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
  children?: ReactNode;
  closeLabel?: string;
}

/** Large read-only detail modal shell — reuse for patient, visit, billing previews, etc. */
export function WideDetailDialog({
  open,
  title,
  onClose,
  isLoading,
  loadingMessage = 'Loading…',
  children,
  closeLabel = 'Close',
}: WideDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={WIDE_DIALOG_CLASS}>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 overflow-x-hidden px-6 py-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          ) : (
            children
          )}
        </div>

        <DialogFooter className={cn('mx-0 mb-0 border-t px-6 py-4')}>
          <Button
            type="button"
            className="bg-[#0891B2] text-white hover:bg-[#0e7490]"
            onClick={onClose}
          >
            {closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
