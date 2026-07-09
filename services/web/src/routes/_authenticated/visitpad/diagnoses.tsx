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
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { CatalogActiveSwitch } from '@/features/visitpad/components/catalog-active-switch';
import { FormToggleRow } from '@/features/visitpad/components/form-toggle-row';
import { RequiredLabel, VISITPAD_CODE_HELPER_TEXT } from '@/features/visitpad/components/required-label';
import { useCatalogActiveToggleConfirm } from '@/features/visitpad/hooks/use-catalog-active-toggle-confirm';
import { nextDisplayOrder } from '@/features/visitpad/lib/next-display-order';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadDiagnoses,
  useVisitpadDiagnosesGlobalLibrary,
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
import { VISITPAD_DIAGNOSIS_CATEGORIES } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadDiagnosis } from '@/features/visitpad/types';
import {
  visitpadDiagnosisCreateFormSchema,
  visitpadDiagnosisEditFormSchema,
  type VisitpadDiagnosisCreateFormSchema,
  type VisitpadDiagnosisEditFormSchema,
} from '@/features/visitpad/validation';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const DX_BASE = '/api/v1/master-data/visitpad/diagnoses';

export const Route = createFileRoute('/_authenticated/visitpad/diagnoses')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/diagnoses'),
  component: VisitpadDiagnosesPage,
});

function VisitpadDiagnosesPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-diagnoses');
  const { canUpdate, canMutate } = useCatalogModuleCrud(catalogModuleSlug);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
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
  const [editing, setEditing] = useState<VisitpadDiagnosis | null>(null);
  const cat = category === 'all' ? undefined : category;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadDiagnoses(search || undefined, cat, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadDiagnosesGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(DX_BASE);
  const create = useVisitpadPost(DX_BASE);
  const platformImport = useVisitpadPlatformImport('/diagnoses/import-from-platform');
  const { data: tenantCodeKeys, isLoading: tenantCodeKeysLoading } = useVisitpadTenantImportKeys(
    '/diagnoses',
    importOpen && tenantCatalog,
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantCodeKeys ?? new Set<string>(), [tenantCodeKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadDiagnosis) => r.code, []);

  const importSearchParts = useCallback(
    (r: VisitpadDiagnosis) => [r.code, r.display_name, r.short_name ?? '', r.snomed_code ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Display name', cell: (r: VisitpadDiagnosis) => r.display_name },
      {
        id: 'snomed',
        header: 'SNOMED',
        cell: (r: VisitpadDiagnosis) => r.snomed_code ?? '—',
      },
    ],
    [],
  );

  const activeToggle = useCatalogActiveToggleConfirm({
    disabled: patch.isPending || !canUpdate,
    onConfirm: async (id, next) => {
      try {
        await patch.mutateAsync({ id, body: { is_active: next } });
        toast.success(next ? 'Diagnosis enabled' : 'Diagnosis disabled');
      } catch (e) {
        toast.error(mutationErrorMessage(e));
      }
    },
  });

  const runDiagnosisImport = async (selection: VisitpadDiagnosis[]) => {
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

  const columns = useMemo<ColumnDef<VisitpadDiagnosis, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Display name', meta: { label: 'Display name' } },
      {
        accessorKey: 'short_name',
        header: 'Short name',
        meta: { label: 'Short name' },
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'snomed_code',
        header: 'SNOMED',
        meta: { label: 'SNOMED' },
        cell: ({ getValue }) => {
          const v = getValue<string | null | undefined>();
          return v ? <span className="font-mono text-xs">{v}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: 'icd',
        header: 'ICD',
        meta: { label: 'ICD' },
        cell: ({ row }) => {
          const c = row.original.icd10_code;
          return c ? <span className="font-mono text-xs">{c}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'is_chronic_flag',
        header: 'Chronic prompt',
        meta: { label: 'Chronic prompt' },
        cell: ({ getValue }) => (getValue<boolean>() ? <Badge variant="secondary">Yes</Badge> : '—'),
      },
      {
        accessorKey: 'is_notifiable',
        header: 'Notifiable',
        meta: { label: 'Notifiable' },
        cell: ({ getValue }) => (getValue<boolean>() ? <Badge variant="destructive">Yes</Badge> : '—'),
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
      visitpadActionsColumn<VisitpadDiagnosis>({
        onEdit: setEditing,
        disabled: busy,
        canEdit: canUpdate,
      }),
    ],
    [activeToggle, busy, canUpdate],
  );

  return (
    <VisitpadPageShell
      primary="diagnoses"
      tabCount={tabCount}
      title="Diagnosis"
      description={
        tenantCatalog
          ? 'Tenant diagnosis catalog: import from the platform library or add local-only codes.'
          : 'Platform diagnosis codes, display names, SNOMED, and chronic / notifiable flags.'
      }
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel="Add diagnosis"
          onAddClick={() => setCreateOpen(true)}
          onImportFromLibrary={tenantCatalog ? () => setImportOpen(true) : undefined}
          importFromLibraryPending={platformImport.isPending}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <MasterDataTableToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search code, display name, short name, SNOMED…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_DIAGNOSIS_CATEGORIES.map((c) => (
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
            emptyTitle="No diagnoses found"
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

      <ImportFromPlatformCatalogDialog<VisitpadDiagnosis>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import diagnoses from platform library"
        description="Select diagnoses to add to your tenant catalog. Already-imported codes are disabled."
        searchPlaceholder="Search code, display name, SNOMED…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        importedKeysLoading={tenantCodeKeysLoading}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runDiagnosisImport}
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

      <DiagnosisCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nextOrder={nextDisplayOrder(rows)}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Diagnosis created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <DiagnosisEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Diagnosis updated');
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

function DiagnosisCreateDialog({
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
  const form = useForm<VisitpadDiagnosisCreateFormSchema>({
    resolver: zodResolver(visitpadDiagnosisCreateFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      short_name: '',
      snomed_code: null,
      is_chronic_flag: false,
      is_notifiable: false,
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
        snomed_code: null,
        is_chronic_flag: false,
        is_notifiable: false,
        display_order: nextOrder,
        is_active: true,
      });
    }
  }, [open, nextOrder, form]);

  const submit: SubmitHandler<VisitpadDiagnosisCreateFormSchema> = async (v) => {
    await onSubmit({
      code: v.code.trim(),
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      is_chronic_flag: v.is_chronic_flag,
      is_notifiable: v.is_notifiable,
      display_order: v.display_order,
      is_active: v.is_active,
      snomed_code: v.snomed_code?.trim() ? v.snomed_code.trim() : null,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add diagnosis"
      description="Stable diagnosis code (immutable after save), display name, optional short label and SNOMED."
      submitLabel="Add diagnosis"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="vp-dx-code">Diagnosis code</RequiredLabel>
          <Input
            id="vp-dx-code"
            maxLength={9}
            autoComplete="off"
            placeholder="e.g. htn_dx"
            {...form.register('code')}
          />
          <p className="text-xs text-muted-foreground">{VISITPAD_CODE_HELPER_TEXT}</p>
          {form.formState.errors.code ? (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="vp-dx-order">Display order</RequiredLabel>
          <Input id="vp-dx-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="vp-dx-disp">Display name</RequiredLabel>
          <Input id="vp-dx-disp" maxLength={512} placeholder="Friendly name for staff" {...form.register('display_name')} />
          {form.formState.errors.display_name ? (
            <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-short">Short name</Label>
          <Input id="vp-dx-short" maxLength={120} placeholder="e.g. fvr" {...form.register('short_name')} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-dx-snomed">SNOMED CT (clinical finding)</Label>
          <Input
            id="vp-dx-snomed"
            maxLength={64}
            placeholder="Concept ID or text"
            {...form.register('snomed_code')}
          />
        </div>
        <div className="sm:col-span-2">
          <FormToggleRow
            id="vp-dx-chr"
            label="Chronic illness prompt"
            description="When selected in a visit, doctors can be prompted to add this to chronic illness history."
            checked={!!form.watch('is_chronic_flag')}
            onCheckedChange={(c) => form.setValue('is_chronic_flag', c)}
          />
        </div>
        <div className="sm:col-span-2">
          <FormToggleRow
            id="vp-dx-not"
            label="Notifiable condition"
            description="Marks diagnoses that may require public health notification workflows."
            checked={!!form.watch('is_notifiable')}
            onCheckedChange={(c) => form.setValue('is_notifiable', c)}
          />
        </div>
        <div className="sm:col-span-2">
          <CatalogActiveSwitch
            id="vp-dx-act"
            checked={!!form.watch('is_active')}
            onCheckedChange={(c) => form.setValue('is_active', c)}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function DiagnosisEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadDiagnosis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadDiagnosisEditFormSchema>({
    resolver: zodResolver(visitpadDiagnosisEditFormSchema),
    defaultValues: {
      display_name: '',
      short_name: null,
      is_chronic_flag: false,
      is_notifiable: false,
      snomed_code: null,
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        display_name: row.display_name,
        short_name: row.short_name ?? null,
        is_chronic_flag: !!row.is_chronic_flag,
        is_notifiable: !!row.is_notifiable,
        snomed_code: row.snomed_code ?? null,
        display_order: row.display_order,
        is_active: row.is_active,
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadDiagnosisEditFormSchema> = async (v) => {
    await onSave({
      display_name: v.display_name.trim(),
      short_name: v.short_name?.trim() ? v.short_name.trim() : null,
      is_chronic_flag: v.is_chronic_flag,
      is_notifiable: v.is_notifiable,
      snomed_code: v.snomed_code?.trim() ? v.snomed_code.trim() : null,
      display_order: v.display_order,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit diagnosis — ${row.code}` : 'Edit diagnosis'}
      description="Diagnosis code cannot be changed."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Diagnosis code</Label>
            <Input value={row.code} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredLabel htmlFor="vp-de-disp">Display name</RequiredLabel>
            <Input id="vp-de-disp" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-short">Short name</Label>
            <Input id="vp-de-short" maxLength={120} placeholder="e.g. fvr" {...form.register('short_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-de-snomed">SNOMED CT (clinical finding)</Label>
            <Input id="vp-de-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="vp-de-order">Display order</RequiredLabel>
            <Input id="vp-de-order" type="number" {...form.register('display_order', { valueAsNumber: true })} />
          </div>
          <div className="sm:col-span-2">
            <FormToggleRow
              id="vp-de-chr"
              label="Chronic illness prompt"
              description="When selected in a visit, doctors can be prompted to add this to chronic illness history."
              checked={!!form.watch('is_chronic_flag')}
              onCheckedChange={(c) => form.setValue('is_chronic_flag', c)}
            />
          </div>
          <div className="sm:col-span-2">
            <FormToggleRow
              id="vp-de-not"
              label="Notifiable condition"
              description="Marks diagnoses that may require public health notification workflows."
              checked={!!form.watch('is_notifiable')}
              onCheckedChange={(c) => form.setValue('is_notifiable', c)}
            />
          </div>
          <div className="sm:col-span-2">
            <CatalogActiveSwitch
              id="vp-de-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
