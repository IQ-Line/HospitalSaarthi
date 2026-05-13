import type { FormEvent, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Button } from '@pulse/ui/button';

interface EntityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export function EntityFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  children,
}: EntityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="shrink-0 space-y-2 p-4 pb-2">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-4 py-2">
            {children}
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
