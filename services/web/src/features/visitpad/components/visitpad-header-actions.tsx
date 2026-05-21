import { FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { CapabilityGate } from '@/components/capability-gate';
import {
  MD_VISITPAD_CATALOG_READ,
  MD_VISITPAD_CREATE,
  MD_VISITPAD_MUTATE_ANY,
  MD_VISITPAD_VIEW,
} from '@/lib/runtime-capability-keys';

interface VisitpadHeaderActionsProps {
  addLabel: string;
  onAddClick: () => void;
  onImportFromLibrary?: () => void;
  importFromLibraryPending?: boolean;
  onBulkCsvClick?: () => void;
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
        <CapabilityGate any={[MD_VISITPAD_VIEW, MD_VISITPAD_CATALOG_READ]}>
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
        </CapabilityGate>
      ) : null}
      <CapabilityGate any={MD_VISITPAD_MUTATE_ANY}>
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
      </CapabilityGate>
      <CapabilityGate capability={MD_VISITPAD_CREATE}>
        <Button type="button" size="sm" className="gap-1.5" onClick={onAddClick}>
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </Button>
      </CapabilityGate>
    </div>
  );
}
