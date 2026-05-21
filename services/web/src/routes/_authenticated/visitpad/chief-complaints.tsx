import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pulse/ui/select';
import { Switch } from '@pulse/ui/switch';
import { Textarea } from '@pulse/ui/textarea';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import {
  useVisitpadChiefComplaintDescriptor,
  useVisitpadChiefComplaints,
  useVisitpadChiefComplaintsGlobalLibrary,
  useVisitpadDelete,
  useVisitpadPatch,
  useVisitpadPlatformImport,
  useVisitpadPost,
  useVisitpadTenantImportKeys,
  VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
  VISITPAD_CATALOG_PAGE_SIZES,
} from '@/features/visitpad/api';
import { visitpadActionsColumn } from '@/features/visitpad/components/visitpad-actions-column';
import { ImportFromPlatformCatalogDialog } from '@/features/visitpad/components/import-from-platform-catalog-dialog';
import { VisitpadHeaderActions } from '@/features/visitpad/components/visitpad-header-actions';
import { VisitpadPageShell } from '@/features/visitpad/components/visitpad-page-shell';
import { VisitpadSnomedFooter } from '@/features/visitpad/components/visitpad-snomed-footer';
import {
  VISITPAD_BODY_SYSTEMS,
  VISITPAD_TRIAGE_PRIORITIES,
} from '@/features/visitpad/openapi-constants';
import { visitpadActiveTotal } from '@/features/visitpad/tab-count';
import type { VisitpadChiefComplaint } from '@/features/visitpad/types';
import {
  visitpadChiefComplaintCreateFormSchema,
  visitpadChiefComplaintEditFormSchema,
  type VisitpadChiefComplaintCreateFormSchema,
  type VisitpadChiefComplaintEditFormSchema,
} from '@/features/visitpad/validation';
import { useCapability } from '@/hooks/use-capability';
import { catalogModuleSlugForVisitpadManifestNode } from '@/features/visitpad/lib/visitpad-access';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireVisitpadLeafRouteAccess } from '@/lib/visitpad-route-access';
import { useVisitpadImportLibrarySearch } from '@/features/visitpad/hooks/use-visitpad-import-library-search';
import { useVisitpadTenantCatalog } from '@/features/visitpad/hooks/use-visitpad-tenant-catalog';

const CC_BASE = '/api/v1/master-data/visitpad/chief-complaints';

export const Route = createFileRoute('/_authenticated/visitpad/chief-complaints')({
  beforeLoad: requireVisitpadLeafRouteAccess('/visitpad/chief-complaints'),
  component: VisitpadChiefComplaintsPage,
});

