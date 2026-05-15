import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
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
import {
  useVisitpadChronicIllnesses,
  useVisitpadChronicIllnessesGlobalLibrary,
  useVisitpadDelete,
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
import { VISITPAD_CHRONIC_ILLNESS_CATEGORIES } from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadChronicIllness } from '@/features/visitpad/types';
import {
  visitpadChronicIllnessCreateFormSchema,
  visitpadChronicIllnessEditFormSchema,
  type VisitpadChronicIllnessCreateFormInput,
  type VisitpadChronicIllnessCreateFormSchema,
  type VisitpadChronicIllnessEditFormInput,
  type VisitpadChronicIllnessEditFormSchema,
} from '@/features/visitpad/validation';
import { useVisitpadCatalogPermission } from '@/features/visitpad/hooks/use-visitpad-catalog-permission';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const CI_BASE = '/api/v1/master-data/visitpad/chronic-illnesses';

const CHRONIC_CATEGORY_VALUES = new Set(
  VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map((c) => c.value),
);

function emptyChronicIllnessCreateForm(): VisitpadChronicIllnessCreateFormInput {
  return {
    icd10_code: '',
    display_name: '',
    category: 'cardiovascular',
    snomed_code: null,
    chronic_illness_prompt: false,
    is_active: true,
  };
}

function chronicIllnessEditDefaults(row: VisitpadChronicIllness): VisitpadChronicIllnessEditFormInput {
  const cat = CHRONIC_CATEGORY_VALUES.has(row.category)
    ? (row.category as VisitpadChronicIllnessEditFormInput['category'])
    : 'other';
  return {
    display_name: row.display_name,
    category: cat,
    snomed_code: row.snomed_code ?? null,
    chronic_illness_prompt: row.chronic_illness_prompt ?? false,
    is_active: row.is_active,
  };
}

export const Route = createFileRoute('/_authenticated/visitpad/chronic-illness')({
  component: VisitpadChronicIllnessPage,
});

