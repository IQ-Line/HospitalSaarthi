import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Switch } from '@pulse/ui/switch';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadDelete,
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
import { useVisitpadCatalogPermission } from '@/features/visitpad/hooks/use-visitpad-catalog-permission';
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
  component: VisitpadRxColumnsPage,
});

function VisitpadRxColumnsPage() {
  const { canWrite, canRead } = useVisitpadCatalogPermission();
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string>(RX_SECTIONS[0].value);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [libPageIndex, setLibPageIndex] = useState(0);
  const libPageSize = 50;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(VISITPAD_CATALOG_DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<VisitpadRxColumn | null>(null);
  const [deleting, setDeleting] = useState<VisitpadRxColumn | null>(null);
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
  );
  const patch = useVisitpadPatch(RX_BASE);
  const del = useVisitpadDelete(RX_BASE);
  const create = useVisitpadPost(RX_BASE);
  const platformImport = useVisitpadRxColumnsPlatformImport(section);
  const { data: tenantRxKeys } = useVisitpadTenantImportKeys(
    '/rx-columns',
    importOpen && tenantCatalog,
    'section::code',
    (row) => `${String(row.section)}::${String(row.code)}`,
    { section },
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const sectionLabel = sectionLabelFor(section);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

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
    if (importOpen) setLibPageIndex(0);
  }, [importOpen]);

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
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending || !canWrite}
            onCheckedChange={async (next) => {
              try {
                await patch.mutateAsync({ id: row.original.id, body: { is_active: next } });
                toast.success(next ? 'Enabled' : 'Disabled');
              } catch (e) {
                toast.error(mutationErrorMessage(e));
              }
            }}
          />
        ),
      },
      visitpadActionsColumn<VisitpadRxColumn>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy || !canWrite,
      }),
    ],
    [patch, busy, canWrite],
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
          canWrite={canWrite}
          canRead={canRead}
          addLabel={tenantCatalog ? `Add local ${sectionLabel}` : `Add ${sectionLabel}`}
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
      />

      <RxColumnCreateDialog
        section={section}
        sectionLabel={sectionLabel}
        open={createOpen}
        onOpenChange={setCreateOpen}
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

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Rx column"
        description={`Remove “${deleting?.display_name ?? deleting?.code ?? ''}” from this catalog?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Rx column deleted');
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

function RxColumnCreateDialog({
  section,
  sectionLabel,
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: {
  section: string;
  sectionLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadRxColumnCreateFormSchema>({
    resolver: zodResolver(visitpadRxColumnCreateFormSchema),
    defaultValues: { display_name: '', code: '', is_active: true },
  });

  useEffect(() => {
    if (open) {
      form.reset({ display_name: '', code: '', is_active: true });
    }
  }, [open, section, form]);

  const submit: SubmitHandler<VisitpadRxColumnCreateFormSchema> = async (v) => {
    await onSubmit({
      section,
      display_name: v.display_name,
      code: v.code,
      extra_unit: null,
      display_order: 0,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Add ${sectionLabel}`}
      description="Picklist value for visit forms."
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="vp-rx-name">Display name</Label>
          <Input id="vp-rx-name" maxLength={256} {...form.register('display_name')} />
          <p className="text-sm text-muted-foreground">Name shown in visit forms.</p>
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-rx-code">Code</Label>
          <Input
            id="vp-rx-code"
            maxLength={8}
            placeholder="e.g. bid_qd"
            className="font-mono"
            {...form.register('code')}
          />
          <p className="text-sm text-muted-foreground">
            Code must be 2–8 characters, letters, digits, or underscores; unique within this section; cannot be
            changed after save.
          </p>
          {form.formState.errors.code ? (
            <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="vp-rx-act">Active</Label>
            <p className="text-sm text-muted-foreground">Inactive items stay hidden from new visits.</p>
          </div>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Switch id="vp-rx-act" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function RxColumnEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadRxColumn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
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
            <Label htmlFor="vp-rxe-name">Display name</Label>
            <Input id="vp-rxe-name" maxLength={256} {...form.register('display_name')} />
            <p className="text-sm text-muted-foreground">Name shown in visit forms.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-rxe-extra">Extra unit (optional)</Label>
            <Input id="vp-rxe-extra" maxLength={128} {...form.register('extra_unit')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-rxe-order">Display order</Label>
            <Input id="vp-rxe-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="vp-rxe-act">Active</Label>
              <p className="text-sm text-muted-foreground">Inactive items stay hidden from new visits.</p>
            </div>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Switch id="vp-rxe-act" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
