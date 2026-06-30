import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadConversions,
  useVisitpadConversionsGlobalLibrary,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPlatformImport,
  useVisitpadPost,
  useVisitpadTenantImportKeys,
  useVisitpadUnits,
  VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
  VISITPAD_CATALOG_PAGE_SIZES,
} from '@/features/visitpad/api';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VisitpadUnitsSecondaryNav } from '@/features/visitpad/components/visitpad-secondary-link-row';
import type { VisitpadUnit, VisitpadUnitConversion } from '@/features/visitpad/types';
import {
  visitpadActiveUnitRows,
  visitpadConversionUnitSelectOptions,
} from '@/features/visitpad/unit-catalog';
import {
  visitpadUnitConversionCreateSchema,
  visitpadUnitConversionEditFormSchema,
  type VisitpadUnitConversionCreateSchema,
  type VisitpadUnitConversionEditFormSchema,
} from '@/features/visitpad/validation';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';
import { RequiredLabel } from '@/features/visitpad/components/required-label';
import { nextDisplayOrder } from '@/features/visitpad/lib/next-display-order';

const CONV_UNIT_UNSET = '__unset__';

const CONV_BASE = '/api/v1/master-data/visitpad/unit-conversions';

function formatUnitCodeWithLabel(code: string, labelByCode: Map<string, string>): string {
  const lb = labelByCode.get(code);
  return lb != null && lb.length > 0 ? `${code} - ${lb}` : code;
}

export const Route = createFileRoute('/_authenticated/visitpad/conversions')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/conversions'),
  component: VisitpadConversionsPage,
});

function VisitpadConversionsPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-conversions');
  const { canUpdate, canDelete } = useCatalogModuleCrud(catalogModuleSlug);
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
  const [editing, setEditing] = useState<VisitpadUnitConversion | null>(null);
  const [deleting, setDeleting] = useState<VisitpadUnitConversion | null>(null);
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadConversions(search || undefined, undefined, listPage);
  const { data: unitsRes, isLoading: unitsLoading } = useVisitpadUnits(undefined, undefined, {
    pageIndex: 0,
    pageSize: 200,
  });
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadConversionsGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const create = useVisitpadPost(CONV_BASE);
  const platformImport = useVisitpadPlatformImport('/unit-conversions/import-from-platform');
  const patch = useVisitpadPatch(CONV_BASE);
  const del = useVisitpadDelete(CONV_BASE);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = { active: rows.length, total };
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const conversionKey = useCallback(
    (r: Pick<VisitpadUnitConversion, 'from_unit_code' | 'to_unit_code'>) =>
      `${r.from_unit_code}→${r.to_unit_code}`,
    [],
  );

  const { data: tenantConvKeys, isLoading: tenantConvKeysLoading } = useVisitpadTenantImportKeys(
    '/unit-conversions',
    importOpen && tenantCatalog,
  );
  const importedKeys = useMemo(() => tenantConvKeys ?? new Set<string>(), [tenantConvKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;

  const unitRows = useMemo(() => visitpadActiveUnitRows(unitsRes?.data), [unitsRes?.data]);
  const unitLabelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of unitsRes?.data ?? []) {
      if (!u.is_deleted) m.set(u.code, u.display_name);
    }
    return m;
  }, [unitsRes?.data]);

  const importSearchParts = useCallback(
    (r: VisitpadUnitConversion) => [
      r.from_unit_code,
      r.to_unit_code,
      formatUnitCodeWithLabel(r.from_unit_code, unitLabelByCode),
      formatUnitCodeWithLabel(r.to_unit_code, unitLabelByCode),
      String(r.factor),
    ],
    [unitLabelByCode],
  );

  const importColumns = useMemo(
    () => [
      {
        id: 'from',
        header: 'From',
        cell: (r: VisitpadUnitConversion) => formatUnitCodeWithLabel(r.from_unit_code, unitLabelByCode),
      },
      {
        id: 'to',
        header: 'To',
        cell: (r: VisitpadUnitConversion) => formatUnitCodeWithLabel(r.to_unit_code, unitLabelByCode),
      },
      { id: 'factor', header: 'Factor', cell: (r: VisitpadUnitConversion) => String(r.factor) },
    ],
    [unitLabelByCode],
  );

  const getRowKey = useCallback((r: VisitpadUnitConversion) => conversionKey(r), [conversionKey]);

  const runConversionImport = async (selection: VisitpadUnitConversion[]) => {
    try {
      const res = await platformImport.mutateAsync(selection.map((r) => r.id));
      const { created, skipped, errors } = res.data;
      const failedSuffix = errors.length ? `, ${errors.length} failed` : '';
      toast.success(`${created.length} created, ${skipped.length} skipped${failedSuffix}`);
      if (errors.length) toast.error(errors.map((e) => e.message).join('; '));
      setImportOpen(false);
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    }
  };

  const columns = useMemo<ColumnDef<VisitpadUnitConversion, unknown>[]>(
    () => [
      {
        accessorKey: 'from_unit_code',
        header: 'From',
        meta: { label: 'From' },
        cell: ({ row }) => (
          <span className="text-sm">
            {formatUnitCodeWithLabel(row.original.from_unit_code, unitLabelByCode)}
          </span>
        ),
      },
      {
        accessorKey: 'to_unit_code',
        header: 'To',
        meta: { label: 'To' },
        cell: ({ row }) => (
          <span className="text-sm">
            {formatUnitCodeWithLabel(row.original.to_unit_code, unitLabelByCode)}
          </span>
        ),
      },
      { accessorKey: 'factor', header: 'Factor', meta: { label: 'Factor' } },
      { accessorKey: 'offset_value', header: 'Offset', meta: { label: 'Offset' } },
      { accessorKey: 'display_order', header: 'Order', meta: { label: 'Order' } },
      visitpadActionsColumn<VisitpadUnitConversion>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
        canEdit: canUpdate,
        canDelete,
      }),
    ],
    [busy, unitLabelByCode, canUpdate, canDelete],
  );

  return (
    <VisitpadPageShell
      primary="units"
      breadcrumbLabel="Conversions"
      tabCount={tabCount}
      title="Unit conversions"
      description={
        tenantCatalog
          ? 'Tenant conversion rules: import from the platform library or add local-only mappings.'
          : 'Platform conversion rules: value_to = value_from × factor + offset (additive).'
      }
      secondaryNav={<VisitpadUnitsSecondaryNav />}
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel="Add conversion"
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Formula: <span className="font-mono">value_to = value_from × factor + offset</span>
        </p>
        <MasterDataTableToolbar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPageIndex(0);
          }}
          placeholder="Search from / to (code or label)…"
        />
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyTitle="No conversions found"
            emptyDescription="Adjust your search or add conversion rules in the catalog."
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

      <ImportFromPlatformCatalogDialog<VisitpadUnitConversion>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import conversions from platform library"
        description="Select conversion rules to add to your tenant catalog. Already-imported pairs are disabled."
        searchPlaceholder="Search from / to unit or factor…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        rowKeyHeader="Pair"
        importedKeys={importedKeys}
        importedKeysLoading={tenantConvKeysLoading}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runConversionImport}
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

      <ConversionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        unitRows={unitRows}
        unitsLoading={unitsLoading}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Conversion created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConversionEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        unitRows={unitRows}
        unitsLoading={unitsLoading}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Conversion updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete conversion"
        description={`Remove mapping ${deleting?.from_unit_code ?? ''} → ${deleting?.to_unit_code ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Conversion deleted');
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

function ConversionCreateDialog({
  open,
  onOpenChange,
  nextOrder,
  unitRows,
  unitsLoading,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextOrder: number;
  unitRows: VisitpadUnit[];
  unitsLoading: boolean;
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadUnitConversionCreateSchema>({
    resolver: zodResolver(visitpadUnitConversionCreateSchema),
    defaultValues: {
      from_unit_code: '',
      to_unit_code: '',
      factor: 1,
      offset_value: 0,
      display_order: nextOrder,
    },
  });

  const fromCode = form.watch('from_unit_code');
  const toCode = form.watch('to_unit_code');
  const fromOptions = useMemo(
    () => visitpadConversionUnitSelectOptions(unitRows, fromCode),
    [unitRows, fromCode],
  );
  const toOptions = useMemo(
    () => visitpadConversionUnitSelectOptions(unitRows, toCode),
    [unitRows, toCode],
  );
  const hasCatalogUnits = unitRows.length > 0;

  useEffect(() => {
    if (open) {
      form.reset({ from_unit_code: '', to_unit_code: '', factor: 1, offset_value: 0, display_order: nextOrder });
    }
  }, [open, nextOrder, form]);

  const submit: SubmitHandler<VisitpadUnitConversionCreateSchema> = async (v) => {
    await onSubmit({
      ...v,
      offset_value: v.offset_value ?? 0,
      display_order: v.display_order ?? 0,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add conversion"
      description="Pick from/to from the unit catalog (code — label). Factor and offset follow value_to = value_from × factor + offset. From and to must differ."
      submitLabel="Add conversion"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-c-from">From unit</RequiredLabel>
          {hasCatalogUnits ? (
            <Select
              value={fromCode?.trim() ? fromCode : CONV_UNIT_UNSET}
              onValueChange={(v) =>
                form.setValue('from_unit_code', v === CONV_UNIT_UNSET ? '' : v, { shouldValidate: true })
              }
              disabled={unitsLoading}
            >
              <SelectTrigger id="vp-c-from">
                <SelectValue placeholder={unitsLoading ? 'Loading units…' : 'Select from unit'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CONV_UNIT_UNSET}>Select from unit</SelectItem>
                {fromOptions.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="vp-c-from"
              maxLength={64}
              disabled={unitsLoading}
              placeholder="No units in catalog"
              {...form.register('from_unit_code')}
            />
          )}
          {!hasCatalogUnits && !unitsLoading ? (
            <p className="text-xs text-muted-foreground">Add units under Visitpad → Units first.</p>
          ) : null}
          {form.formState.errors.from_unit_code ? (
            <p className="text-xs text-destructive">{form.formState.errors.from_unit_code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-c-to">To unit</RequiredLabel>
          {hasCatalogUnits ? (
            <Select
              value={toCode?.trim() ? toCode : CONV_UNIT_UNSET}
              onValueChange={(v) =>
                form.setValue('to_unit_code', v === CONV_UNIT_UNSET ? '' : v, { shouldValidate: true })
              }
              disabled={unitsLoading}
            >
              <SelectTrigger id="vp-c-to">
                <SelectValue placeholder={unitsLoading ? 'Loading units…' : 'Select to unit'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CONV_UNIT_UNSET}>Select to unit</SelectItem>
                {toOptions.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input id="vp-c-to" maxLength={64} disabled={unitsLoading} {...form.register('to_unit_code')} />
          )}
          {form.formState.errors.to_unit_code ? (
            <p className="text-xs text-destructive">{form.formState.errors.to_unit_code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-c-factor">Factor</RequiredLabel>
          <Input id="vp-c-factor" type="number" step="any" {...form.register('factor', { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">Default 1 if unchanged.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-c-off">Offset</Label>
          <Input id="vp-c-off" type="number" step="any" {...form.register('offset_value', { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">Optional; defaults to 0.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="vp-c-order">Display order</RequiredLabel>
          <Input id="vp-c-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ConversionEditDialog({
  row,
  open,
  onOpenChange,
  unitRows,
  unitsLoading,
  isSubmitting,
  onSave,
}: {
  row: VisitpadUnitConversion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitRows: VisitpadUnit[];
  unitsLoading: boolean;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadUnitConversionEditFormSchema>({
    resolver: zodResolver(visitpadUnitConversionEditFormSchema),
    defaultValues: {
      from_unit_code: '',
      to_unit_code: '',
      factor: 1,
      offset_value: 0,
      display_order: 0,
    },
  });

  const fromCode = form.watch('from_unit_code');
  const toCode = form.watch('to_unit_code');
  const fromOptions = useMemo(
    () => visitpadConversionUnitSelectOptions(unitRows, fromCode),
    [unitRows, fromCode],
  );
  const toOptions = useMemo(
    () => visitpadConversionUnitSelectOptions(unitRows, toCode),
    [unitRows, toCode],
  );
  const hasCatalogUnits = unitRows.length > 0;

  useEffect(() => {
    if (open && row) {
      form.reset({
        from_unit_code: row.from_unit_code,
        to_unit_code: row.to_unit_code,
        factor: row.factor,
        offset_value: row.offset_value,
        display_order: row.display_order,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadUnitConversionEditFormSchema> = async (v) => {
    await onSave({
      from_unit_code: v.from_unit_code,
      to_unit_code: v.to_unit_code,
      factor: v.factor,
      offset_value: v.offset_value,
      display_order: v.display_order,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit conversion"
      description="Adjust from/to (catalog), factor, offset, or display order."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-ce-from">From unit</RequiredLabel>
            {hasCatalogUnits ? (
              <Select
                value={fromCode || undefined}
                onValueChange={(v) => form.setValue('from_unit_code', v, { shouldValidate: true })}
                disabled={unitsLoading}
              >
                <SelectTrigger id="vp-ce-from">
                  <SelectValue placeholder={unitsLoading ? 'Loading units…' : 'Select…'} />
                </SelectTrigger>
                <SelectContent>
                  {fromOptions.map((o) => (
                    <SelectItem key={o.code} value={o.code}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="vp-ce-from" maxLength={64} {...form.register('from_unit_code')} disabled={unitsLoading} />
            )}
            {form.formState.errors.from_unit_code ? (
              <p className="text-xs text-destructive">{form.formState.errors.from_unit_code.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-ce-to">To unit</RequiredLabel>
            {hasCatalogUnits ? (
              <Select
                value={toCode || undefined}
                onValueChange={(v) => form.setValue('to_unit_code', v, { shouldValidate: true })}
                disabled={unitsLoading}
              >
                <SelectTrigger id="vp-ce-to">
                  <SelectValue placeholder={unitsLoading ? 'Loading units…' : 'Select…'} />
                </SelectTrigger>
                <SelectContent>
                  {toOptions.map((o) => (
                    <SelectItem key={o.code} value={o.code}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="vp-ce-to" maxLength={64} {...form.register('to_unit_code')} disabled={unitsLoading} />
            )}
            {form.formState.errors.to_unit_code ? (
              <p className="text-xs text-destructive">{form.formState.errors.to_unit_code.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-ce-factor">Factor</RequiredLabel>
            <Input id="vp-ce-factor" type="number" step="any" {...form.register('factor', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ce-off">Offset</Label>
            <Input id="vp-ce-off" type="number" step="any" {...form.register('offset_value', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredLabel htmlFor="vp-ce-order">Display order</RequiredLabel>
            <Input id="vp-ce-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
