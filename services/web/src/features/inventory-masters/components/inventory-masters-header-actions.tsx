import { Download, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

interface InventoryMastersHeaderActionsProps {
  catalogModuleSlug: string;
  addLabel: string;
}

export function InventoryMastersHeaderActions({
  catalogModuleSlug,
  addLabel,
}: InventoryMastersHeaderActionsProps) {
  const { canCreate, canMutate } = useCatalogModuleCrud(catalogModuleSlug, {
    productModuleSlug: 'master-data',
  });

  const placeholder = (action: string) => {
    toast.info(`${action} will be available when APIs are connected.`);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canMutate ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => placeholder('Export')}
          >
            <Upload className="size-4" aria-hidden />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => placeholder('Import')}
          >
            <Download className="size-4" aria-hidden />
            Import
          </Button>
        </>
      ) : null}
      {canCreate ? (
        <Button type="button" size="sm" className="gap-1.5" onClick={() => placeholder(addLabel)}>
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
