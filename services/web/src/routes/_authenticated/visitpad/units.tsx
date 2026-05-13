import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Switch } from '@pulse/ui/switch';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import { useVisitpadDelete, useVisitpadPatch, useVisitpadPost, useVisitpadUnits, useVisitpadUnitsGlobalLibrary } from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import { VisitpadUnitsSecondaryNav } from '@/features/visitpad/components/visitpad-secondary-link-row';
import { VISITPAD_UNIT_DIMENSIONS } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadUnit } from '@/features/visitpad/types';
import {
  visitpadUnitCreateSchema,
  visitpadUnitEditFormSchema,
  type VisitpadUnitCreateSchema,
  type VisitpadUnitEditFormSchema,
} from '@/features/visitpad/validation';
import { useVisitpadCatalogPermission } from '@/features/visitpad/hooks/use-visitpad-catalog-permission';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';
import { visitpadGlobalUnitToCreateBody } from '@/features/visitpad/lib/visitpad-global-import-payloads';

const UNITS_BASE = '/api/v1/master-data/visitpad/units';

export const Route = createFileRoute('/_authenticated/visitpad/units')({
  component: VisitpadUnitsPage,
});

function VisitpadUnitsPage() {
  const { canWrite, canRead } = useVisitpadCatalogPermission();
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [dimension, setDimension] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [editing, setEditing] = useState<VisitpadUnit | null>(null);
  const [deleting, setDeleting] = useState<VisitpadUnit | null>(null);
  const dimParam = dimension === 'all' ? undefined : dimension;
  const { data, isLoading, error } = useVisitpadUnits(search || undefined, dimParam);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadUnitsGlobalLibrary(importOpen);
  const patch = useVisitpadPatch(UNITS_BASE);
  const del = useVisitpadDelete(UNITS_BASE);
  const create = useVisitpadPost(UNITS_BASE);
  const rows = data?.data ?? [];
  const tabCount = visitpadActiveTotal(rows, data?.total);
  const busy = patch.isPending || del.isPending || importBusy;

  const importedKeys = useMemo(() => new Set(rows.map((r) => r.code)), [rows]);
  const globalRows = globalLib?.data ?? [];

  const importSearchParts = useCallback(
    (r: VisitpadUnit) => [r.code, r.display_name, r.dimension, r.ucum_code ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'label', header: 'Label', cell: (r: VisitpadUnit) => r.display_name },
      { id: 'dim', header: 'Dimension', cell: (r: VisitpadUnit) => r.dimension },
    ],
    [],
  );

  const getRowKey = useCallback((r: VisitpadUnit) => r.code, []);

  const runUnitImport = async (selection: VisitpadUnit[]) => {
    setImportBusy(true);
    try {
      for (const row of selection) {
        await create.mutateAsync(visitpadGlobalUnitToCreateBody(row));
      }
      toast.success(selection.length === 1 ? 'Imported 1 unit' : `Imported ${selection.length} units`);
      setImportOpen(false);
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    } finally {
      setImportBusy(false);
    }
  };

  const filtered = useMemo(
    () =>
      rows.filter((u) =>
        rowMatchesSearch(search, u.code, u.display_name, u.dimension, u.ucum_code ?? ''),
      ),
    [rows, search],
  );

  const columns = useMemo<ColumnDef<VisitpadUnit, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Label', meta: { label: 'Label' } },
      {
        accessorKey: 'dimension',
        header: 'Dimension',
        meta: { label: 'Dimension' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'is_canonical',
        header: 'Canonical',
        meta: { label: 'Canonical' },
        cell: ({ getValue }) =>
          getValue<boolean>() ? <span>Yes</span> : <span className="text-muted-foreground">—</span>,
      },
      { accessorKey: 'display_order', header: 'Order', meta: { label: 'Order' } },
      {
        accessorKey: 'is_active',
        header: 'Enabled',
        meta: { label: 'Enabled' },
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending || !canWrite}
            onCheckedChange={async (next) => {
              try {
                await patch.mutateAsync({ id: row.original.id, body: { is_active: next } });
                toast.success(next ? 'Unit enabled' : 'Unit disabled');
              } catch (e) {
                toast.error(mutationErrorMessage(e));
              }
            }}
          />
        ),
      },
      visitpadActionsColumn<VisitpadUnit>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy || !canWrite,
      }),
    ],
    [patch, busy, canWrite],
  );

  return (
    <VisitpadPageShell
      primary="units"
      breadcrumbLabel="Units"
      tabCount={tabCount}
      title="Units"
      description={
        tenantCatalog
          ? 'Tenant unit catalog: import from the platform library or add local-only units.'
          : 'Platform unit definitions (dimensions, UCUM, canonical flags).'
      }
      secondaryNav={<VisitpadUnitsSecondaryNav />}
      actions={
        <VisitpadHeaderActions
          canWrite={canWrite}
          canRead={canRead}
          addLabel={tenantCatalog ? 'Add local unit' : 'Add unit'}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={importBusy}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search code, label, UCUM…"
            />
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label="Dimension filter">
                <SelectValue placeholder="All dimensions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dimensions</SelectItem>
                {VISITPAD_UNIT_DIMENSIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <DataTable
            showColumnMenu
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            emptyTitle="No units found"
            emptyDescription="Ensure master-data is running and you are authorized, or adjust your search."
          />
        )}
      </div>

      <UnitCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Unit created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ImportFromPlatformCatalogDialog<VisitpadUnit>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import units from platform library"
        description="Select units to add to your tenant catalog. Already-imported rows are disabled."
        searchPlaceholder="Search code, label, dimension…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={importBusy || create.isPending}
        onImportRows={runUnitImport}
      />

      <UnitEditDialog
        unit={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Unit updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete unit"
        description={`Soft-delete unit “${deleting?.code ?? ''}”? It will be removed from pickers but retained for audit.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Unit deleted');
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

function UnitCreateDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadUnitCreateSchema>({
    resolver: zodResolver(visitpadUnitCreateSchema),
    defaultValues: {
      code: '',
      display_name: '',
      dimension: 'length',
      ucum_code: null,
      is_canonical: false,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        code: '',
        display_name: '',
        dimension: 'length',
        ucum_code: null,
        is_canonical: false,
        display_order: 0,
        is_active: true,
      });
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadUnitCreateSchema> = async (values) => {
    const ucum = values.ucum_code?.trim();
    await onSubmit({
      ...values,
      ucum_code: ucum && ucum.length > 0 ? ucum : null,
      display_order: values.display_order ?? 0,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add unit"
      description="Create a platform unit definition. Codes must be unique per tenant."
      submitLabel="Create unit"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-unit-code">Code (required)</Label>
          <Input id="vp-unit-code" maxLength={64} autoComplete="off" {...form.register('code')} />
          <p className="text-xs text-muted-foreground">
            Lowercased on save; 1–64 characters; unique among active units (immutable after create).
          </p>
          {form.formState.errors.code ? (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-unit-label">Display label (required)</Label>
          <Input id="vp-unit-label" maxLength={256} {...form.register('display_name')} />
          {form.formState.errors.display_name ? (
            <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-unit-dimension">Dimension (required)</Label>
          <Select
            value={form.watch('dimension')}
            onValueChange={(v) => form.setValue('dimension', v as VisitpadUnitCreateSchema['dimension'])}
          >
            <SelectTrigger id="vp-unit-dimension">
              <SelectValue placeholder="Select dimension" />
            </SelectTrigger>
            <SelectContent>
              {VISITPAD_UNIT_DIMENSIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-unit-ucum">UCUM code (optional)</Label>
          <Input id="vp-unit-ucum" maxLength={64} {...form.register('ucum_code')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-unit-order">Display order (required)</Label>
          <Input id="vp-unit-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
          <div className="space-y-0.5">
            <Label htmlFor="vp-unit-canonical">Canonical for dimension</Label>
            <p className="text-xs text-muted-foreground">Mark as the preferred base unit when applicable.</p>
          </div>
          <Switch
            id="vp-unit-canonical"
            checked={!!form.watch('is_canonical')}
            onCheckedChange={(c) => form.setValue('is_canonical', c)}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
          <div className="space-y-0.5">
            <Label htmlFor="vp-unit-active">Enabled</Label>
            <p className="text-xs text-muted-foreground">Inactive units stay in the catalog but are hidden from pickers.</p>
          </div>
          <Switch
            id="vp-unit-active"
            checked={!!form.watch('is_active')}
            onCheckedChange={(c) => form.setValue('is_active', c)}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function UnitEditDialog({
  unit,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  unit: VisitpadUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadUnitEditFormSchema>({
    resolver: zodResolver(visitpadUnitEditFormSchema),
    defaultValues: {
      display_name: '',
      dimension: 'length',
      ucum_code: '',
      is_canonical: false,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && unit) {
      form.reset({
        display_name: unit.display_name,
        dimension: unit.dimension as VisitpadUnitEditFormSchema['dimension'],
        ucum_code: unit.ucum_code ?? '',
        is_canonical: unit.is_canonical,
        display_order: unit.display_order,
        is_active: unit.is_active,
      });
    }
  }, [open, unit, form]);

  const submit: SubmitHandler<VisitpadUnitEditFormSchema> = async (values) => {
    const ucum = values.ucum_code?.trim();
    await onSave({
      display_name: values.display_name,
      dimension: values.dimension,
      ucum_code: ucum && ucum.length > 0 ? ucum : null,
      is_canonical: values.is_canonical,
      display_order: values.display_order,
      is_active: values.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={unit ? `Edit unit — ${unit.code}` : 'Edit unit'}
      description="Unit code is immutable. Update label, dimension, UCUM, and flags."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {unit ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Code (read-only)</Label>
            <Input value={unit.code} readOnly className="bg-muted" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-unit-edit-label">Display label</Label>
            <Input id="vp-unit-edit-label" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Dimension</Label>
            <Select
              value={form.watch('dimension')}
              onValueChange={(v) => form.setValue('dimension', v as VisitpadUnitEditFormSchema['dimension'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_UNIT_DIMENSIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-unit-edit-ucum">UCUM code</Label>
            <Input id="vp-unit-edit-ucum" maxLength={64} {...form.register('ucum_code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-unit-edit-order">Display order</Label>
            <Input id="vp-unit-edit-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-unit-edit-canonical">Canonical</Label>
            <Switch
              id="vp-unit-edit-canonical"
              checked={!!form.watch('is_canonical')}
              onCheckedChange={(c) => form.setValue('is_canonical', c)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-unit-edit-active">Enabled</Label>
            <Switch
              id="vp-unit-edit-active"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