function VisitpadChronicIllnessPage() {
  const { canWrite, canRead } = useVisitpadCatalogPermission();
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
  const [editing, setEditing] = useState<VisitpadChronicIllness | null>(null);
  const [deleting, setDeleting] = useState<VisitpadChronicIllness | null>(null);
  const cat = category === 'all' ? undefined : category;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadChronicIllnesses(search || undefined, cat, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadChronicIllnessesGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(CI_BASE);
  const del = useVisitpadDelete(CI_BASE);
  const create = useVisitpadPost(CI_BASE);
  const platformImport = useVisitpadPlatformImport('/chronic-illnesses/import-from-platform');
  const { data: tenantIcdKeys } = useVisitpadTenantImportKeys('/chronic-illnesses', importOpen && tenantCatalog);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantIcdKeys ?? new Set<string>(), [tenantIcdKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;
  const getRowKey = useCallback((r: VisitpadChronicIllness) => r.icd10_code, []);

  const importSearchParts = useCallback(
    (r: VisitpadChronicIllness) => [r.icd10_code, r.display_name, r.category, r.snomed_code ?? ''],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: 'name', header: 'Display name', cell: (r: VisitpadChronicIllness) => r.display_name },
      { id: 'cat', header: 'Category', cell: (r: VisitpadChronicIllness) => r.category },
    ],
    [],
  );

  const runChronicIllnessImport = async (selection: VisitpadChronicIllness[]) => {
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

  const columns = useMemo<ColumnDef<VisitpadChronicIllness, unknown>[]>(
    () => [
      { accessorKey: 'icd10_code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Display name', meta: { label: 'Display name' } },
      {
        accessorKey: 'category',
        header: 'Category',
        meta: { label: 'Category' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
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
      visitpadActionsColumn<VisitpadChronicIllness>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy || !canWrite,
      }),
    ],
    [patch, busy, canWrite],
  );

  return (
    <VisitpadPageShell
      primary="chronic-illness"
      tabCount={tabCount}
      title="Chronic illness"
      description={
        tenantCatalog
          ? 'Tenant chronic-condition list: import from the platform library or add local-only rows.'
          : 'Platform chronic condition reference list.'
      }
      actions={
        <VisitpadHeaderActions
          canWrite={canWrite}
          canRead={canRead}
          addLabel={tenantCatalog ? 'Add local chronic illness' : 'Add chronic illness'}
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
              placeholder="Search code, name, category…"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map((c) => (
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
            emptyTitle="No chronic illnesses found"
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

      <ImportFromPlatformCatalogDialog<VisitpadChronicIllness>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import chronic illnesses from platform library"
        description="Select rows to add to your tenant catalog. Already-imported ICD-10 codes are disabled."
        searchPlaceholder="Search ICD-10, name, category…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        rowKeyHeader="ICD-10"
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runChronicIllnessImport}
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

      <ChronicIllnessCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Chronic illness created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ChronicIllnessEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Chronic illness updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete chronic illness"
        description={`Soft-delete ${deleting?.icd10_code ?? ''} — ${deleting?.display_name ?? ''}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Chronic illness deleted');
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

function ChronicIllnessCreateDialog({
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
  const form = useForm<VisitpadChronicIllnessCreateFormInput>({
    resolver: zodResolver(visitpadChronicIllnessCreateFormSchema),
    defaultValues: emptyChronicIllnessCreateForm(),
  });

  useEffect(() => {
    if (open) {
      form.reset(emptyChronicIllnessCreateForm());
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadChronicIllnessCreateFormSchema> = async (v) => {
    const sn = v.snomed_code?.trim();
    await onSubmit({
      icd10_code: v.icd10_code,
      display_name: v.display_name,
      category: v.category,
      snomed_code: sn && sn.length > 0 ? sn : null,
      chronic_illness_prompt: v.chronic_illness_prompt,
      display_order: 0,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add chronic illness"
      description="Fields match the Visitpad chronic-illness API (snake_case). Use a short catalog code (stored as icd10_code)."
      submitLabel="Add"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ci-code">Chronic illness code *</Label>
          <Input
            id="vp-ci-code"
            placeholder="e.g. dm2"
            maxLength={8}
            className="font-mono"
            {...form.register('icd10_code')}
          />
          <p className="text-sm text-muted-foreground">
            Code must be 3–8 characters, letters, digits, or underscores; unique; cannot be edited after save.
          </p>
          {form.formState.errors.icd10_code ? (
            <p className="text-sm text-destructive">{form.formState.errors.icd10_code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-ci-name">Display name *</Label>
          <Input
            id="vp-ci-name"
            placeholder="Clinical label"
            maxLength={512}
            {...form.register('display_name')}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Category *</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map((c) => (
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
          <Label htmlFor="vp-ci-snomed">SNOMED CT (clinical finding)</Label>
          <Input
            id="vp-ci-snomed"
            maxLength={64}
            placeholder="Concept ID or code"
            {...form.register('snomed_code')}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="vp-ci-prompt">Chronic illness prompt</Label>
            <Controller
              control={form.control}
              name="chronic_illness_prompt"
              render={({ field }) => (
                <Switch id="vp-ci-prompt" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            When enabled, visit workflows may surface a chronic follow-up prompt for this entry.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="vp-ci-act">Active</Label>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Switch id="vp-ci-act" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <p className="text-sm text-muted-foreground">Inactive entries are hidden from tenant record lists.</p>
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ChronicIllnessEditDialog({
  row,
  open,
  onOpenChange,
  isSubmitting,
  onSave,
}: {
  row: VisitpadChronicIllness | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadChronicIllnessEditFormInput>({
    resolver: zodResolver(visitpadChronicIllnessEditFormSchema),
    defaultValues: {
      display_name: '',
      category: 'other',
      snomed_code: null,
      chronic_illness_prompt: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset(chronicIllnessEditDefaults(row));
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadChronicIllnessEditFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    await onSave({
      display_name: v.display_name,
      category: v.category,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      chronic_illness_prompt: v.chronic_illness_prompt,
      is_active: v.is_active,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit chronic illness — ${row.icd10_code}` : 'Edit chronic illness'}
      description="Catalog code cannot be changed. Update display name, category, SNOMED, or prompts."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-cie-code-ro">Chronic illness code</Label>
            <Input id="vp-cie-code-ro" value={row.icd10_code} readOnly className="bg-muted font-mono text-sm" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-cie-name">Display name *</Label>
            <Input id="vp-cie-name" maxLength={512} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Category *</Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map((c) => (
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
            <Label htmlFor="vp-cie-snomed">SNOMED CT (clinical finding)</Label>
            <Input id="vp-cie-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="vp-cie-prompt">Chronic illness prompt</Label>
              <Controller
                control={form.control}
                name="chronic_illness_prompt"
                render={({ field }) => (
                  <Switch id="vp-cie-prompt" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, visit workflows may surface a chronic follow-up prompt for this entry.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="vp-cie-act">Active</Label>
              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <Switch id="vp-cie-act" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">Inactive entries are hidden from tenant record lists.</p>
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
