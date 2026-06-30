import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { CatalogActiveSwitch } from '@/features/visitpad/components/catalog-active-switch';
import { RequiredLabel, VISITPAD_CODE_HELPER_TEXT } from '@/features/visitpad/components/required-label';
import { useCatalogActiveToggleConfirm } from '@/features/visitpad/hooks/use-catalog-active-toggle-confirm';
import { nextDisplayOrder } from '@/features/visitpad/lib/next-display-order';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPlatformImport,
  useVisitpadPost,
  useVisitpadTenantImportKeys,
  useVisitpadVaccines,
  useVisitpadVaccinesGlobalLibrary,
  VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
  VISITPAD_CATALOG_PAGE_SIZES,
} from '@/features/visitpad/api';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadVaccine } from '@/features/visitpad/types';
import {
  visitpadVaccineCreateFormSchema,
  visitpadVaccineEditFormSchema,
  type VisitpadVaccineCreateFormInput,
  type VisitpadVaccineCreateFormSchema,
  type VisitpadVaccineEditFormInput,
  type VisitpadVaccineEditFormSchema,
} from '@/features/visitpad/validation';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const VA_BASE = '/api/v1/master-data/visitpad/vaccines';

export const Route = createFileRoute('/_authenticated/visitpad/vaccines')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/vaccines'),
  component: VisitpadVaccinesPage,
});

function VisitpadVaccinesPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-vaccines');
  const { canUpdate, canDelete, canMutate } = useCatalogModuleCrud(catalogModuleSlug);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [libPageIndex, setLibPageIndex] = useState(0);
  const libPageSize = 50;
  const { librarySearch, librarySearchDraft, setLibrarySearchDraft } = useVisitpadImportLibrarySearch(
    importOpen,
    setLibPageIndex,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(VISITPAD_CATALOG_DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<VisitpadVaccine | null>(null);
  const [deleting, setDeleting] = useState<VisitpadVaccine | null>(null);
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadVaccines(search || undefined, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadVaccinesGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(VA_BASE);
  const del = useVisitpadDelete(VA_BASE);
  const create = useVisitpadPost(VA_BASE);
  const platformImport = useVisitpadPlatformImport('/vaccines/import-from-platform');
  const { data: tenantCodeKeys, isLoading: tenantCodeKeysLoading } = useVisitpadTenantImportKeys(
    '/vaccines',
    importOpen && tenantCatalog,
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantCodeKeys ?? new Set<string>(), [tenantCodeKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadVaccine) => r.code, []);

  const importSearchParts = useCallback(
    (r: VisitpadVaccine) => [r.code, r.display_name, r.short_name ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [{ id: 'name', header: 'Vaccine', cell: (r: VisitpadVaccine) => r.display_name }],
    [],
  );

  const activeToggle = useCatalogActiveToggleConfirm({
    disabled: patch.isPending || !canUpdate,
    onConfirm: async (id, next) => {
      try {
        await patch.mutateAsync({ id, body: { is_active: next } });
        toast.success(next ? 'Vaccine enabled' : 'Vaccine disabled');
      } catch (e) {
        toast.error(mutationErrorMessage(e));
      }
    },
  });

  const runVaccineImport = async (selection: VisitpadVaccine[]) => {
    try {
      const res = await platformImport.mutateAsync(selection.map((r) => r.id));
      const { created, skipped, errors } = res.data;
      const parts = [`${created.length} created`, `${skipped.length} skipped`];
      if (errors.length) parts.push(`${errors.length} failed`);
      toast.success(parts.join(', '));
      if (errors.length) {
        toast.error(errors.map((e) => e.message).join('; '));
      }
      setImportOpen(false);
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    }
  };

  const columns = useMemo<ColumnDef<VisitpadVaccine, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Vaccine code', meta: { label: 'Vaccine code' } },
      { accessorKey: 'display_name', header: 'Vaccine', meta: { label: 'Vaccine' } },
      {
        accessorKey: 'short_name',
        header: 'Short name',
        meta: { label: 'Short name' },
        cell: ({ row }) =>
          row.original.short_name || <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'is_active',
        header: 'Enabled',
        meta: { label: 'Enabled' },
        cell: ({ row }) =>
          activeToggle.renderToggle({
            id: row.original.id,
            displayName: row.original.display_name || row.original.code,
            isActive: row.original.is_active,
          }),
      },
      visitpadActionsColumn<VisitpadVaccine>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
        canEdit: canUpdate,
        canDelete,
      }),
    ],
    [activeToggle, busy, canUpdate, canDelete],
  );

  return (
    <VisitpadPageShell
      primary="vaccines"
      tabCount={tabCount}
      title="Vaccines"
      description={
        tenantCatalog
          ? 'Tenant vaccine catalog: import from the platform library or add local-only vaccines.'
          : 'Platform vaccine catalog for Visitpad (stable code, display name, optional short name).'
      }
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel="Add vaccine"
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <MasterDataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search code, display name, short name…"
        />
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyTitle="No vaccines found"
            emptyDescription="Adjust your search or add catalog entries."
            manualPagination={{
              pageIndex,
              pageSize,
              total,
              pageSizeOptions: VISITPAD_CATALOG_PAGE_SIZES,
              onPageChange: setPageIndex,
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>

      {activeToggle.renderConfirmDialog()}

      <ImportFromPlatformCatalogDialog<VisitpadVaccine>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import vaccines from platform library"
        description="Select vaccines to add to your tenant catalog. Already-imported codes are disabled."
        searchPlaceholder="Search code, display name, short name…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        importedKeysLoading={tenantCodeKeysLoading}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runVaccineImport}
        libraryPagination={{
          pageIndex: libPageIndex,
          pageSize: libPageSize,
          total: globalLibTotal,
          onPageChange: setLibPageIndex,
        }}
        librarySearchControl={{
          draft: librarySearchDraft,
          onDraftChange: setLibrarySearchDraft,
        }}
      />

      <VaccineCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Vaccine created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <VaccineEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Vaccine updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete vaccine"
        description={`Remove “${deleting?.display_name ?? deleting?.code ?? ''}” from this catalog?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Vaccine deleted');
              setDeleting(null);
            } catch (e) {
              toast.error(mutationErrorMessage(e));
            }
          })();
        }}
      />

      <VisitpadSnomedFooter />
    </VisitpadPageShell>
  );
}

function VaccineCreateDialog({
  open,
  onOpenChange,
  nextOrder,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextOrder: number;
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadVaccineCreateFormInput, unknown, VisitpadVaccineCreateFormSchema>({
    resolver: zodResolver(visitpadVaccineCreateFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      short_name: '',
      display_order: nextOrder,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: '',
        display_name: '',
        short_name: '',
        display_order: nextOrder,
        is_active: true,
      });
    }
  }, [open, nextOrder, form]);

  const submit: SubmitHandler<VisitpadVaccineCreateFormSchema> = async (v) => {
    await onSubmit({
      code: v.code,
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add vaccine"
      description="Code is immutable after save."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="vaccine-code">Vaccine code</RequiredLabel>
          <Input id="vaccine-code" maxLength={9} placeholder="e.g. cov_mrna" {...form.register('code')} />
          <p className="text-xs text-muted-foreground">{VISITPAD_CODE_HELPER_TEXT}</p>
          {form.formState.errors.code ? (
            <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vaccine-display">Vaccine display name</RequiredLabel>
          <Input
            id="vaccine-display"
            placeholder="e.g. COVID-19 mRNA vaccine"
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vaccine-short">Vaccine short name</Label>
          <Input id="vaccine-short" {...form.register('short_name')} />
          <p className="text-xs text-muted-foreground">Optional.</p>
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vaccine-order">Display order</RequiredLabel>
          <Input
            id="vaccine-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
          {form.formState.errors.display_order ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_order.message}</p>
          ) : null}
        </div>
        <CatalogActiveSwitch
          id="vaccine-active"
          checked={!!form.watch('is_active')}
          onCheckedChange={(c) => form.setValue('is_active', c)}
        />
      </div>
    </EntityFormDialog>
  );
}

function VaccineEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadVaccine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadVaccineEditFormInput, unknown, VisitpadVaccineEditFormSchema>({
    resolver: zodResolver(visitpadVaccineEditFormSchema),
    defaultValues: {
      display_name: '',
      short_name: '',
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (row && open) {
      form.reset({
        display_name: row.display_name,
        short_name: row.short_name ?? '',
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [row, open, form]);

  if (!row) return null;

  const submit: SubmitHandler<VisitpadVaccineEditFormSchema> = async (v) => {
    await onSave({
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit vaccine"
      description={`Code: ${row.code} (cannot be changed)`}
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="edit-vaccine-display">Vaccine display name</RequiredLabel>
          <Input id="edit-vaccine-display" {...form.register('display_name')} />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-vaccine-short">Vaccine short name</Label>
          <Input id="edit-vaccine-short" {...form.register('short_name')} />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="edit-vaccine-order">Display order</RequiredLabel>
          <Input
            id="edit-vaccine-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
        </div>
        <CatalogActiveSwitch
          id="edit-vaccine-active"
          checked={!!form.watch('is_active')}
          onCheckedChange={(c) => form.setValue('is_active', c)}
        />
      </div>
    </EntityFormDialog>
  );
}