function VisitpadChiefComplaintsPage() {
  const catalogModuleSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-chief-complaints');
  const { canUpdate, canDelete, canMutate } = useCatalogModuleCrud(catalogModuleSlug);
  const [search, setSearch] = useState('');
  const [bodySystem, setBodySystem] = useState<string>('all');
  const [triage, setTriage] = useState<string>('all');
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
  const [editing, setEditing] = useState<VisitpadChiefComplaint | null>(null);
  const [deleting, setDeleting] = useState<VisitpadChiefComplaint | null>(null);
  const { tenantCatalog } = useVisitpadTenantCatalog();
  const bs = bodySystem === 'all' ? undefined : bodySystem;
  const tr = triage === 'all' ? undefined : triage;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [search]);
  const { data, isLoading, error } = useVisitpadChiefComplaints(search || undefined, bs, tr, listPage);
  const { data: globalLib, isLoading: globalLibLoading } = useVisitpadChiefComplaintsGlobalLibrary(
    importOpen,
    {
      pageIndex: libPageIndex,
      pageSize: libPageSize,
    },
    librarySearch || undefined,
  );
  const patch = useVisitpadPatch(CC_BASE);
  const del = useVisitpadDelete(CC_BASE);
  const create = useVisitpadPost(CC_BASE);
  const platformImport = useVisitpadPlatformImport('/chief-complaints/import-from-platform');
  const { data: tenantCodeKeys } = useVisitpadTenantImportKeys('/chief-complaints', importOpen && tenantCatalog);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCount = visitpadActiveTotal(rows, total);
  const busy = patch.isPending || del.isPending || platformImport.isPending;

  const importedKeys = useMemo(() => tenantCodeKeys ?? new Set<string>(), [tenantCodeKeys]);
  const globalRows = globalLib?.data ?? [];
  const globalLibTotal = globalLib?.total ?? 0;

  const importSearchParts = useCallback(
    (r: VisitpadChiefComplaint) => [
      r.code,
      r.display_name,
      r.short_name ?? '',
      r.body_system,
      r.triage_priority,
    ],
    [],
  );

  const getRowKey = useCallback((r: VisitpadChiefComplaint) => r.code, []);

  const importColumns = useMemo(
    () => [
      {
        id: 'display',
        header: 'Name',
        cell: (r: VisitpadChiefComplaint) => r.display_name,
      },
      {
        id: 'body',
        header: 'Body system',
        cell: (r: VisitpadChiefComplaint) => r.body_system,
      },
      {
        id: 'triage',
        header: 'Triage',
        cell: (r: VisitpadChiefComplaint) => r.triage_priority,
      },
    ],
    [],
  );

  const runChiefComplaintImport = async (selection: VisitpadChiefComplaint[]) => {
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

  const { data: ccDescriptor } = useVisitpadChiefComplaintDescriptor();
  const bodySystemOpts = useMemo(
    () =>
      ccDescriptor?.body_systems?.length ? ccDescriptor.body_systems : [...VISITPAD_BODY_SYSTEMS],
    [ccDescriptor?.body_systems],
  );
  const triageOpts = useMemo(
    () =>
      ccDescriptor?.triage_priorities?.length
        ? ccDescriptor.triage_priorities
        : [...VISITPAD_TRIAGE_PRIORITIES],
    [ccDescriptor?.triage_priorities],
  );

  const columns = useMemo<ColumnDef<VisitpadChiefComplaint, unknown>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'display_name', header: 'Display', meta: { label: 'Display' } },
      {
        accessorKey: 'short_name',
        header: 'Short',
        meta: { label: 'Short' },
        cell: ({ getValue }) => {
          const v = getValue<string | null | undefined>();
          return v ? (
            <span className="text-xs">{v}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: 'body_system',
        header: 'System',
        meta: { label: 'System' },
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'triage_priority',
        header: 'Triage',
        meta: { label: 'Triage' },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'snomed_code',
        header: 'SNOMED',
        meta: { label: 'SNOMED' },
        cell: ({ getValue }) => {
          const v = getValue<string | null | undefined>();
          return v ? (
            <span className="font-mono text-xs">{v}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'synonyms',
        header: 'Synonyms',
        meta: { label: 'Synonyms' },
        cell: ({ row }) => {
          const s = row.original.synonyms;
          if (!s?.length) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs text-muted-foreground">
              {s.slice(0, 3).join(', ')}
              {s.length > 3 ? '…' : ''}
            </span>
          );
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Enabled',
        meta: { label: 'Enabled' },
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={patch.isPending || !canUpdate}
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
      visitpadActionsColumn<VisitpadChiefComplaint>({
        onEdit: setEditing,
        onDelete: setDeleting,
        disabled: busy,
        canEdit: canUpdate,
        canDelete,
      }),
    ],
    [patch, busy, canUpdate, canDelete],
  );

  return (
    <VisitpadPageShell
      primary="chief-complaints"
      tabCount={tabCount}
      title="Chief complaints"
      description={
        tenantCatalog
          ? 'Tenant catalog: import from the platform library or add local-only rows. Descriptor enums still load from GET …/chief-complaints/descriptor.'
          : 'Complaint catalog for triage. Body system and triage options load from GET …/chief-complaints/descriptor (same enum values as create/patch).'
      }
      actions={
        <VisitpadHeaderActions
          catalogModuleSlug={catalogModuleSlug}
          addLabel={tenantCatalog ? 'Add local complaint' : 'Add complaint'}
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
              placeholder="Search by name or synonym…"
            />
            <Select value={bodySystem} onValueChange={setBodySystem}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="All systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All systems</SelectItem>
                {bodySystemOpts.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={triage} onValueChange={setTriage}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="All triage priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All triage priorities</SelectItem>
                {triageOpts.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
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
            emptyTitle="No chief complaints found"
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

      <ChiefComplaintCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        bodySystemOpts={bodySystemOpts}
        triageOpts={triageOpts}
        isSubmitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            await create.mutateAsync(payload);
            toast.success('Chief complaint created');
            setCreateOpen(false);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ImportFromPlatformCatalogDialog<VisitpadChiefComplaint>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import chief complaints from platform library"
        description="Select complaints to add to your tenant catalog. Already-imported rows are disabled."
        searchPlaceholder="Search by code, display name, body system…"
        rows={globalRows}
        isLoading={globalLibLoading}
        getRowKey={getRowKey}
        importedKeys={importedKeys}
        columns={importColumns}
        searchParts={importSearchParts}
        isSubmitting={platformImport.isPending || create.isPending}
        onImportRows={runChiefComplaintImport}
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

      <ChiefComplaintEditDialog
        row={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        bodySystemOpts={bodySystemOpts}
        triageOpts={triageOpts}
        isSubmitting={patch.isPending}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await patch.mutateAsync({ id: editing.id, body });
            toast.success('Chief complaint updated');
            setEditing(null);
          } catch (e) {
            toast.error(mutationErrorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete chief complaint"
        description={`Soft-delete “${deleting?.display_name ?? deleting?.code ?? ''}”?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          void (async () => {
            try {
              await del.mutateAsync(deleting.id);
              toast.success('Chief complaint deleted');
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

function ChiefComplaintCreateDialog({
  open,
  onOpenChange,
  bodySystemOpts,
  triageOpts,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodySystemOpts: { value: string; label: string }[];
  triageOpts: { value: string; label: string }[];
  isSubmitting: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadChiefComplaintCreateFormSchema>({
    resolver: zodResolver(visitpadChiefComplaintCreateFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      short_name: '',
      body_system: 'cardiovascular',
      triage_priority: 'routine',
      synonyms_text: '',
      is_paediatric_relevant: false,
      display_order: 0,
      is_active: true,
      snomed_code: null,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        code: '',
        display_name: '',
        short_name: '',
        body_system: 'cardiovascular',
        triage_priority: 'routine',
        synonyms_text: '',
        is_paediatric_relevant: false,
        display_order: 0,
        is_active: true,
        snomed_code: null,
      });
    }
  }, [open, form]);

  const submit: SubmitHandler<VisitpadChiefComplaintCreateFormSchema> = async (v) => {
    const synonyms = (v.synonyms_text ?? '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    const snomed = v.snomed_code?.trim();
    const short = v.short_name?.trim();
    await onSubmit({
      code: v.code.trim(),
      display_name: v.display_name.trim(),
      short_name: short && short.length > 0 ? short : null,
      body_system: v.body_system,
      triage_priority: v.triage_priority,
      synonyms,
      is_paediatric_relevant: v.is_paediatric_relevant,
      display_order: v.display_order,
      is_active: v.is_active,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add chief complaint"
      description="Codes and enums must match the API. Body system and triage labels load from the descriptor endpoint (fallback: local OpenAPI mirror if offline)."
      submitLabel="Add complaint"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vp-cc-code">Complaint code *</Label>
          <Input id="vp-cc-code" maxLength={64} {...form.register('code')} />
          <p className="text-muted-foreground text-xs">
            Unique, immutable after save (max 64 characters).
          </p>
          {form.formState.errors.code ? (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-cc-name">Display name *</Label>
          <Input id="vp-cc-name" maxLength={256} {...form.register('display_name')} />
          {form.formState.errors.display_name ? (
            <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-cc-short">Short name</Label>
          <Input
            id="vp-cc-short"
            maxLength={120}
            placeholder="e.g. CP"
            {...form.register('short_name')}
          />
          <p className="text-muted-foreground text-xs">
            Optional short label for lists (max 120 characters). Search uses code, display name, and
            short name.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vp-cc-order">Display order</Label>
          <Input
            id="vp-cc-order"
            type="number"
            {...form.register('display_order', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>Body system *</Label>
          <Select
            value={form.watch('body_system')}
            onValueChange={(x) =>
              form.setValue(
                'body_system',
                x as VisitpadChiefComplaintCreateFormSchema['body_system'],
                {
                  shouldValidate: true,
                },
              )
            }
          >
            <SelectTrigger id="vp-cc-bs">
              <SelectValue placeholder="Select system…" />
            </SelectTrigger>
            <SelectContent>
              {bodySystemOpts.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Triage priority *</Label>
          <Select
            value={form.watch('triage_priority')}
            onValueChange={(x) =>
              form.setValue(
                'triage_priority',
                x as VisitpadChiefComplaintCreateFormSchema['triage_priority'],
                {
                  shouldValidate: true,
                },
              )
            }
          >
            <SelectTrigger id="vp-cc-tr">
              <SelectValue placeholder="Select triage…" />
            </SelectTrigger>
            <SelectContent>
              {triageOpts.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-cc-snomed">SNOMED CT (clinical finding)</Label>
          <Input
            id="vp-cc-snomed"
            maxLength={64}
            placeholder="Concept ID or text"
            {...form.register('snomed_code')}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vp-cc-syn">Synonyms</Label>
          <Textarea
            id="vp-cc-syn"
            rows={3}
            className="text-sm"
            placeholder="Comma or newline separated (e.g. chest tightness, angina)"
            {...form.register('synonyms_text')}
          />
          <p className="text-muted-foreground text-xs">
            Stored as an array on the API (max 50 terms).
          </p>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <div>
            <Label htmlFor="vp-cc-paed">Paediatric relevant</Label>
            <p className="text-muted-foreground text-xs">Show in paediatric triage flows.</p>
          </div>
          <Switch
            id="vp-cc-paed"
            checked={!!form.watch('is_paediatric_relevant')}
            onCheckedChange={(c) => form.setValue('is_paediatric_relevant', c)}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <div>
            <Label htmlFor="vp-cc-act">Active</Label>
            <p className="text-muted-foreground text-xs">
              Inactive items are hidden from triage pickers.
            </p>
          </div>
          <Switch
            id="vp-cc-act"
            checked={!!form.watch('is_active')}
            onCheckedChange={(c) => form.setValue('is_active', c)}
          />
        </div>
      </div>
    </EntityFormDialog>
  );
}

function ChiefComplaintEditDialog({
  row,
  open,
  onOpenChange,
  bodySystemOpts,
  triageOpts,
  isSubmitting,
  onSave,
}: {
  row: VisitpadChiefComplaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodySystemOpts: { value: string; label: string }[];
  triageOpts: { value: string; label: string }[];
  isSubmitting: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<VisitpadChiefComplaintEditFormSchema>({
    resolver: zodResolver(visitpadChiefComplaintEditFormSchema),
    defaultValues: {
      code: '',
      display_name: '',
      short_name: '',
      body_system: 'cardiovascular',
      triage_priority: 'routine',
      snomed_code: null,
      is_paediatric_relevant: false,
      display_order: 0,
      is_active: true,
      synonyms_text: '',
    },
  });

  useEffect(() => {
    if (open && row) {
      form.reset({
        code: row.code,
        display_name: row.display_name,
        short_name: row.short_name ?? '',
        body_system: row.body_system as VisitpadChiefComplaintEditFormSchema['body_system'],
        triage_priority:
          row.triage_priority as VisitpadChiefComplaintEditFormSchema['triage_priority'],
        snomed_code: row.snomed_code ?? null,
        is_paediatric_relevant: !!row.is_paediatric_relevant,
        display_order: row.display_order,
        is_active: row.is_active,
        synonyms_text: (row.synonyms ?? []).join('\n'),
      });
    }
  }, [open, row, form]);

  const submit: SubmitHandler<VisitpadChiefComplaintEditFormSchema> = async (v) => {
    const snomed = v.snomed_code?.trim();
    const short = v.short_name?.trim();
    const synonyms = (v.synonyms_text ?? '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    await onSave({
      code: v.code,
      display_name: v.display_name,
      short_name: short && short.length > 0 ? short : null,
      body_system: v.body_system,
      triage_priority: v.triage_priority,
      snomed_code: snomed && snomed.length > 0 ? snomed : null,
      is_paediatric_relevant: v.is_paediatric_relevant,
      display_order: v.display_order,
      is_active: v.is_active,
      synonyms,
    });
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit chief complaint — ${row.code}` : 'Edit chief complaint'}
      description="Update catalog fields. Synonyms: one per line or comma-separated."
      submitLabel="Save changes"
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(submit)}
    >
      {row ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vp-ce-code">Code</Label>
            <Input id="vp-ce-code" maxLength={64} {...form.register('code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-name">Display name</Label>
            <Input id="vp-ce-name" maxLength={256} {...form.register('display_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-short">Short name</Label>
            <Input id="vp-ce-short" maxLength={120} {...form.register('short_name')} />
          </div>
          <div className="space-y-2">
            <Label>Body system</Label>
            <Select
              value={form.watch('body_system')}
              onValueChange={(x) =>
                form.setValue(
                  'body_system',
                  x as VisitpadChiefComplaintEditFormSchema['body_system'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bodySystemOpts.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Triage priority</Label>
            <Select
              value={form.watch('triage_priority')}
              onValueChange={(x) =>
                form.setValue(
                  'triage_priority',
                  x as VisitpadChiefComplaintEditFormSchema['triage_priority'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triageOpts.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-snomed">SNOMED CT (clinical finding)</Label>
            <Input id="vp-ce-snomed" maxLength={64} {...form.register('snomed_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-syn">Synonyms (one per line or comma-separated)</Label>
            <Textarea
              id="vp-ce-syn"
              rows={4}
              className="font-mono text-sm"
              {...form.register('synonyms_text')}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vp-ce-order">Display order</Label>
            <Input
              id="vp-ce-order"
              type="number"
              {...form.register('display_order', { valueAsNumber: true })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-ce-paed">Paediatric relevant</Label>
            <Switch
              id="vp-ce-paed"
              checked={!!form.watch('is_paediatric_relevant')}
              onCheckedChange={(c) => form.setValue('is_paediatric_relevant', c)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="vp-ce-act">Active</Label>
            <Switch
              id="vp-ce-act"
              checked={!!form.watch('is_active')}
              onCheckedChange={(c) => form.setValue('is_active', c)}
            />
          </div>
        </div>
      ) : null}
    </EntityFormDialog>
  );
}
