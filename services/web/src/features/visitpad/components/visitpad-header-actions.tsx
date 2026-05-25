import { FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

interface VisitpadHeaderActionsProps {
  /** Master Data L2 module slug (e.g. `chief-complaints`, `allergens`, `rxcolumns`). */
  catalogModuleSlug: string;
  addLabel: string;
  onAddClick: () => void;
  onImportFromLibrary?: () => void;
  importFromLibraryPending?: boolean;
  onBulkCsvClick?: () => void;
  bulkCsvLabel?: string;
}

export function VisitpadHeaderActions({
  catalogModuleSlug,
  addLabel,
  onAddClick,
  onImportFromLibrary,
  importFromLibraryPending = false,
  onBulkCsvClick,
  bulkCsvLabel = 'Import from CSV',
}: VisitpadHeaderActionsProps) {
  const { canCreate, canMutate, canRead } = useCatalogModuleCrud(catalogModuleSlug);
  const showImport = Boolean(onImportFromLibrary && canRead);

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
      {canMutate ? (
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
      {canCreate ? (
        <Button type="button" size="sm" className="gap-1.5" onClick={onAddClick}>
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
