import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@pulse/ui/button';

type ItemMasterDetailPanelProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  children: ReactNode;
};

/** Right-hand editor column (matches iqhealth Item Master side panel). */
export function ItemMasterDetailPanel({
  title,
  subtitle,
  description,
  onClose,
  onSave,
  saveLabel = 'Save',
  saving = false,
  children,
}: ItemMasterDetailPanelProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-l bg-background">
      <div className="flex shrink-0 items-start justify-between border-b bg-muted/30 px-4 py-3">
        <div className="min-w-0 pr-2">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm font-medium">{subtitle}</p>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      <div className="flex shrink-0 flex-row justify-end gap-2 border-t px-4 py-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </div>
  );
}
