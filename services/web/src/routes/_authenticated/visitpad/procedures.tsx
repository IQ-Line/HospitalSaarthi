import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
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
import { Switch } from '@pulse/ui/switch';
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
  useVisitpadProcedures,
  useVisitpadProceduresGlobalLibrary,
  useVisitpadTenantImportKeys,
  VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
  VISITPAD_CATALOG_PAGE_SIZES,
} from '@/features/visitpad/api';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import {
  VISITPAD_PROCEDURE_BILLING_CATEGORIES,
  VISITPAD_PROCEDURE_CATEGORIES,
} from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadProcedure } from '@/features/visitpad/types';
import {
  visitpadProcedureCreateFormSchema,
  visitpadProcedureEditFormSchema,
  type VisitpadProcedureCreateFormInput,
  type VisitpadProcedureCreateFormSchema,
  type VisitpadProcedureEditFormInput,
  type VisitpadProcedureEditFormSchema,
} from '@/features/visitpad/validation';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const PROC_BASE = '/api/v1/master-data/visitpad/procedures';

const PROC_CATEGORY_UNSET = '__unset__';
const PROC_BILLING_UNSET = '__unset__';

const PROC_CATEGORY_VALUES = new Set(VISITPAD_PROCEDURE_CATEGORIES.map((c) => c.value));
const PROC_BILLING_VALUES = new Set(VISITPAD_PROCEDURE_BILLING_CATEGORIES.map((c) => c.value));

function emptyProcedureCreateForm(displayOrder: number): VisitpadProcedureCreateFormInput {
  return {
    cpt_code: '',
    short_name: '',
    official_descriptor: '',
    display_name: '',
    category: undefined,
    billing_category: undefined,
    duration_minutes: undefined,
    requires_consent: false,
    type_modality: null,
    snomed_code: null,
    display_order: displayOrder,
    is_active: true,
  };
}

function procedureEditDefaults(row: VisitpadProcedure): VisitpadProcedureEditFormInput {
  const cat = PROC_CATEGORY_VALUES.has(row.category)
    ? (row.category as VisitpadProcedureEditFormInput['category'])
    : 'other';
  const bill = PROC_BILLING_VALUES.has(row.billing_category)
    ? (row.billing_category as VisitpadProcedureEditFormInput['billing_category'])
    : 'other';
  return {
    short_name: row.short_name ?? '',
    display_name: row.display_name,
    official_descriptor: row.official_descriptor ?? '',
    category: cat,
    billing_category: bill,
    duration_minutes: row.duration_minutes ?? 0,
    requires_consent: !!row.requires_consent,
    snomed_code: row.snomed_code ?? null,
    type_modality: row.type_modality ?? null,
    display_order: row.display_order,
    is_active: row.is_active,
  };
}

export const Route = createFileRoute('/_authenticated/visitpad/procedures')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/procedures'),
  component: VisitpadProceduresPage,
});

function VisitpadProceduresPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-procedures');
  const { canUpdate, canDelete, canMutate } = useCatalogModuleCrud(catalogModuleSlug);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [billing, setBilling] = useState<string>('all');
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
  const [editing, setEditing] = useState<VisitpadProcedure | null>(null);
  const [deleting, setDeleting] = useState<VisitpadProcedure | null>(null);
  const cat = category === 'all' ? undefined : category;
  const bill = billing === 'all' ? undefined : billing;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadProcedures(search || undefined, cat, bill, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadProceduresGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(PROC_BASE);
  const del = useVisitpadDelete(PROC_BASE);
  const create = useVisitpadPost(PROC_BASE);
  const platformImport = useVisitpadPlatformImport('/procedures/import-from-platform');
  const { data: tenantCptKeys } = useVisitpadTenantImportKeys('/procedures', importOpen && tenantCatalog);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantCptKeys ?? new Set<string>(), [tenantCptKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadProcedure) => r.cpt_code, []);

  const importSearchParts = useCallback(
    (r: VisitpadProcedure) => [
      r.cpt_code,
      r.short_name ?? '',
      r.display_name,
      r.official_descriptor ?? '',
    ],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Display name', cell: (r: VisitpadProcedure) => r.display_name },
      { id: 'cat', header: 'Category', cell: (r: VisitpadProcedure) => r.category },
    ],
    [],
  );

  const activeToggle = useCatalogActiveToggleConfirm({
    disabled: patch.isPending || !canUpdate,
    onConfirm: async (id, next) => {
      try {
        await patch.mutateAsync({ id, body: { is_active: next } });
        toast.success(next ? 'Procedure enabled' : 'Procedure disabled');
      } catch (e) {
        toast.error(mutationErrorMessage(e));
      }
    },
  });

  const runProcedureImport = async (selection: VisitpadProcedure[]) => {
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

  const columns = useMemo<ColumnDef<VisitpadProcedure, unknown>[]>(
    () => [
      { accessorKey: 'cpt_code', header: 'Code', meta: { label: 'Code' } },
      {
        accessorKey: 'short_name',
        header: 'Short name',
        meta: { label: 'Short name' },
        cell: ({ row }) => row.original.short_name || <span className="text-muted-foreground">—</span>,
      },
      { accessorKey: 'display_name', header: 'Display name', meta: { label: 'Display name' } },
      {
        accessorKey: 'duration_minutes',
        header: 'Duration',
        meta: { label: 'Duration (min)' },
        cell: ({ row }) => row.original.duration_minutes ?? '—',
      },
      {
        id: 'consent',
        header: 'Consent',
        meta: { label: 'Consent' },
        cell: ({ row }) => (row.original.requires_consent ? 'Yes' : '—'),
      },
      {
        accessorKey: 'is_active',
        header: 'Enabled',
        meta: { label: 'Enabled' },
        cell: ({ row }) =>
          activeToggle.renderToggle({
            id: row.original.id,
            displayName: row.original.display_name || row.original.cpt_code,
            isActive: row.original.is_active,
          }),
      },
      visitpadActionsColumn<VisitpadProcedure>({
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
      primary="procedures"
      tabCount={tabCount}
      title="Procedures"
      description={
        tenantCatalog
          ? 'Tenant procedure library: import from the platform library or add local-only CPT rows.'
          : 'Platform procedure library for Visitpad (catalog code is stored as cpt_code in the API).'
      }
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel={tenantCatalog ? 'Add local procedure' : 'Add procedure'}
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search code, short name, display name…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_PROCEDURE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billing} onValueChange={setBilling}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="All billing types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All billing types</SelectItem>
                {VISITPAD_PROCEDURE_BILLING_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
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
            data={rows}
            isLoading={isLoading}
            emptyTitle="No procedures found"
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

      <ImportFromPlatformCatalogDialog<VisitpadProcedure>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import procedures from platform library"
        description="Select procedures to add to your tenant catalog. Already-imported CPT codes are disabled."
        searchPlaceholder="Search CPT, display name, descriptor…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        rowKeyHeader="CPT"
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runProcedureImport}
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

      <ProcedureCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Procedure created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ProcedureEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Procedure updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete procedure"
        description={`Soft-delete ${deleting?.cpt_code ?? ''} — ${deleting?.display_name ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Procedure deleted');
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

function ProcedureCreateDialog({
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
  const form = useForm<VisitpadProcedureCreateFormInput>({
    resolver: zodResolver(visitpadProcedureCreateFormSchema),
    defaultValues: emptyProcedureCreateForm(nextOrder),
  });

  useEffect(() => {
    if (open) {
      form.reset(emptyProcedureCreateForm(nextOrder));
    }
  }, [open, nextOrder, form]);

  const submit: SubmitHandler<VisitpadProcedureCreateFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    const mod = v.type_modality?.trim();
    const shortRaw = v.short_name?.trim();
    await onSubmit({
      cpt_code: v.cpt_code,
      short_name: shortRaw && shortRaw.length > 0 ? shortRaw : null,
      official_descriptor: v.official_descriptor,
      display_name: v.display_name,
      category: v.category,
      billing_category: v.billing_category,
      duration_minutes: v.duration_minutes,
      requires_consent: v.requires_consent,
      type_modality: mod && mod.length > 0 ? mod : null,
      display_order: v.display_order,
      is_active: v.is_active,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add procedure"
      description="Fields match the Visitpad procedures API (snake_case). Catalog code is stored as cpt_code."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="vp-pr-code">Procedure code</RequiredLabel>
          <Input
            id="vp-pr-code"
            placeholder="e.g. ecg_12"
            maxLength={9}
            className="font-mono"
            {...form.register('cpt_code')}
          />
          <p className="text-sm text-muted-foreground">{VISITPAD_CODE_HELPER_TEXT}</p>
          {form.formState.errors.cpt_code ? (
            <p className="text-sm text-destructive">{form.formState.errors.cpt_code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-short">Short name</Label>
          <Input id="vp-pr-short" placeholder="e.g. 93000" maxLength={64} {...form.register('short_name')} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-dur">Duration (minutes)</Label>
          <Input
            id="vp-pr-dur"
            type="number"
            min={0}
            max={1440}
            {...form.register('duration_minutes', {
              setValueAs: (v) => {
                if (v === '' || v === null || v === undefined) return undefined;
                const n = typeof v === 'number' ? v : Number(v);
                return Number.isFinite(n) ? Math.trunc(n) : undefined;
              },
            })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-off">Official descriptor</Label>
          <Input
            id="vp-pr-off"
            placeholder="Full clinical description of the procedure"
            maxLength={512}
            {...form.register('official_descriptor')}
          />
          {form.formState.errors.official_descriptor ? (
            <p className="text-sm text-destructive">{form.formState.errors.official_descriptor.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="vp-pr-disp">Display name</RequiredLabel>
          <Input
            id="vp-pr-disp"
            placeholder="Friendly name shown to staff"
            maxLength={512}
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-pr-order">Display order</RequiredLabel>
          <Input
            id="vp-pr-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
          {form.formState.errors.display_order ? (
            <p className="text-sm text-destructive">{form.formState.errors.display_order.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Category</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value ?? PROC_CATEGORY_UNSET}
                onValueChange={(v) =>
                  field.onChange(v === PROC_CATEGORY_UNSET ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROC_CATEGORY_UNSET}>Select category…</SelectItem>
                  {VISITPAD_PROCEDURE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Billing category</Label>
          <Controller
            control={form.control}
            name="billing_category"
            render={({ field }) => (
              <Select
                value={field.value ?? PROC_BILLING_UNSET}
                onValueChange={(v) =>
                  field.onChange(v === PROC_BILLING_UNSET ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select billing category…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROC_BILLING_UNSET}>Select billing category…</SelectItem>
                  {VISITPAD_PROCEDURE_BILLING_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-mod">Type / modality</Label>
          <Input id="vp-pr-mod" placeholder="Modality or type" maxLength={128} {...form.register('type_modality')} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-pr-snomed">SNOMED CT (procedure)</Label>
          <Input
            id="vp-pr-snomed"
            maxLength={64}
            placeholder="Concept ID or code"
            {...form.register('snomed_code')}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="vp-pr-consent">Requires patient consent</Label>
            <Controller
              control={form.control}
              name="requires_consent"
              render={({ field }) => (
                <Switch id="vp-pr-consent" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            A consent stage is triggered before the procedure can be started.
          </p>
        </div>
        <div className="sm:col-span-2">
          <CatalogActiveSwitch
            id="vp-pr-act"
            checked={!!form.watch('is_active')}
            onCheckedChange={(c) => form.setValue('is_active', c)}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ProcedureEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadProcedure | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadProcedureEditFormInput>({
    resolver: zodResolver(visitpadProcedureEditFormSchema),
    defaultValues: procedureEditDefaults({
      id: '',
      iq_tenant_id: null,
      cpt_code: '',
      short_name: '',
      display_name: '',
      official_descriptor: '',
      category: 'diagnostic',
      billing_category: 'professional',
      duration_minutes: 0,
      requires_consent: false,
      type_modality: null,
      snomed_code: null,
      display_order: 0,
      is_active: true,
      is_deleted: false,
      created_at: '',
      updated_at: '',
    }),
  });

  useEffect(() => {
    if (open && row) {
      form.reset(procedureEditDefaults(row));
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadProcedureEditFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    const mod = v.type_modality?.trim();
    const shortRaw = v.short_name?.trim();
    await onSave({
      short_name: shortRaw && shortRaw.length > 0 ? shortRaw : null,
      display_name: v.display_name,
      official_descriptor: v.official_descriptor,
      category: v.category,
      billing_category: v.billing_category,
      duration_minutes: v.duration_minutes,
      requires_consent: v.requires_consent,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      type_modality: mod && mod.length > 0 ? mod : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit procedure — ${row.cpt_code}` : 'Edit procedure'}
      description="Catalog code is read-only. Other fields map to the procedures API."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Procedure code</Label>
            <Input readOnly disabled className="font-mono" value={row.cpt_code} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-short">Short name</Label>
            <Input id="vp-pe-short" maxLength={64} {...form.register('short_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vp-pe-dur">Duration (minutes)</Label>
            <Input
              id="vp-pe-dur"
              type="number"
              min={0}
              max={1440}
              {...form.register('duration_minutes', {
                setValueAs: (v) => {
                  if (v === '' || v === null || v === undefined) return undefined;
                  const n = typeof v === 'number' ? v : Number(v);
                  return Number.isFinite(n) ? Math.trunc(n) : undefined;
                },
              })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-off">Official descriptor</Label>
            <Input id="vp-pe-off" maxLength={512} {...form.register('official_descriptor')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredLabel htmlFor="vp-pe-disp">Display name</RequiredLabel>
            <Input id="vp-pe-disp" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredLabel htmlFor="vp-pe-order">Display order</RequiredLabel>
            <Input
              id="vp-pe-order"
              type="number"
              {...form.register('display_order', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(x) => form.setValue('category', x as VisitpadProcedureEditFormSchema['category'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_PROCEDURE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Billing category</Label>
            <Select
              value={form.watch('billing_category')}
              onValueChange={(x) =>
                form.setValue('billing_category', x as VisitpadProcedureEditFormSchema['billing_category'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISITPAD_PROCEDURE_BILLING_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-mod">Type / modality</Label>
            <Input id="vp-pe-mod" maxLength={128} {...form.register('type_modality')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-pe-snomed">SNOMED CT (procedure)</Label>
            <Input id="vp-pe-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="vp-pe-consent">Requires patient consent</Label>
              <Switch
                id="vp-pe-consent"
                checked={!!form.watch('requires_consent')}
                onCheckedChange={(c) => form.setValue('requires_consent', c)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              A consent stage is triggered before the procedure can be started.
            </p>
          </div>
          <div className="sm:col-span-2">
            <CatalogActiveSwitch
              id="vp-pe-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
