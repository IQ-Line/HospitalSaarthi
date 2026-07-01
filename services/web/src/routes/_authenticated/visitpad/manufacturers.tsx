import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { CatalogActiveSwitch } from '@/features/visitpad/components/catalog-active-switch';
import { RequiredLabel, VISITPAD_CODE_HELPER_TEXT } from '@/features/visitpad/components/required-label';
import { useCatalogActiveToggleConfirm } from '@/features/visitpad/hooks/use-catalog-active-toggle-confirm';
import { nextDisplayOrder } from '@/features/visitpad/lib/next-display-order';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadManufacturers,
  useVisitpadManufacturersGlobalLibrary,
  useVisitpadPatch,
  useVisitpadPlatformImport,
  useVisitpadPost,
  useVisitpadTenantImportKeys,
  VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
  VISITPAD_CATALOG_PAGE_SIZES,
} from '@/features/visitpad/api';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadManufacturer } from '@/features/visitpad/types';
import {
  visitpadManufacturerCreateFormSchema,
  visitpadManufacturerEditFormSchema,
  type VisitpadManufacturerCreateFormSchema,
  type VisitpadManufacturerEditFormSchema,
} from '@/features/visitpad/validation';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const MF_BASE = '/api/v1/master-data/visitpad/manufacturers';

export const Route = createFileRoute('/_authenticated/visitpad/manufacturers')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/manufacturers'),
  component: VisitpadManufacturersPage,
});

function VisitpadManufacturersPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-manufacturers');
  const { canUpdate, canMutate } = useCatalogModuleCrud(catalogModuleSlug);
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
  const [editing, setEditing] = useState<VisitpadManufacturer | null>(null);
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadManufacturers(search || undefined, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadManufacturersGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(MF_BASE);
  const create = useVisitpadPost(MF_BASE);
  const platformImport = useVisitpadPlatformImport('/manufacturers/import-from-platform');
  const { data: tenantKeys, isLoading: tenantKeysLoading } = useVisitpadTenantImportKeys(
    '/manufacturers',
    importOpen && tenantCatalog,
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantKeys ?? new Set<string>(), [tenantKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadManufacturer) => r.code.toLowerCase(), []);

  const importSearchParts = useCallback(
    (r: VisitpadManufacturer) => [r.code, r.display_name, r.short_name ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [{ id: 'name', header: 'Display name', cell: (r: VisitpadManufacturer) => r.display_name }],
    [],
  );

  const activeToggle = useCatalogActiveToggleConfirm({
    disabled: patch.isPending || !canUpdate,
    onConfirm: async (id, next) => {
      try {
        await patch.mutateAsync({ id, body: { is_active: next } });
        toast.success(next ? 'Manufacturer enabled' : 'Manufacturer disabled');
      } catch (e) {
        toast.error(mutationErrorMessage(e));
      }
    },
  });

  const runManufacturerImport = async (selection: VisitpadManufacturer[]) => {
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

  const columns = useMemo<ColumnDef<VisitpadManufacturer, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Manufacturer code', meta: { label: 'Manufacturer code' } },
      { accessorKey: 'display_name', header: 'Display name', meta: { label: 'Display name' } },
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
      visitpadActionsColumn<VisitpadManufacturer>({
        onEdit: setEditing,
        disabled: busy,
        canEdit: canUpdate,
      }),
    ],
    [activeToggle, busy, canUpdate],
  );

  return (
    <VisitpadPageShell
      primary="manufacturers"
      tabCount={tabCount}
      title="Manufacturers"
      description={
        tenantCatalog
          ? 'Tenant manufacturer catalog: import from the platform library or add local-only makers.'
          : 'Platform manufacturer catalog for Visitpad (vaccine and product makers).'
      }
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel="Add manufacturer"
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
            emptyTitle="No manufacturers found"
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

      <ImportFromPlatformCatalogDialog<VisitpadManufacturer>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import manufacturers from platform library"
        description="Select manufacturers to add to your tenant catalog. Already-imported codes are disabled."
        searchPlaceholder="Search code, display name, short name…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        importedKeysLoading={tenantKeysLoading}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runManufacturerImport}
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

      <ManufacturerCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Manufacturer created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ManufacturerEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Manufacturer updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />


      <VisitpadSnomedFooter />
    </VisitpadPageShell>
  );
}

function ManufacturerCreateDialog({
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
  const form = useForm<VisitpadManufacturerCreateFormSchema>({
    resolver: zodResolver(visitpadManufacturerCreateFormSchema),
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

  const submit: SubmitHandler<VisitpadManufacturerCreateFormSchema> = async (v) => {
    await onSubmit({
      code: v.code,
      display_name: v.display_name.trim(),
      short_name: v.short_name && v.short_name.trim() ? v.short_name.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add manufacturer"
      description="Manufacturer code cannot be changed after save."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="mfr-code">Manufacturer code</RequiredLabel>
          <Input
            id="mfr-code"
            maxLength={9}
            placeholder="e.g. pfz_inc"
            autoComplete="off"
            {...form.register('code')}
          />
          <p className="text-xs text-muted-foreground">{VISITPAD_CODE_HELPER_TEXT}</p>
          {form.formState.errors.code ? (
            <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="mfr-display">Display name</RequiredLabel>
          <Input
            id="mfr-display"
            placeholder="e.g. Pfizer Inc."
            autoComplete="organization"
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="mfr-short">Short name</Label>
          <Input id="mfr-short" autoComplete="off" {...form.register('short_name')} />
          <p className="text-xs text-muted-foreground">Optional.</p>
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="mfr-order">Display order</RequiredLabel>
          <Input
            id="mfr-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
          {form.formState.errors.display_order ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_order.message}</p>
          ) : null}
        </div>
        <CatalogActiveSwitch
          id="mfr-active"
          checked={!!form.watch('is_active')}
          onCheckedChange={(c) => form.setValue('is_active', c)}
        />
      </div>
    </EntityFormDialog>
  );
}

function ManufacturerEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadManufacturer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadManufacturerEditFormSchema>({
    resolver: zodResolver(visitpadManufacturerEditFormSchema),
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

  const submit: SubmitHandler<VisitpadManufacturerEditFormSchema> = async (v) => {
    await onSave({
      display_name: v.display_name.trim(),
      short_name: v.short_name && v.short_name.trim() ? v.short_name.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit manufacturer"
      description={`Code: ${row.code} (cannot be changed)`}
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="edit-mfr-display">Display name</RequiredLabel>
          <Input id="edit-mfr-display" {...form.register('display_name')} />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-mfr-short">Short name</Label>
          <Input id="edit-mfr-short" autoComplete="off" {...form.register('short_name')} />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="edit-mfr-order">Display order</RequiredLabel>
          <Input
            id="edit-mfr-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
        </div>
        <CatalogActiveSwitch
          id="edit-mfr-active"
          checked={!!form.watch('is_active')}
          onCheckedChange={(c) => form.setValue('is_active', c)}
        />
      </div>
    </EntityFormDialog>
  );
}
