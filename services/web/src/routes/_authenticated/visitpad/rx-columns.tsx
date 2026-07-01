import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
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
  useVisitpadPatch,
  useVisitpadPost,
  useVisitpadRxColumns,
  useVisitpadRxColumnsGlobalLibrary,
  useVisitpadRxColumnsPlatformImport,
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
import type { VisitpadRxColumn } from '@/features/visitpad/types';
import {
  visitpadRxColumnCreateFormSchema,
  visitpadRxColumnEditFormSchema,
  type VisitpadRxColumnCreateFormSchema,
  type VisitpadRxColumnEditFormSchema,
} from '@/features/visitpad/validation';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const RX_SECTIONS = [
  { value: 'medication_type', label: 'Medication type' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'unit', label: 'Unit' },
  { value: 'diet_type', label: 'Diet type' },
  { value: 'method_strength', label: 'Method strength' },
  { value: 'route', label: 'Route' },
  { value: 'time_of_administration', label: 'Time of administration' },
] as const;

function sectionLabelFor(value: string) {
  return RX_SECTIONS.find((s) => s.value === value)?.label ?? 'Rx column';
}

const RX_BASE = '/api/v1/master-data/visitpad/rx-columns';

export const Route = createFileRoute('/_authenticated/visitpad/rx-columns')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/rx-columns'),
  component: VisitpadRxColumnsPage,
});

function VisitpadRxColumnsPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-rx-columns');
  const { canUpdate, canMutate } = useCatalogModuleCrud(catalogModuleSlug);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string>(RX_SECTIONS[0].value);
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
  const [editing, setEditing] = useState<VisitpadRxColumn | null>(null);
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadRxColumns(search || undefined, section, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadRxColumnsGlobalLibrary(
    section,
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(RX_BASE);
  const create = useVisitpadPost(RX_BASE);
  const platformImport = useVisitpadRxColumnsPlatformImport(section);
  const { data: tenantRxKeys, isLoading: tenantRxKeysLoading } = useVisitpadTenantImportKeys(
    '/rx-columns',
    importOpen && tenantCatalog,
    {
      section,
    },
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const sectionLabel = sectionLabelFor(section);
  const busy = patch.isPending || platformImport.isPending;

  const activeToggle = useCatalogActiveToggleConfirm({
    disabled: patch.isPending || !canUpdate,
    onConfirm: async (id, next) => {
      try {
        await patch.mutateAsync({ id, body: { is_active: next } });
        toast.success(next ? 'Enabled' : 'Disabled');
      } catch (e) {
        toast.error(mutationErrorMessage(e));
      }
    },
  });

  const { data: rxUnitOptionsRes } = useVisitpadRxColumns(undefined, 'unit', {
    pageIndex: 0,
    pageSize: 200,
  });
  const rxUnitOptions = useMemo(
    () => (rxUnitOptionsRes?.data ?? []).filter((r) => r.is_active && !r.is_deleted),
    [rxUnitOptionsRes?.data],
  );

  const rxColumnKey = useCallback((r: Pick<VisitpadRxColumn, 'section' | 'code'>) => `${r.section}::${r.code}`, []);

  const importedKeys = useMemo(() => tenantRxKeys ?? new Set<string>(), [tenantRxKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadRxColumn) => rxColumnKey(r), [rxColumnKey]);

  const importSearchParts = useCallback(
    (r: VisitpadRxColumn) => [r.code, r.display_name, r.section],
    [],
  );

  const importColumns = useMemo(
    () => [{ id: 'name', header: 'Name', cell: (r: VisitpadRxColumn) => r.display_name }],
    [],
  );

  const runRxColumnImport = async (selection: VisitpadRxColumn[]) => {
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

  useEffect(() => {
    setPageIndex(0);
    setLibPageIndex(0);
  }, [section]);

  const columns = useMemo<ColumnDef<VisitpadRxColumn, unknown>[]>(
    () => [
      { accessorKey: 'display_name', header: 'Name', meta: { label: 'Name' } },
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
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
      visitpadActionsColumn<VisitpadRxColumn>({
        onEdit: setEditing,
        disabled: busy,
        canEdit: canUpdate,
      }),
    ],
    [activeToggle, busy, canUpdate],
  );

  return (
    <VisitpadPageShell
      primary="rx-columns"
      tabCount={tabCount}
      title="Rx columns"
      description={
        tenantCatalog
          ? `Tenant Rx picklists (${sectionLabel}): import from the platform library or add local-only entries.`
          : 'Platform Rx column picklists for medication entry by clinical section.'
      }
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel={`Add ${sectionLabel}`}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex flex-row gap-1 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-x-visible shrink-0 border rounded-md p-1 bg-muted/30">
          {RX_SECTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSection(s.value)}
              className={
                section === s.value
                  ? 'rounded-sm px-3 py-2 text-left text-sm transition-colors whitespace-nowrap lg:whitespace-normal bg-background font-medium text-foreground shadow-sm'
                  : 'rounded-sm px-3 py-2 text-left text-sm transition-colors whitespace-nowrap lg:whitespace-normal text-muted-foreground hover:text-foreground'
              }
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="space-y-4 flex-1 min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search name or code…"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : (
            <DataTable
              showColumnMenu
              columns={columns}
              data={rows}
              isLoading={isLoading}
              emptyTitle="No Rx columns found"
              emptyDescription="Adjust your search or add catalog entries for this section."
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
      </div>

      <ImportFromPlatformCatalogDialog<VisitpadRxColumn>
        open={importOpen}
        onOpenChange={setImportOpen}
        title={`Import ${sectionLabel} from platform library`}
        description="Select rows to add to your tenant catalog for this section. Already-imported codes are disabled."
        searchPlaceholder="Search name or code…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        importedKeysLoading={tenantRxKeysLoading}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runRxColumnImport}
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

      {activeToggle.renderConfirmDialog()}

      <RxColumnCreateDialog
        section={section}
        sectionLabel={sectionLabel}
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        rxUnitOptions={rxUnitOptions}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Rx column created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <RxColumnEditDialog
        row={editing}
        rxUnitOptions={rxUnitOptions}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Rx column updated');
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

const RX_DOSE_UNIT_UNSET = '__unset__';

function RxColumnCreateDialog({
  section,
  sectionLabel,
  open,
  onOpenChange,
  nextOrder,
  rxUnitOptions,
  isSubmitting,
  onSubmit,
}: {
  section: string;
  sectionLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextOrder: number;
  rxUnitOptions: VisitpadRxColumn[];
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const isMethodStrength = section === 'method_strength';
  const form = useForm<VisitpadRxColumnCreateFormSchema>({
    resolver: zodResolver(visitpadRxColumnCreateFormSchema),
    defaultValues: {
      display_name: '',
      code: '',
      extra_unit: undefined,
      display_order: nextOrder,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        display_name: '',
        code: '',
        extra_unit: undefined,
        display_order: nextOrder,
        is_active: true,
      });
    }
  }, [open, section, nextOrder, form]);

  const submit: SubmitHandler<VisitpadRxColumnCreateFormSchema> = async (v) => {
    const extra = v.extra_unit?.trim();
    if (isMethodStrength && !extra) {
      form.setError('extra_unit', { message: 'Select a dosage unit.' });
      return;
    }
    await onSubmit({
      section,
      display_name: v.display_name,
      code: v.code,
      extra_unit: extra && extra.length > 0 ? extra : null,
      display_order: v.display_order,
      is_active: v.is_active ?? true,
    });
  };

  const displayLabel = isMethodStrength ? 'Strength name' : 'Display name';

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Add ${sectionLabel}`}
      description="Picklist value for visit forms."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-rx-name">{displayLabel}</RequiredLabel>
          <Input
            id="vp-rx-name"
            maxLength={256}
            placeholder={isMethodStrength ? 'e.g. 100' : undefined}
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        {isMethodStrength ? (
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-rx-dose-unit">Dose unit</RequiredLabel>
            <Controller
              control={form.control}
              name="extra_unit"
              render={({ field }) => (
                <Select
                  value={field.value && field.value.length > 0 ? field.value : RX_DOSE_UNIT_UNSET}
                  onValueChange={(x) =>
                    field.onChange(x === RX_DOSE_UNIT_UNSET ? undefined : x)
                  }
                >
                  <SelectTrigger id="vp-rx-dose-unit">
                    <SelectValue placeholder="Select dosage unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RX_DOSE_UNIT_UNSET}>Select dosage unit</SelectItem>
                    {rxUnitOptions.map((u) => (
                      <SelectItem key={u.code} value={u.code}>
                        {u.display_name} ({u.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.extra_unit ? (
              <p className="text-sm text-destructive">{form.formState.errors.extra_unit.message}</p>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-rx-code">Code</RequiredLabel>
          <Input
            id="vp-rx-code"
            maxLength={9}
            placeholder={isMethodStrength ? 'e.g. 100_mg' : 'e.g. bid_qd'}
            className="font-mono"
            {...form.register('code')}
          />
          <p className="text-sm text-muted-foreground">{VISITPAD_CODE_HELPER_TEXT}</p>
          {form.formState.errors.code ? (
            <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-rx-order">Display order</RequiredLabel>
          <Input
            id="vp-rx-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
        </div>
        <CatalogActiveSwitch
          id="vp-rx-act"
          checked={!!form.watch('is_active')}
          onCheckedChange={(c) => form.setValue('is_active', c)}
        />
      </div>
    </EntityFormDialog>
  );
}

function RxColumnEditDialog({
  row,
  rxUnitOptions,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadRxColumn | null;
  rxUnitOptions: VisitpadRxColumn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const isMethodStrength = row?.section === 'method_strength';
  const form = useForm<VisitpadRxColumnEditFormSchema>({
    resolver: zodResolver(visitpadRxColumnEditFormSchema),
    defaultValues: {
      display_name: '',
      extra_unit: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        display_name: row.display_name,
        extra_unit: row.extra_unit ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadRxColumnEditFormSchema> = async (v) => {
    const ex = typeof v.extra_unit === 'string' ? v.extra_unit.trim() : '';
    await onSave({
      display_name: v.display_name,
      extra_unit: ex.length > 0 ? ex : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  const editSectionLabel = row ? sectionLabelFor(row.section) : 'Rx column';

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit ${editSectionLabel}` : 'Edit Rx column'}
      description={row ? 'Code cannot be changed. Clear extra unit to remove it.' : 'Update picklist entry.'}
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="vp-rxe-code">Code</Label>
            <Input id="vp-rxe-code" value={row.code} readOnly className="bg-muted font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-rxe-name">
              {isMethodStrength ? 'Strength name' : 'Display name'}
            </RequiredLabel>
            <Input id="vp-rxe-name" maxLength={256} {...form.register('display_name')} />
          </div>
          {isMethodStrength ? (
            <div className="space-y-2">
              <RequiredLabel htmlFor="vp-rxe-extra">Dose unit</RequiredLabel>
              <Controller
                control={form.control}
                name="extra_unit"
                render={({ field }) => (
                  <Select
                    value={
                      field.value && String(field.value).length > 0
                        ? String(field.value)
                        : RX_DOSE_UNIT_UNSET
                    }
                    onValueChange={(x) =>
                      field.onChange(x === RX_DOSE_UNIT_UNSET ? null : x)
                    }
                  >
                    <SelectTrigger id="vp-rxe-extra">
                      <SelectValue placeholder="Select dosage unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RX_DOSE_UNIT_UNSET}>Select dosage unit</SelectItem>
                      {rxUnitOptions.map((u) => (
                        <SelectItem key={u.code} value={u.code}>
                          {u.display_name} ({u.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-rxe-order">Display order</RequiredLabel>
            <Input id="vp-rxe-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <CatalogActiveSwitch
            id="vp-rxe-act"
            checked={!!form.watch('is_active')}
            onCheckedChange={(c) => form.setValue('is_active', c)}
          />
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
