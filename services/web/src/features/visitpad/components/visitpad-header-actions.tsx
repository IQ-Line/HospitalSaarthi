import { FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';

interface VisitpadHeaderActionsProps {
  /** Add + bulk CSV (mutations). */
  canWrite?: boolean;
  /**
   * Import from global platform library into tenant overlay (still a server-side write to tenant).
   * Shown when `onImportFromLibrary` is set and user can read catalog — separate from coarse `write` UX
   * so tenant demos can import while Add/row edit stay hidden.
   */
  canRead?: boolean;
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
  canWrite = true,
  canRead = true,
  addLabel,
  onAddClick,
  onImportFromLibrary,
  importFromLibraryPending = false,
  onBulkCsvClick,
  bulkCsvLabel = 'Import from CSV',
}: VisitpadHeaderActionsProps) {
  const showImport = Boolean(onImportFromLibrary) && canRead;
  const showBulk = canWrite;
  const showAdd = canWrite;

  if (!showImport && !showBulk && !showAdd) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showImport ? (
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
      {showBulk ? (
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
      ) : null}
      {showAdd ? (
        <Button type="button" size="sm" className="gap-1.5" onClick={onAddClick}>
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
