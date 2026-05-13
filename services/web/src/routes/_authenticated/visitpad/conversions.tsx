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
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  useVisitpadConversions,
  useVisitpadConversionsGlobalLibrary,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPost,
  useVisitpadUnits,
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
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';
import { visitpadGlobalUnitConversionToCreateBody } from '@/features/visitpad/lib/visitpad-global-import-payloads';

const CONV_BASE = '/api/v1/master-data/visitpad/unit-conversions';

function formatUnitCodeWithLabel(code: string, labelByCode: Map<string, string>): string {
  const lb = labelByCode.get(code);
  return lb != null && lb.length > 0 ? `${code} - ${lb}` : code;
}

export const Route = createFileRoute('/_authenticated/visitpad/conversions')({
  component: VisitpadConversionsPage,
});

function VisitpadConversionsPage() {
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [editing, setEditing] = useState<VisitpadUnitConversion | null>(null);
  const [deleting, setDeleting] = useState<VisitpadUnitConversion | null>(null);
  const { data, isLoading, error } = useVisitpadConversions(search || undefined);
  const { data: unitsRes, isLoading: unitsLoading } = useVisitpadUnits();
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadConversionsGlobalLibrary(importOpen);
  const create = useVisitpadPost(CONV_BASE);
  const patch = useVisitpadPatch(CONV_BASE);
  const del = useVisitpadDelete(CONV_BASE);
  const rows = data?.data ?? [];
  const tabCount = { active: rows.length, total: data?.total ?? rows.length };
  const busy = patch.isPending || del.isPending || importBusy;

  const conversionKey = useCallback(
    (r: Pick<VisitpadUnitConversion, 'from_unit_code' | 'to_unit_code'>) =>
      `${r.from_unit_code}→${r.to_unit_code}`,
    [],
  );

  const importedKeys = useMemo(() => new Set(rows.map((r) => conversionKey(r))), [rows, conversionKey]);
  const globalRows = globalLib?.data ?? [];

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
    setImportBusy(true);
    try {
      for (const row of selection) {
        await create.mutateAsync(visitpadGlobalUnitConversionToCreateBody(row));
      }
      toast.success(
        selection.length === 1 ? 'Imported 1 conversion' : `Imported ${selection.length} conversions`,
      );
      setImportOpen(false);
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    } finally {
      setImportBusy(false);
    }
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        rowMatchesSearch(
          search,
          r.from_unit_code,
          r.to_unit_code,
          formatUnitCodeWithLabel(r.from_unit_code, unitLabelByCode),
          formatUnitCodeWithLabel(r.to_unit_code, unitLabelByCode),
          String(r.factor),
        ),
      ),
    [rows, search, unitLabelByCode],
  );

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
      }),
    ],
    [busy, unitLabelByCode],
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
          addLabel={tenantCatalog ? 'Add local conversion' : 'Add conversion'}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={importBusy}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Formula: <span className="font-mono">value_to = value_from × factor + offset</span>
        </p>
        <MasterDataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search from / to (code or label)…"
        />
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            emptyTitle="No conversions found"
            emptyDescription="Adjust your search or add conversion rules in the catalog."
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
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={importBusy || create.isPending}
        onImportRows={runConversionImport}
      />

      <ConversionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
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
  unitRows,
  unitsLoading,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    if (!open) {
      form.reset({ from_unit_code: '', to_unit_code: '', factor: 1, offset_value: 0, display_order: 0 });
    }
  }, [open, form]);

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
          <Label htmlFor="vp-c-from">From unit *</Label>
          {hasCatalogUnits ? (
            <Select
              value={fromCode || undefined}
              onValueChange={(v) => form.setValue('from_unit_code', v, { shouldValidate: true })}
              disabled={unitsLoading}
            >
              <SelectTrigger id="vp-c-from">
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
          <Label htmlFor="vp-c-to">To unit *</Label>
          {hasCatalogUnits ? (
            <Select
              value={toCode || undefined}
              onValueChange={(v) => form.setValue('to_unit_code', v, { shouldValidate: true })}
              disabled={unitsLoading}
            >
              <SelectTrigger id="vp-c-to">
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
            <Input id="vp-c-to" maxLength={64} disabled={unitsLoading} {...form.register('to_unit_code')} />
          )}
          {form.formState.errors.to_unit_code ? (
            <p className="text-xs text-destructive">{form.formState.errors.to_unit_code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-c-factor">Factor *</Label>
          <Input id="vp-c-factor" type="number" step="any" {...form.register('factor', { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">Stored as sent (including 0). Default in this form is 1.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-c-off">Offset *</Label>
          <Input id="vp-c-off" type="number" step="any" {...form.register('offset_value', { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">Sent as offset_value on the API.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-c-order">Display order *</Label>
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
            <Label htmlFor="vp-ce-from">From unit *</Label>
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
            <Label htmlFor="vp-ce-to">To unit *</Label>
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
            <Label htmlFor="vp-ce-factor">Factor *</Label>
            <Input id="vp-ce-factor" type="number" step="any" {...form.register('factor', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-ce-off">Offset *</Label>
            <Input id="vp-ce-off" type="number" step="any" {...form.register('offset_value', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-order">Display order *</Label>
            <Input id="vp-ce-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
