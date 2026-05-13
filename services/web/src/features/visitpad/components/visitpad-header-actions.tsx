import { FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';

interface VisitpadHeaderActionsProps {
  addLabel: string;
  onAddClick: () => void;
  /** Copy global platform rows into the active tenant catalog (tenant UUID scope only). */
  onImportFromLibrary?: () => void;
  importFromLibraryPending?: boolean;
  /** Bulk CSV is product backlog; keep control visible per reference UI. */
  onBulkCsvClick?: () => void;
  /** Label for the CSV control (defaults to “Import from CSV” in reference layouts). */
  bulkCsvLabel?: string;
}

export function VisitpadHeaderActions({
  addLabel,
  onAddClick,
  onImportFromLibrary,
  importFromLibraryPending = false,
  onBulkCsvClick,
  bulkCsvLabel = 'Import from CSV',
}: VisitpadHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onImportFromLibrary ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={importFromLibraryPending}
          onClick={onImportFromLibrary}
        >
          <Upload className="size-4" aria-hidden />
          Import from library
        </Button>
      ) : null}
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
        {bulkCsvLabel}
      </Button>
      <Button type="button" size="sm" className="gap-1.5" onClick={onAddClick}>
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
