import { FileSpreadsheet, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';

interface VisitpadHeaderActionsProps {
  addLabel: string;
  onAddClick: () => void;
  /** Bulk CSV is product backlog; keep control visible per reference UI. */
  onBulkCsvClick?: () => void;
}

export function VisitpadHeaderActions({
  addLabel,
  onAddClick,
  onBulkCsvClick,
}: VisitpadHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          if (onBulkCsvClick) {
            onBulkCsvClick();
            return;
          }
          toast.info('Bulk CSV import and export will ship in a later iteration.');
        }}
      >
        <FileSpreadsheet className="size-4" aria-hidden />
        Bulk CSV
      </Button>
      <Button type="button" size="sm" className="gap-1.5" onClick={onAddClick}>
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
